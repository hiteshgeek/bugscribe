// EnhancedShapeCapture.js - Improved screenshot capture with modern toolbar

import ScreenshotToolbar from "./ScreenshotToolbar.js";
import FreeformCapture from "./FreeformCapture.js";

export default class EnhancedShapeCapture {
  constructor(utils, config = {}) {
    this.utils = utils;
    this.toolbar = null;

    // Config for default shape: "rectangle", "ellipse", or "freeform"
    const defaultShape = config.defaultShape || "rectangle";
    this.currentShape = EnhancedShapeCapture.lastUsedShape || defaultShape;

    this.isCtrlPressed = false;
    this.isMoving = false;
    this.capturedImage = null;
    this.moveOffsetX = 0;
    this.moveOffsetY = 0;
    // Config for dimensions label position: "center", "right-bottom", "right-top", "left-top", "left-bottom", or false to hide
    this.dimensionsPosition = config.dimensionsPosition !== undefined ? config.dimensionsPosition : "center";
  }

  async capture() {
    console.log('[EnhancedShapeCapture] ===== CAPTURE() CALLED =====');
    console.log('[EnhancedShapeCapture] this.currentShape at start:', this.currentShape);
    return new Promise(async (resolve) => {
      // Only set currentShape from lastUsedShape if not already set (first capture)
      // This preserves the shape when restarting from handleShapeChange
      if (!this.currentShape) {
        console.log('[EnhancedShapeCapture] currentShape was falsy, setting from lastUsedShape');
        this.currentShape = EnhancedShapeCapture.lastUsedShape || "rectangle";
      }
      console.log('[EnhancedShapeCapture] this.currentShape after check:', this.currentShape);

      // If last used shape was freeform, directly start freeform capture
      if (this.currentShape === "freeform") {
        console.log('[EnhancedShapeCapture] Starting freeform capture, currentShape:', this.currentShape);
        const freeformCapture = new FreeformCapture(this.utils);
        console.log('[EnhancedShapeCapture] About to await freeformCapture.capture()');
        const result = await freeformCapture.capture();
        console.log('[EnhancedShapeCapture] ===== FREEFORM CAPTURE RETURNED =====');
        console.log('[EnhancedShapeCapture] Freeform result:', result, 'typeof:', typeof result);
        console.log('[EnhancedShapeCapture] Checking restart: result === restart?', result === 'restart', 'result.restart?', result && result.restart);
        // If freeform returns 'restart' or restart object, it means user switched to a geometric shape
        if (result === 'restart' || (result && result.restart)) {
          console.log('[EnhancedShapeCapture] Detected restart signal');
          // Update currentShape and lastUsedShape to the newly selected shape
          const newShape = (result && result.shape) ? result.shape : "freeform";
          console.log('[EnhancedShapeCapture] New shape to use:', newShape, 'from result.shape:', result.shape);
          console.log('[EnhancedShapeCapture] Setting currentShape and lastUsedShape to:', newShape);
          this.currentShape = newShape;
          EnhancedShapeCapture.lastUsedShape = newShape;
          console.log('[EnhancedShapeCapture] Restarting capture with new shape, this.currentShape now:', this.currentShape);
          console.log('[EnhancedShapeCapture] About to call this.capture() recursively...');
          return this.capture().then(resolve);
        }
        console.log('[EnhancedShapeCapture] Returning freeform result');
        return resolve(result);
      }

      let startX, startY, endX, endY;
      let isSelecting = false;
      let rafId = null;
      let selectionComplete = false;

      // Get or create the single toolbar instance
      console.log('[EnhancedShapeCapture] *** STARTING GEOMETRIC SHAPE SELECTION ***');
      console.log('[EnhancedShapeCapture] Getting toolbar instance');
      this.toolbar = ScreenshotToolbar.getInstance(
        (shape) => this.handleShapeChange(shape, resolve),
        () => this.handleAccept(resolve),
        () => this.handleCancel(resolve),
        () => {
          // Close handler - completely close the capture
          cleanup();
          resolve(false);
        }
      );

      // If toolbar doesn't have DOM element, create it
      if (!this.toolbar.toolbar) {
        console.log('[EnhancedShapeCapture] Toolbar DOM not found, creating it');
        this.toolbar.create();
      }

      // Set shape and show in selection mode
      this.toolbar.setShape(this.currentShape);
      this.toolbar.showSelectionMode();
      this.toolbar.show();

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

        // Show dimensions for rectangle/square or radius for circle (if not disabled)
        if (this.dimensionsPosition === false) {
          dimensionsEl.style.display = "none";
        } else if (effectiveShape === "rectangle" || effectiveShape === "square") {
          dimensionsEl.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
          dimensionsEl.style.display = "block";
          this._positionDimensionsElement(dimensionsEl, rect);
        } else if (effectiveShape === "circle") {
          const radius = Math.round(rect.width / 2);
          dimensionsEl.textContent = `Radius: ${radius}`;
          dimensionsEl.style.display = "block";
          this._positionDimensionsElement(dimensionsEl, rect);
        } else {
          dimensionsEl.style.display = "none";
        }

        rafId = null;
      };

      const onMouseDown = (e) => {
        // Don't start selection if clicking on toolbar, dropdown menu, or its children
        if (e.target.closest('.screenshot-toolbar-container') ||
            e.target.closest('.screenshot-shape-menu') ||
            e.target.closest('.screenshot-shape-option')) {
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
        // Hide toolbar but don't remove it (singleton pattern)
        if (this.toolbar) {
          console.log('[EnhancedShapeCapture] Hiding toolbar in cleanup');
          this.toolbar.hide();
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
        document.body.style.cursor = "";

        // Keep selection box visible and adjust backdrop
        selectionBox.classList.add("completed");
        selectionBox.style.pointerEvents = "auto";
        backdrop.style.opacity = "0.7";
        backdrop.style.cursor = "";

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

      // Store event handlers for cleanup
      this.onMouseDown = onMouseDown;
      this.onMouseMove = onMouseMove;
      this.onMouseUp = onMouseUp;
      this.onKeyDown = onKeyDown;
      this.onKeyUp = onKeyUp;

      document.addEventListener("mousedown", this.onMouseDown);
      document.addEventListener("mousemove", this.onMouseMove);
      document.addEventListener("mouseup", this.onMouseUp);
      document.addEventListener("keydown", this.onKeyDown);
      document.addEventListener("keyup", this.onKeyUp);
    });
  }

  async handleShapeChange(shape, resolve) {
    // Handle instant capture modes (visible, full, any)
    if (shape === "visible" || shape === "full" || shape === "any") {
      console.log('[EnhancedShapeCapture] Instant capture mode selected:', shape);

      // Hide toolbar and remove backdrop immediately before capture
      if (this.toolbar) {
        this.toolbar.hide();
      }
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

      // Small delay to ensure UI elements are removed
      await new Promise(resolve => setTimeout(resolve, 50));

      // Import ScreenshotCapture dynamically to avoid circular dependency
      const { default: ScreenshotCapture } = await import('../ScreenshotCapture.js');
      const screenshotCapture = new ScreenshotCapture();

      // Cleanup event listeners
      if (this.cleanup) {
        this.cleanup();
      }

      // Destroy toolbar
      ScreenshotToolbar.destroyInstance();

      // Capture based on selected mode
      let imgURL;
      if (shape === "visible") {
        imgURL = await screenshotCapture.captureVisibleScreen();
      } else if (shape === "full") {
        imgURL = await screenshotCapture.captureFullScreen();
      } else if (shape === "any") {
        imgURL = await screenshotCapture.captureAny();
      }

      // Resolve with the captured image (don't save these modes to lastUsedShape)
      resolve(imgURL);
      return;
    }

    if (shape === "freeform") {
      // Don't save freeform as lastUsedShape - it's not valid for EnhancedShapeCapture
      // Instead, preserve the current geometric shape for when we return

      // Remove event listeners to prevent conflicts with FreeformCapture
      console.log('[EnhancedShapeCapture] Removing event listeners before switching to freeform');
      if (this.onMouseDown) {
        document.removeEventListener("mousedown", this.onMouseDown);
      }
      if (this.onMouseMove) {
        document.removeEventListener("mousemove", this.onMouseMove);
      }
      if (this.onMouseUp) {
        document.removeEventListener("mouseup", this.onMouseUp);
      }
      if (this.onKeyDown) {
        document.removeEventListener("keydown", this.onKeyDown);
      }
      if (this.onKeyUp) {
        document.removeEventListener("keyup", this.onKeyUp);
      }

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
      freeformCapture.capture(this.toolbar).then((result) => {
        // If freeform returns 'restart' or restart object, restart EnhancedShapeCapture with new shape
        if (result === 'restart' || (result && result.restart)) {
          // Update to the new shape if provided, otherwise keep freeform
          if (result && result.shape) {
            this.currentShape = result.shape;
            EnhancedShapeCapture.lastUsedShape = result.shape;
          } else {
            // No shape change - user just cancelled, keep freeform
            this.currentShape = "freeform";
            EnhancedShapeCapture.lastUsedShape = "freeform";
          }
          this.capture().then(resolve);
        } else {
          // If freeform completed successfully (not cancelled/closed), save it as last used shape
          if (result !== false) {
            EnhancedShapeCapture.lastUsedShape = "freeform";
          }
          resolve(result);
        }
      });
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
        // Destroy toolbar instance on successful capture
        ScreenshotToolbar.destroyInstance();
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

      // Update dimensions element position (if not disabled)
      const dimensionsEl = document.querySelector(".mc-selection-dimensions");
      if (this.dimensionsPosition !== false && dimensionsEl && dimensionsEl.style.display !== "none") {
        const rect = { left: newLeft, top: newTop, width, height };
        this._positionDimensionsElement(dimensionsEl, rect);
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

  _positionDimensionsElement(dimensionsEl, rect) {
    const dimRect = dimensionsEl.getBoundingClientRect();
    const offset = 5; // Offset from edges

    switch (this.dimensionsPosition) {
      case "center":
        // Position at center of selection
        dimensionsEl.style.left = `${rect.left + (rect.width / 2) - (dimRect.width / 2)}px`;
        dimensionsEl.style.top = `${rect.top + (rect.height / 2) - (dimRect.height / 2)}px`;
        break;

      case "right-top":
        // Position at top-right corner (aligned with right edge, above selection)
        dimensionsEl.style.left = `${rect.left + rect.width - dimRect.width}px`;
        dimensionsEl.style.top = `${rect.top - dimRect.height - offset}px`;
        break;

      case "left-top":
        // Position at top-left corner (aligned with left edge, above selection)
        dimensionsEl.style.left = `${rect.left}px`;
        dimensionsEl.style.top = `${rect.top - dimRect.height - offset}px`;
        break;

      case "left-bottom":
        // Position at bottom-left corner (aligned with left edge, below selection)
        dimensionsEl.style.left = `${rect.left}px`;
        dimensionsEl.style.top = `${rect.top + rect.height + offset}px`;
        break;

      case "right-bottom":
      default:
        // Position at bottom-right corner (aligned with right edge, below selection)
        dimensionsEl.style.left = `${rect.left + rect.width - dimRect.width}px`;
        dimensionsEl.style.top = `${rect.top + rect.height + offset}px`;
        break;
    }
  }
}
