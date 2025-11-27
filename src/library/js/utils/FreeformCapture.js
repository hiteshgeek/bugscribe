import ScreenshotToolbar from "./ScreenshotToolbar.js";

export default class FreeformCapture {
  constructor(utils) {
    this.utils = utils;
    this.toolbar = null;
    this.isMoving = false;
    this.moveOffsetX = 0;
    this.moveOffsetY = 0;
  }

  async capture(existingToolbar = null) {
    console.log('[FreeformCapture] capture() called, existingToolbar:', !!existingToolbar, existingToolbar);

    // Reset instance flag for new capture
    this.captureResolved = false;

    return new Promise((resolve) => {
      let isDrawing = false;
      const points = [];
      let cleanupDone = false;
      let rafId = null;
      let selectionComplete = false;

      const borderColor = this.utils.getCSSVariable("--bug-primary", "#d81d65");
      this.borderColor = borderColor; // Store for move function

      // Get or create the single toolbar instance
      console.log('[FreeformCapture] Getting toolbar instance (existingToolbar ignored - using singleton)');
      this.toolbar = ScreenshotToolbar.getInstance(
        (shape) => this.handleShapeChange(shape),
        () => this.handleAccept(),
        () => this.handleCancel(),
        () => this.handleClose()
      );

      // If toolbar doesn't have DOM element, create it
      if (!this.toolbar.toolbar) {
        console.log('[FreeformCapture] Toolbar DOM not found, creating it');
        this.toolbar.create();
      }

      // Set shape and show in selection mode
      this.toolbar.setShape("freeform");
      this.toolbar.showSelectionMode();
      this.toolbar.show();

      const backdrop = document.createElement("div");
      backdrop.className = "mc-backdrop";
      backdrop.style.pointerEvents = "auto";
      backdrop.style.cursor = "crosshair";
      backdrop.style.opacity = "0.5";
      document.body.appendChild(backdrop);

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      Object.assign(canvas.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        zIndex: "100000",
        cursor: "crosshair",
        pointerEvents: "auto",
        background: "transparent",
      });
      document.body.appendChild(canvas);

      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      document.body.classList.add("mc-freeform-selecting");

      const drawLassoBorder = (isClosed = false) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (points.length < 1) return;

        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 3;
        ctx.setLineDash([]); // Solid line for better visibility
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();

        if (points.length === 1) {
          ctx.arc(points[0].x, points[0].y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = borderColor;
          ctx.fill();
        } else {
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
          }
          if (isClosed) ctx.closePath();
          ctx.stroke();
        }
      };

      const updateSelection = () => {
        drawLassoBorder();

        if (points.length < 3) {
          rafId = null;
          return;
        }

        const clipPathValue = `path(evenodd, "M 0 0 L ${
          window.innerWidth
        } 0 L ${window.innerWidth} ${window.innerHeight} L 0 ${
          window.innerHeight
        } Z M ${points[0].x} ${points[0].y} ${points
          .slice(1)
          .map((p) => `L ${p.x} ${p.y}`)
          .join(" ")} Z")`;
        backdrop.style.clipPath = clipPathValue;
        rafId = null;
      };

      const onMouseDown = (e) => {
        // Ignore all events if capture has been resolved
        if (this.captureResolved) {
          console.log('[FreeformCapture] Ignoring mousedown - capture already resolved');
          return;
        }

        // Don't start selection if clicking on toolbar or dropdown menu
        if (e.target.closest('.screenshot-toolbar-container') ||
            e.target.closest('.screenshot-shape-menu') ||
            e.target.closest('.screenshot-shape-option')) {
          console.log('[FreeformCapture] Ignoring mousedown on toolbar/menu');
          return;
        }

        // Check if clicking inside selection to move it
        if (selectionComplete && points.length > 0) {
          if (this.isPointInPath(ctx, points, e.clientX, e.clientY)) {
            this.startMoveSelection(e, points, canvas);
            return;
          }
          return;
        }

        isDrawing = true;
        points.length = 0;
        points.push({ x: e.clientX, y: e.clientY });
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        backdrop.style.clipPath = "";

        // Hide toolbar during drawing
        console.log('[FreeformCapture] Hiding toolbar, this.toolbar:', !!this.toolbar);
        if (this.toolbar) {
          this.toolbar.hide();
        }

        drawLassoBorder();
      };

      const onMouseMove = (e) => {
        // Ignore all events if capture has been resolved
        if (this.captureResolved) {
          return;
        }

        if (this.isMoving) {
          this.moveSelection(e, points, canvas, ctx, backdrop, drawLassoBorder);
          return;
        }

        if (!isDrawing) return;
        const lastPoint = points[points.length - 1];
        const dx = e.clientX - lastPoint.x;
        const dy = e.clientY - lastPoint.y;

        if (Math.sqrt(dx * dx + dy * dy) > 5) {
          points.push({ x: e.clientX, y: e.clientY });
        }

        if (!rafId) {
          rafId = requestAnimationFrame(updateSelection);
        }
      };

      const cleanup = () => {
        if (cleanupDone) return;
        cleanupDone = true;
        canvas.remove();
        backdrop.remove();
        document.body.classList.remove("mc-freeform-selecting");
        document.body.style.cursor = "";
        canvas.removeEventListener("mousedown", onMouseDown);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.removeEventListener("keydown", onKeyDown);
        // Hide toolbar but don't remove it (singleton pattern)
        if (this.toolbar) {
          console.log('[FreeformCapture] Hiding toolbar in cleanup');
          this.toolbar.hide();
        }
        if (rafId) cancelAnimationFrame(rafId);
      };

      // Store cleanup and resolve early so handleShapeChange can use them
      this.cleanup = cleanup;
      this.resolve = resolve;

      const onMouseUp = async () => {
        // Ignore all events if capture has been resolved
        if (this.captureResolved) {
          console.log('[FreeformCapture] Ignoring mouseup - capture already resolved');
          return;
        }

        if (this.isMoving) {
          this.stopMoveSelection(canvas);
          return;
        }

        if (!isDrawing) return;
        isDrawing = false;

        if (points.length < 2) {
          this.toolbar.show();
          cleanup();
          resolve(false);
          return;
        }

        if (points[points.length - 1] !== points[0]) {
          points.push(points[0]);
        }

        drawLassoBorder(true);
        updateSelection();

        selectionComplete = true;

        // Store for accept handler (cleanup and resolve already stored earlier)
        this.points = points;
        this.canvas = canvas;
        this.ctx = ctx;
        this.backdrop = backdrop;
        this.drawLassoBorder = drawLassoBorder;

        // Remove freeform-selecting class and change cursor
        document.body.classList.remove("mc-freeform-selecting");
        document.body.style.cursor = "";
        canvas.style.cursor = "move";
        backdrop.style.cursor = "";

        // Show toolbar with accept/cancel
        console.log('[FreeformCapture] Showing toolbar after selection complete, this.toolbar:', !!this.toolbar, this.toolbar);
        if (this.toolbar) {
          this.toolbar.show();
          this.toolbar.showPreviewMode();
        } else {
          console.error('[FreeformCapture] ERROR: this.toolbar is falsy!');
        }

        backdrop.style.opacity = "0.7";

        // Ensure canvas doesn't block toolbar by adjusting z-index temporarily
        canvas.style.zIndex = "99999"; // Below toolbar (1000000)
        console.log('[FreeformCapture] Toolbar should be visible now');
      };

      const onKeyDown = (e) => {
        if (e.key === "Escape") {
          if (selectionComplete) {
            // Cancel and restart if selection is complete
            this.handleCancel();
          } else {
            // Cancel entirely if still drawing
            cleanup();
            resolve(false);
          }
        }

        if (e.key === "Enter" && selectionComplete) {
          // Accept the selection
          this.handleAccept();
        }
      };

      canvas.addEventListener("mousedown", onMouseDown);
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      document.addEventListener("keydown", onKeyDown);
    });
  }

  async handleAccept() {
    if (this.points && this.cleanup && this.resolve) {
      // Mark capture as resolved to prevent any queued events from firing
      this.captureResolved = true;

      // Hide toolbar and canvas border before capturing
      if (this.toolbar) {
        this.toolbar.hide();
      }
      if (this.canvas) {
        this.canvas.style.display = "none";
      }
      if (this.backdrop) {
        this.backdrop.style.clipPath = "none";
        this.backdrop.style.opacity = "0";
      }

      // Small delay to ensure elements are hidden
      await new Promise(resolve => setTimeout(resolve, 100));

      try {
        const imgURL = await this._captureFreeform(this.points);
        if (imgURL) {
          this.cleanup();
          // Destroy toolbar instance on successful capture
          ScreenshotToolbar.destroyInstance();
          this.resolve(imgURL);
        } else {
          console.error("Failed to capture freeform screenshot");
          this.cleanup();
          ScreenshotToolbar.destroyInstance();
          this.resolve(false);
        }
      } catch (error) {
        console.error("Error capturing freeform screenshot:", error);
        this.cleanup();
        ScreenshotToolbar.destroyInstance();
        this.resolve(false);
      }
    }
  }

  handleCancel() {
    console.log('[FreeformCapture] handleCancel called, newShape:', this.newShape);

    // Mark capture as resolved to prevent any queued events from firing
    this.captureResolved = true;
    console.log('[FreeformCapture] Set captureResolved = true');

    // Reset toolbar to selection mode before cleanup
    if (this.toolbar) {
      console.log('[FreeformCapture] Resetting toolbar to selection mode');
      this.toolbar.showSelectionMode();
    }

    console.log('[FreeformCapture] About to call cleanup, this.cleanup:', !!this.cleanup);
    if (this.cleanup) {
      this.cleanup();
      console.log('[FreeformCapture] Cleanup completed');
    } else {
      console.log('[FreeformCapture] No cleanup function available');
    }

    console.log('[FreeformCapture] About to resolve, this.resolve:', !!this.resolve);
    if (this.resolve) {
      // Signal to restart with parent capture mode
      // If newShape is set, pass it along with restart signal
      if (this.newShape) {
        console.log('[FreeformCapture] Resolving with restart object:', { restart: true, shape: this.newShape });
        this.resolve({ restart: true, shape: this.newShape });
        console.log('[FreeformCapture] Resolve called with restart object');
      } else {
        console.log('[FreeformCapture] Resolving with restart string');
        this.resolve('restart');
        console.log('[FreeformCapture] Resolve called with restart string');
      }
    } else {
      console.log('[FreeformCapture] ERROR: No resolve function available!');
    }
  }

  handleClose() {
    console.log('[FreeformCapture] handleClose called');

    // Mark capture as resolved to prevent any queued events from firing
    this.captureResolved = true;

    if (this.cleanup) {
      this.cleanup();
    }
    // Destroy toolbar instance when closing
    ScreenshotToolbar.destroyInstance();
    if (this.resolve) {
      this.resolve(false);
    }
  }

  handleShapeChange(shape) {
    console.log('[FreeformCapture] handleShapeChange called with shape:', shape);
    // Store the new shape to pass back
    this.newShape = shape;
    console.log('[FreeformCapture] Set this.newShape to:', this.newShape);
    // Cancel and restart with the new shape
    this.handleCancel();
  }

  isPointInPath(ctx, points, x, y) {
    if (points.length < 3) return false;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();

    return ctx.isPointInPath(x, y);
  }

  startMoveSelection(e, _points, canvas) {
    this.isMoving = true;
    this.moveOffsetX = e.clientX;
    this.moveOffsetY = e.clientY;
    canvas.style.cursor = "grabbing";
  }

  moveSelection(e, points, _canvas, ctx, backdrop, drawLassoBorder) {
    if (!this.isMoving) return;

    const deltaX = e.clientX - this.moveOffsetX;
    const deltaY = e.clientY - this.moveOffsetY;

    // Update all points
    for (let i = 0; i < points.length; i++) {
      points[i].x += deltaX;
      points[i].y += deltaY;
    }

    this.moveOffsetX = e.clientX;
    this.moveOffsetY = e.clientY;

    // Clear and redraw with updated context
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.strokeStyle = this.borderColor || "#d81d65";
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();

    if (points.length > 1) {
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Update backdrop clip path
    if (points.length >= 3) {
      const clipPathValue = `path(evenodd, "M 0 0 L ${
        window.innerWidth
      } 0 L ${window.innerWidth} ${window.innerHeight} L 0 ${
        window.innerHeight
      } Z M ${points[0].x} ${points[0].y} ${points
        .slice(1)
        .map((p) => `L ${p.x} ${p.y}`)
        .join(" ")} Z")`;
      backdrop.style.clipPath = clipPathValue;
    }
  }

  stopMoveSelection(canvas) {
    this.isMoving = false;
    canvas.style.cursor = "move";
  }

  async _captureFreeform(points) {
    if (points.length < 3) return false;

    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    const width = maxX - minX;
    const height = maxY - minY;

    if (width < 2 || height < 2) return false;

    this.utils.injectColorSanitizerStyle();

    try {
      const scale = 2;
      const screenshotCanvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        x: minX + window.scrollX,
        y: minY + window.scrollY,
        width: width,
        height: height,
        scrollX: 0,
        scrollY: 0,
        scale: scale,
        backgroundColor: null,
        logging: false,
      });

      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = width * scale;
      finalCanvas.height = height * scale;
      const finalCtx = finalCanvas.getContext("2d");

      finalCtx.beginPath();
      finalCtx.moveTo(
        (points[0].x - minX) * scale,
        (points[0].y - minY) * scale
      );
      for (let i = 1; i < points.length; i++) {
        finalCtx.lineTo(
          (points[i].x - minX) * scale,
          (points[i].y - minY) * scale
        );
      }
      finalCtx.closePath();
      finalCtx.clip();

      finalCtx.drawImage(screenshotCanvas, 0, 0);
      return finalCanvas.toDataURL("image/png");
    } catch (err) {
      console.error("Freeform capture failed:", err);
      return false;
    } finally {
      this.utils.removeSanitizerStyle();
    }
  }
}
