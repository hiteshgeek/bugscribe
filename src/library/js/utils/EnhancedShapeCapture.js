// EnhancedShapeCapture.js - Improved screenshot capture with modern toolbar

import ScreenshotToolbar from "./ScreenshotToolbar.js";
import FreeformCapture from "./FreeformCapture.js";

export default class EnhancedShapeCapture {
  constructor(utils) {
    this.utils = utils;
    this.toolbar = null;
    this.currentShape = EnhancedShapeCapture.lastUsedShape || "rectangle";
    this.isCtrlPressed = false;
    this.isMoving = false;
    this.capturedImage = null;
    this.moveOffsetX = 0;
    this.moveOffsetY = 0;
  }

  async capture() {
    return new Promise(async (resolve) => {
      // Start with last used shape or rectangle
      this.currentShape = EnhancedShapeCapture.lastUsedShape || "rectangle";

      let startX, startY, endX, endY;
      let isSelecting = false;
      let rafId = null;
      let selectionComplete = false;

      // Create toolbar FIRST (before backdrop) so it appears above overlay
      this.toolbar = new ScreenshotToolbar(
        (shape) => this.handleShapeChange(shape, resolve),
        () => this.handleAccept(resolve),
        () => this.handleCancel(resolve),
        () => {
          // Close handler - completely close the capture
          cleanup();
          resolve(false);
        }
      );
      this.toolbar.create();
      this.toolbar.setShape(this.currentShape);

      const backdrop = document.createElement("div");
      backdrop.className = "mc-backdrop";
      document.body.appendChild(backdrop);
      this.backdrop = backdrop; // Store early for shape switching

      const selectionBox = document.createElement("div");
      selectionBox.className = "mc-selection-box";
      document.body.appendChild(selectionBox);
      this.selectionBox = selectionBox; // Store early for shape switching

      // Create dimensions display
      const dimensionsEl = document.createElement("div");
      dimensionsEl.className = "mc-selection-dimensions";
      dimensionsEl.style.display = "none";
      document.body.appendChild(dimensionsEl);

      document.body.classList.add("mc-selecting");

      const getEffectiveShape = () => {
        if (this.isCtrlPressed) {
          return this.currentShape === "rectangle"
            ? "square"
            : this.currentShape === "ellipse"
            ? "circle"
            : this.currentShape;
        }
        return this.currentShape;
      };

      const updateSelection = () => {
        const effectiveShape = getEffectiveShape();
        const maintainSquare =
          effectiveShape === "square" || effectiveShape === "circle";
        const rect = this.utils.adjustRectForAspectRatio(
          startX,
          startY,
          endX,
          endY,
          maintainSquare
        );

        Object.assign(selectionBox.style, {
          left: `${rect.left}px`,
          top: `${rect.top}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
        });

        const clipPathValue = this._generateClipPath(effectiveShape, rect);
        backdrop.style.clipPath = clipPathValue;

        if (effectiveShape === "ellipse" || effectiveShape === "circle") {
          selectionBox.style.borderRadius = "50%";
        } else {
          selectionBox.style.borderRadius = "0px";
        }

        // Update toolbar to show effective shape
        this.toolbar.setShape(effectiveShape);

        // Show dimensions for rectangle/square or radius for circle
        if (effectiveShape === "rectangle" || effectiveShape === "square") {
          dimensionsEl.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
          dimensionsEl.style.display = "block";
          // Position at bottom-right: horizontally aligned with right edge, vertically below
          const dimRect = dimensionsEl.getBoundingClientRect();
          dimensionsEl.style.left = `${rect.left + rect.width - dimRect.width}px`;
          dimensionsEl.style.top = `${rect.top + rect.height + 5}px`;
        } else if (effectiveShape === "circle") {
          const radius = Math.round(rect.width / 2);
          dimensionsEl.textContent = `Radius: ${radius}`;
          dimensionsEl.style.display = "block";
          // Position at bottom-right: horizontally aligned with right edge, vertically below
          const dimRect = dimensionsEl.getBoundingClientRect();
          dimensionsEl.style.left = `${rect.left + rect.width - dimRect.width}px`;
          dimensionsEl.style.top = `${rect.top + rect.height + 5}px`;
        } else {
          dimensionsEl.style.display = "none";
        }

        rafId = null;
      };

      const onMouseDown = (e) => {
        // Don't start selection if clicking on toolbar or its children
        if (e.target.closest('.screenshot-toolbar-container')) {
          return;
        }

        // Check if clicking inside selection box to move it
        if (selectionComplete) {
          const rect = selectionBox.getBoundingClientRect();
          if (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
          ) {
            this.startMoveSelection(e, selectionBox);
            return;
          }
          // Clicking outside selection when complete does nothing
          return;
        }

        isSelecting = true;
        selectionComplete = false;
        startX = e.clientX;
        startY = e.clientY;
        endX = startX;
        endY = startY;

        // Hide toolbar during selection
        this.toolbar.hide();

        Object.assign(selectionBox.style, {
          left: `${startX}px`,
          top: `${startY}px`,
          width: `0px`,
          height: `0px`,
          display: "block",
        });
      };

      const onMouseMove = (e) => {
        if (this.isMoving) {
          this.moveSelection(e, selectionBox, backdrop, getEffectiveShape);
          return;
        }

        if (!isSelecting) return;

        endX = e.clientX;
        endY = e.clientY;

        if (!rafId) {
          rafId = requestAnimationFrame(updateSelection);
        }
      };

      const cleanup = () => {
        backdrop.remove();
        selectionBox.remove();
        dimensionsEl.remove();
        document.body.classList.remove("mc-selecting");
        document.body.style.cursor = "";
        document.removeEventListener("mousedown", onMouseDown);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.removeEventListener("keydown", onKeyDown);
        document.removeEventListener("keyup", onKeyUp);
        if (this.toolbar) {
          this.toolbar.remove();
        }
        if (rafId) cancelAnimationFrame(rafId);
      };

      const onMouseUp = async () => {
        if (this.isMoving) {
          this.stopMoveSelection();
          return;
        }

        if (!isSelecting) return;
        isSelecting = false;

        const effectiveShape = getEffectiveShape();
        const maintainSquare =
          effectiveShape === "square" || effectiveShape === "circle";
        const finalRect = this.utils.adjustRectForAspectRatio(
          startX,
          startY,
          endX,
          endY,
          maintainSquare
        );

        if (finalRect.width < 10 || finalRect.height < 10) {
          this.toolbar.show(); // Show toolbar again if selection too small
          cleanup();
          resolve(false);
          return;
        }

        selectionComplete = true;

        // Store selection metadata
        this.finalRect = finalRect;
        this.finalShape = effectiveShape;

        // Remove selecting class to remove crosshair cursor
        document.body.classList.remove("mc-selecting");
        document.body.style.cursor = "auto";

        // Keep selection box visible and adjust backdrop
        selectionBox.classList.add("completed");
        selectionBox.style.pointerEvents = "auto";
        backdrop.style.opacity = "0.7";
        backdrop.style.cursor = "auto";

        // Show toolbar and accept/cancel buttons
        this.toolbar.show();
        this.toolbar.showPreviewMode();

        // Store cleanup and resolve for later use
        this.cleanup = cleanup;
        this.resolve = resolve;
        this.selectionBox = selectionBox;
        this.backdrop = backdrop;
      };

      const onKeyDown = (e) => {
        if (e.key === "Escape") {
          if (selectionComplete) {
            // Cancel and restart if selection is complete
            this.handleCancel();
          } else {
            // Cancel entirely if still selecting
            isSelecting = false;
            selectionComplete = false;
            cleanup();
            resolve(false);
          }
        }

        if (e.key === "Enter" && selectionComplete) {
          // Accept the selection
          this.handleAccept();
        }

        if (e.key === "Control" || e.key === "Meta") {
          this.isCtrlPressed = true;
          if (isSelecting && !rafId) {
            rafId = requestAnimationFrame(updateSelection);
          }
        }
      };

      const onKeyUp = (e) => {
        if (e.key === "Control" || e.key === "Meta") {
          this.isCtrlPressed = false;
          if (isSelecting && !rafId) {
            rafId = requestAnimationFrame(updateSelection);
          }
        }
      };

      document.addEventListener("mousedown", onMouseDown);
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      document.addEventListener("keydown", onKeyDown);
      document.addEventListener("keyup", onKeyUp);
    });
  }

  handleShapeChange(shape, resolve) {
    if (shape === "freeform") {
      // Save last used shape
      EnhancedShapeCapture.lastUsedShape = "freeform";

      // Manually cleanup EnhancedShapeCapture elements but preserve toolbar
      if (this.backdrop) {
        this.backdrop.remove();
      }
      if (this.selectionBox) {
        this.selectionBox.remove();
      }
      const dimensionsEl = document.querySelector(".mc-selection-dimensions");
      if (dimensionsEl) {
        dimensionsEl.remove();
      }
      document.body.classList.remove("mc-selecting");
      document.body.style.cursor = "";

      // Switch to freeform capture, passing existing toolbar
      const freeformCapture = new FreeformCapture(this.utils);
      freeformCapture.capture(this.toolbar).then(resolve);
    } else {
      this.currentShape = shape;
      EnhancedShapeCapture.lastUsedShape = shape;
      this.toolbar.setShape(shape);
    }
  }

  async handleAccept() {
    if (this.finalRect && this.finalShape && this.cleanup && this.resolve) {
      // Hide toolbar, selection box, and dimensions before capturing
      if (this.toolbar) {
        this.toolbar.hide();
      }
      if (this.selectionBox) {
        this.selectionBox.style.display = "none";
      }
      if (this.backdrop) {
        this.backdrop.style.clipPath = "none";
      }
      // Hide dimensions element
      const dimensionsEl = document.querySelector(".mc-selection-dimensions");
      if (dimensionsEl) {
        dimensionsEl.style.display = "none";
      }

      // Small delay to ensure elements are hidden
      await new Promise(resolve => setTimeout(resolve, 50));

      // Capture the final area based on current selection position
      const imgURL = await this._captureArea(this.finalRect, this.finalShape);

      if (imgURL) {
        this.cleanup();
        this.resolve(imgURL);
      } else {
        console.error("Failed to capture screenshot");
        // Show elements again if capture failed
        if (this.toolbar) {
          this.toolbar.show();
        }
        if (this.selectionBox) {
          this.selectionBox.style.display = "block";
        }
      }
    }
  }

  handleCancel() {
    // Clean up and restart
    if (this.cleanup) {
      this.cleanup();
    }
    if (this.resolve) {
      // Restart capture
      this.capture().then(this.resolve);
    }
  }

  startMoveSelection(e, selectionBox) {
    this.isMoving = true;
    const rect = selectionBox.getBoundingClientRect();
    this.moveOffsetX = e.clientX - rect.left;
    this.moveOffsetY = e.clientY - rect.top;
    this.movingBox = selectionBox;
    selectionBox.style.cursor = "grabbing";
  }

  moveSelection(e, _selectionBox, backdrop, getEffectiveShape) {
    if (!this.isMoving || !this.movingBox) return;

    const newLeft = e.clientX - this.moveOffsetX;
    const newTop = e.clientY - this.moveOffsetY;

    // Update selection box position
    this.movingBox.style.left = `${newLeft}px`;
    this.movingBox.style.top = `${newTop}px`;

    // Update stored finalRect position
    if (this.finalRect) {
      const width = parseFloat(this.movingBox.style.width);
      const height = parseFloat(this.movingBox.style.height);

      this.finalRect = {
        left: newLeft,
        top: newTop,
        width: width,
        height: height
      };

      // Update backdrop clip path
      const effectiveShape = getEffectiveShape();
      const clipPathValue = this._generateClipPath(effectiveShape, this.finalRect);
      backdrop.style.clipPath = clipPathValue;

      // Update dimensions element position
      const dimensionsEl = document.querySelector(".mc-selection-dimensions");
      if (dimensionsEl && dimensionsEl.style.display !== "none") {
        const dimRect = dimensionsEl.getBoundingClientRect();
        dimensionsEl.style.left = `${newLeft + width - dimRect.width}px`;
        dimensionsEl.style.top = `${newTop + height + 5}px`;
      }
    }
  }

  stopMoveSelection() {
    this.isMoving = false;
    if (this.movingBox) {
      this.movingBox.style.cursor = "move";
      this.movingBox = null;
    }
  }

  _generateClipPath(shapeType, rect) {
    if (shapeType === "rectangle" || shapeType === "square") {
      return `polygon(
        evenodd,
        0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
        ${rect.left}px ${rect.top}px,
        ${rect.left}px ${rect.top + rect.height}px,
        ${rect.left + rect.width}px ${rect.top + rect.height}px,
        ${rect.left + rect.width}px ${rect.top}px,
        ${rect.left}px ${rect.top}px
      )`;
    } else {
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const radiusX = rect.width / 2;
      const radiusY = rect.height / 2;

      const segments = 64;
      let ellipsePath = `M ${centerX + radiusX} ${centerY}`;
      for (let i = 1; i <= segments; i++) {
        const angle = (i * 2 * Math.PI) / segments;
        const x = centerX + radiusX * Math.cos(angle);
        const y = centerY + radiusY * Math.sin(angle);
        ellipsePath += ` L ${x} ${y}`;
      }

      return `path(evenodd, "M 0 0 L ${window.innerWidth} 0 L ${window.innerWidth} ${window.innerHeight} L 0 ${window.innerHeight} Z ${ellipsePath} Z")`;
    }
  }

  async _captureArea(finalRect, shape) {
    this.utils.injectColorSanitizerStyle();

    try {
      const captureX = finalRect.left + window.scrollX;
      const captureY = finalRect.top + window.scrollY;
      const scale = 2;

      const screenshotCanvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        x: captureX,
        y: captureY,
        width: finalRect.width,
        height: finalRect.height,
        scrollX: 0,
        scrollY: 0,
        scale: scale,
        backgroundColor: null,
        logging: false,
      });

      return this._processCanvas(screenshotCanvas, shape, finalRect);
    } catch (err) {
      console.error("Selective capture failed:", err);
      return false;
    } finally {
      this.utils.removeSanitizerStyle();
    }
  }

  _processCanvas(screenshotCanvas, shape, finalRect) {
    const scale = 2;
    if (shape === "rectangle" || shape === "square") {
      return screenshotCanvas.toDataURL("image/png");
    } else {
      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = finalRect.width * scale;
      finalCanvas.height = finalRect.height * scale;
      const finalCtx = finalCanvas.getContext("2d");

      const centerX = finalCanvas.width / 2;
      const centerY = finalCanvas.height / 2;
      const radiusX = finalCanvas.width / 2;
      const radiusY = finalCanvas.height / 2;

      finalCtx.beginPath();
      finalCtx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      finalCtx.clip();
      finalCtx.drawImage(screenshotCanvas, 0, 0);

      return finalCanvas.toDataURL("image/png");
    }
  }
}
