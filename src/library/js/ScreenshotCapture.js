// ScreenCapture.js
export default class ScreenshotCapture {
  async captureAny() {
    let track = null;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: "screen" },
      });

      track = stream.getVideoTracks()[0];

      // 1. Create a temporary video element to hold the stream frame
      const video = document.createElement("video");
      video.srcObject = stream;

      // 2. Crucial step: Wait for the video stream to load metadata and be ready
      await new Promise((resolve) => {
        // Use onloadedmetadata to ensure the stream is initialized and dimensions are known
        video.onloadedmetadata = () => {
          // Apply a small delay (300ms) here after the video is ready,
          // which gives the native selection dialog time to close.
          setTimeout(resolve, 300);
        };

        // Attempt to play the video (it will be invisible, but required for frame readiness)
        video.play().catch((e) => {
          console.warn("Video play error (expected if backgrounded):", e);
          // Resolve anyway after delay if play fails, to prevent hanging
          setTimeout(resolve, 300);
        });
      });

      // 3. Capture the current stable frame using canvas
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");

      // Draw the current stable frame from the video element
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imgURL = canvas.toDataURL("image/png");

      // 4. Stop the track and stream cleanup
      track.stop();
      return imgURL;
    } catch (err) {
      if (track) track.stop(); // Ensure cleanup on error/cancellation
      if (err.name === "NotAllowedError" || err.name === "AbortError") {
        return false; // User cancelled the dialog
      }

      return false; // Other failure
    }
  }

  async captureFullScreen() {
    const modifiedElements = [];

    try {
      document.querySelectorAll("*").forEach((el) => {
        const style = getComputedStyle(el);

        if (
          style.color.includes("color(") ||
          style.backgroundColor.includes("color(")
        ) {
          modifiedElements.push({
            el,
            originalColor: el.style.color,
            originalBg: el.style.backgroundColor,
          });

          if (style.color.includes("color(")) {
            el.style.color = "rgb(0,0,0)";
          }
          if (style.backgroundColor.includes("color(")) {
            el.style.backgroundColor = "white";
          }
        }
      });

      // NOTE: html2canvas must be available globally or imported here
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        scale: 2,
        logging: false,
      });

      return canvas.toDataURL("image/png");
    } catch (err) {
      console.error("Error capturing full screen:", err);
      return false;
    } finally {
      modifiedElements.forEach(({ el, originalColor, originalBg }) => {
        el.style.color = originalColor;
        el.style.backgroundColor = originalBg;
      });
    }
  }

  async captureVisibleScreen() {
    try {
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      const clone = document.body.cloneNode(true);

      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.top = "0";
      container.style.left = "0";
      container.style.right = "0";
      container.style.bottom = "0";
      container.style.overflow = "hidden";
      container.style.zIndex = "-1";
      container.style.opacity = "0";
      container.style.pointerEvents = "none";

      clone.style.transform = `translate(-${scrollX}px, -${scrollY}px)`;
      clone.style.position = "absolute";

      container.appendChild(clone);
      document.body.appendChild(container);

      // NOTE: html2canvas must be available globally or imported here
      const canvas = await html2canvas(clone, {
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        width: window.innerWidth,
        height: window.innerHeight,
        scale: 2,
      });

      container.remove();

      return canvas.toDataURL("image/png");
    } catch (err) {
      console.error("Error capturing visible screen:", err);
      return false;
    }
  }

  async captureSelectedArea() {
    // This method now defers to the new prompt function
    return this._promptAndStartSelection();
  }

  async _promptAndStartSelection() {
    return new Promise(async (resolve) => {
      let shapeType = await this._showShapeSelectionPreDraw();

      // If user cancels the initial dialog (e.g., clicks close or hits Escape)
      if (!shapeType) {
        resolve(false);
        return;
      }

      // --- Start Drawing Logic (Only proceeds if a shape is selected) ---

      let startX, startY, endX, endY;
      let isSelecting = false;
      let rafId = null;

      const injectColorSanitizerStyle = () => {
        const style = document.createElement("style");
        style.id = "html2canvas-color-sanitize";
        style.textContent = `
        * { color: rgb(0,0,0) !important; background-color: transparent !important; }
        svg, svg * { fill: rgb(0,0,0) !important; stroke: rgb(0,0,0) !important; }
      `;
        document.head.appendChild(style);
      };

      const removeSanitizerStyle = () => {
        const el = document.getElementById("html2canvas-color-sanitize");
        if (el) el.remove();
      };

      const backdrop = document.createElement("div");
      backdrop.className = "mc-backdrop";
      document.body.appendChild(backdrop);

      const selectionBox = document.createElement("div");
      selectionBox.className = "mc-selection-box";
      document.body.appendChild(selectionBox);

      document.body.classList.add("mc-selecting");

      // --- Core Logic: Update Selection Visuals ---
      const updateSelection = () => {
        const rect = {
          left: Math.min(startX, endX),
          top: Math.min(startY, endY),
          width: Math.abs(endX - startX),
          height: Math.abs(endY - startY),
        };

        Object.assign(selectionBox.style, {
          left: `${rect.left}px`,
          top: `${rect.top}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
        });

        // Apply different styling based on shape type
        let clipPathValue = "";
        if (shapeType === "rectangle") {
          selectionBox.style.borderRadius = "0px";
          clipPathValue = `polygon(
          evenodd,
          0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
          ${rect.left}px ${rect.top}px,
          ${rect.left}px ${rect.top + rect.height}px,
          ${rect.left + rect.width}px ${rect.top + rect.height}px,
          ${rect.left + rect.width}px ${rect.top}px,
          ${rect.left}px ${rect.top}px
        )`;
        } else if (shapeType === "ellipse") {
          selectionBox.style.borderRadius = "50%";

          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const radiusX = rect.width / 2;
          const radiusY = rect.height / 2;

          // Create ellipse path approximation
          const segments = 64;
          let ellipsePath = `M ${centerX + radiusX} ${centerY}`;
          for (let i = 1; i <= segments; i++) {
            const angle = (i * 2 * Math.PI) / segments;
            const x = centerX + radiusX * Math.cos(angle);
            const y = centerY + radiusY * Math.sin(angle);
            ellipsePath += ` L ${x} ${y}`;
          }

          clipPathValue = `path(evenodd, "M 0 0 L ${window.innerWidth} 0 L ${window.innerWidth} ${window.innerHeight} L 0 ${window.innerHeight} Z ${ellipsePath} Z")`;
        }

        backdrop.style.clipPath = clipPathValue;

        rafId = null;
      };

      const onMouseDown = (e) => {
        isSelecting = true;
        startX = e.clientX;
        startY = e.clientY;
        endX = startX;
        endY = startY;
        Object.assign(selectionBox.style, {
          left: `${startX}px`,
          top: `${startY}px`,
          width: `0px`,
          height: `0px`,
          display: "block",
        });
      };

      const onMouseMove = (e) => {
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
        document.body.classList.remove("mc-selecting");
        backdrop.removeEventListener("mousedown", onMouseDown);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.removeEventListener("keydown", onKeyDown);
        if (rafId) cancelAnimationFrame(rafId);
      };

      const captureArea = async (finalRect, shape) => {
        cleanup();
        await new Promise((r) => setTimeout(r, 50));

        injectColorSanitizerStyle();

        try {
          const captureX = finalRect.left + window.scrollX;
          const captureY = finalRect.top + window.scrollY;

          const scale = 2;

          // 1. Capture the rectangular bounding box first (using html2canvas)
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

          removeSanitizerStyle();

          if (shape === "rectangle") {
            return screenshotCanvas.toDataURL("image/png");
          } else if (shape === "ellipse") {
            // 2. Apply Elliptical clipping
            const finalCanvas = document.createElement("canvas");
            finalCanvas.width = finalRect.width * scale;
            finalCanvas.height = finalRect.height * scale;
            const finalCtx = finalCanvas.getContext("2d");

            const centerX = finalCanvas.width / 2;
            const centerY = finalCanvas.height / 2;
            const radiusX = finalCanvas.width / 2;
            const radiusY = finalCanvas.height / 2;

            finalCtx.beginPath();
            finalCtx.ellipse(
              centerX,
              centerY,
              radiusX,
              radiusY,
              0,
              0,
              2 * Math.PI
            );
            finalCtx.clip();

            finalCtx.drawImage(screenshotCanvas, 0, 0);

            return finalCanvas.toDataURL("image/png");
          }
        } catch (err) {
          console.error("Selective capture failed:", err);
          removeSanitizerStyle();
          return false;
        }
      };

      const onMouseUp = async () => {
        if (!isSelecting) return;
        isSelecting = false;

        const finalRect = {
          left: Math.min(startX, endX),
          top: Math.min(startY, endY),
          width: Math.abs(endX - startX),
          height: Math.abs(endY - startY),
        };

        if (finalRect.width < 10 || finalRect.height < 10) {
          cleanup();
          resolve(false);
          return;
        }

        const imgURL = await captureArea(finalRect, shapeType);
        resolve(imgURL);
      };

      const onKeyDown = (e) => {
        if (e.key === "Escape") {
          isSelecting = false;
          cleanup();
          resolve(false);
        }
      };

      // --- Attach Listeners (keeping original approach) ---
      backdrop.addEventListener("mousedown", onMouseDown);
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      document.addEventListener("keydown", onKeyDown);
    });
  }

  /**
   * @private
   * Shows the shape selection dialog before drawing starts.
   * @returns {Promise<string|null>} Resolves with the shape ('rectangle' or 'ellipse')
   * or null if cancelled.
   */
  _showShapeSelectionPreDraw() {
    return new Promise((resolve) => {
      // Create the backdrop for the modal
      const modalBackdrop = document.createElement("div");
      modalBackdrop.className = "mc-initial-backdrop";
      Object.assign(modalBackdrop.style, {
        position: "fixed",
        inset: "0",
        background: "rgba(0, 0, 0, 0.7)",
        zIndex: "100000",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      });

      // Create UI container
      const selectorContainer = document.createElement("div");
      selectorContainer.id = "mc-shape-selector";
      Object.assign(selectorContainer.style, {
        padding: "30px",
        background: "white",
        borderRadius: "8px",
        textAlign: "center",
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      });

      selectorContainer.innerHTML = `
      <h3 style="margin-top: 0; font-size: 1.3em;">Choose Capture Shape</h3>
      <div style="display: flex; gap: 30px; justify-content: center; margin-bottom: 20px;">
        <button id="mc-shape-rect" data-shape="rectangle" style="padding: 15px 30px; cursor: pointer; border: 1px solid #ccc; background-color: white; border-radius: 4px; font-weight: bold; min-width: 120px;">
          Rectangle
        </button>
        <button id="mc-shape-ellipse" data-shape="ellipse" style="padding: 15px 30px; cursor: pointer; border: 1px solid #ccc; background-color: white; border-radius: 4px; font-weight: bold; min-width: 120px;">
          Ellipse/Oval
        </button>
      </div>
      <p style="color: gray; font-size: 0.9em; margin: 0;">Click to select shape and begin drawing.</p>
    `;

      modalBackdrop.appendChild(selectorContainer);
      document.body.appendChild(modalBackdrop);

      const rectButton = document.getElementById("mc-shape-rect");
      const ellipseButton = document.getElementById("mc-shape-ellipse");

      const cleanup = () => {
        modalBackdrop.remove();
        document.removeEventListener("keydown", onKeyDown);
      };

      const onKeyDown = (e) => {
        if (e.key === "Escape") {
          cleanup();
          resolve(null); // User cancelled
        }
      };

      rectButton.addEventListener("click", () => {
        cleanup();
        resolve("rectangle");
      });

      ellipseButton.addEventListener("click", () => {
        cleanup();
        resolve("ellipse");
      });

      document.addEventListener("keydown", onKeyDown);
    });
  }

  // FREEFORM/LASSO SELECTION Helpers functions
  _injectColorSanitizerStyle = () => {
    const style = document.createElement("style");
    style.id = "html2canvas-color-sanitize";
    style.textContent = `
      * { color: rgb(0,0,0) !important; background-color: transparent !important; }
      svg, svg * { fill: rgb(0,0,0) !important; stroke: rgb(0,0,0) !important; }
    `;
    document.head.appendChild(style);
  };

  _removeSanitizerStyle = () => {
    const el = document.getElementById("html2canvas-color-sanitize");
    if (el) el.remove();
  };

  // FREEFORM/LASSO SELECTION
  async captureFreeformArea() {
    return new Promise((resolve) => {
      let isDrawing = false;
      const points = [];
      let cleanupDone = false;
      let rafId = null;
      let backdrop = null;

      // --- 1. GET CSS VARIABLE VALUE ---
      // Retrieve the computed value of the CSS variable for use in the canvas
      const rootStyle = getComputedStyle(document.body);
      let borderColor = rootStyle.getPropertyValue("--bug-primary").trim();

      // Fallback if the CSS variable is not defined or returns an empty string
      if (!borderColor || borderColor === "") {
        borderColor = "#d81d65"; // Use your desired fallback hex color
      }

      console.log(borderColor);
      // Note: If the CSS variable is defined as 'var(--bug-primary, #d81d65)' in CSS,
      // this line will return the computed value (e.g., "rgb(216, 29, 101)").

      // 1. Create and APPEND the Backdrop immediately
      backdrop = document.createElement("div");
      backdrop.className = "mc-backdrop";
      backdrop.style.pointerEvents = "none";
      document.body.appendChild(backdrop);

      // 2. Create the Canvas (Used for event capture AND drawing the lasso border)
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

      // Set canvas internal dimensions to match CSS dimensions exactly
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      document.body.classList.add("mc-freeform-selecting");

      // --- Core Logic for Visual Masking and Border ---

      const drawLassoBorder = (isClosed = false) => {
        // Clear the entire canvas first
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (points.length < 1) return;

        // Draw the path using the computed color
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        ctx.beginPath();

        // Draw a dot if only one point
        if (points.length === 1) {
          ctx.arc(points[0].x, points[0].y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = borderColor;
          ctx.fill();
        } else {
          // Draw the continuous path
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
          }
          if (isClosed) {
            ctx.closePath();
          }
          ctx.stroke();
        }
      };

      const updateSelection = () => {
        // 1. Update the canvas border
        drawLassoBorder();

        // 2. Apply clip-path to backdrop (Creates the transparent hole)
        if (points.length < 3) {
          rafId = null;
          return;
        }

        // Create the CSS polygon string from the recorded points
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
        isDrawing = true;
        points.length = 0; // Reset points
        points.push({ x: e.clientX, y: e.clientY });

        // Clear canvas and ensure backdrop has no clip-path
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        backdrop.style.clipPath = "";

        // Draw initial dot (canvas only, backdrop stays dark)
        drawLassoBorder();
      };

      const onMouseMove = (e) => {
        if (!isDrawing) return;
        const lastPoint = points[points.length - 1];
        const dx = e.clientX - lastPoint.x;
        const dy = e.clientY - lastPoint.y;

        // Only record a new point if the mouse has moved a minimum distance
        if (Math.sqrt(dx * dx + dy * dy) > 5) {
          points.push({ x: e.clientX, y: e.clientY });
        }

        if (!rafId) {
          rafId = requestAnimationFrame(updateSelection);
        }
      };

      const onKeyDown = (e) => {
        if (e.key === "Escape") {
          cleanup();
          resolve(false);
        }
      };

      const cleanup = () => {
        if (cleanupDone) return;
        cleanupDone = true;
        canvas.remove();
        backdrop.remove();
        document.body.classList.remove("mc-freeform-selecting");

        canvas.removeEventListener("mousedown", onMouseDown);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.removeEventListener("keydown", onKeyDown);
        if (rafId) cancelAnimationFrame(rafId);
      };

      const onMouseUp = async () => {
        if (!isDrawing) return;
        isDrawing = false;

        // If no drawing happened (only a click)
        if (points.length < 2) {
          cleanup();
          resolve(false);
          return;
        }

        // Close the shape visually (connecting the last point to the first)
        if (points[points.length - 1] !== points[0]) {
          points.push(points[0]);
        }

        // Final update to close the visual border and clip-path
        drawLassoBorder(true);
        updateSelection();

        // --- HTML2Canvas Capture Preparation (Bounding Box) ---
        let minX = Infinity,
          minY = Infinity;
        let maxX = -Infinity,
          maxY = -Infinity;

        for (const p of points) {
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y);
          maxY = Math.max(maxY, p.y);
        }

        // Fix: Round the coordinates and calculate width/height explicitly
        const roundedMinX = Math.floor(minX);
        const roundedMinY = Math.floor(minY);
        const roundedMaxX = Math.ceil(maxX);
        const roundedMaxY = Math.ceil(maxY);

        const captureX = roundedMinX + window.scrollX;
        const captureY = roundedMinY + window.scrollY;
        const captureWidth = roundedMaxX - roundedMinX;
        const captureHeight = roundedMaxY - roundedMinY;

        // Use the actual device pixel ratio for the scale
        const scaleFactor = window.devicePixelRatio || 1;

        // Clean up UI elements before capture
        cleanup();
        await new Promise((r) => setTimeout(r, 50));

        this._injectColorSanitizerStyle();

        try {
          // 1. Capture ONLY the rectangular bounding box region
          const screenshotCanvas = await html2canvas(document.body, {
            useCORS: true,
            x: captureX,
            y: captureY,
            width: captureWidth,
            height: captureHeight,
            scrollX: 0,
            scrollY: 0,
            windowWidth: document.documentElement.scrollWidth,
            windowHeight: document.documentElement.scrollHeight,
            scale: scaleFactor,
            logging: false,
          });

          // 2. Create the final output canvas
          const finalCanvas = document.createElement("canvas");
          finalCanvas.width = captureWidth * scaleFactor;
          finalCanvas.height = captureHeight * scaleFactor;
          const finalCtx = finalCanvas.getContext("2d");
          finalCtx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);

          // 3. Define the polygonal clipping path on the final canvas
          finalCtx.beginPath();
          finalCtx.moveTo(
            (points[0].x - roundedMinX) * scaleFactor,
            (points[0].y - roundedMinY) * scaleFactor
          );
          for (let i = 1; i < points.length; i++) {
            finalCtx.lineTo(
              (points[i].x - roundedMinX) * scaleFactor,
              (points[i].y - roundedMinY) * scaleFactor
            );
          }
          finalCtx.closePath();
          finalCtx.clip();

          // 4. Draw the captured bounding box onto the clipped context
          finalCtx.drawImage(
            screenshotCanvas,
            0,
            0,
            finalCanvas.width,
            finalCanvas.height
          );

          this._removeSanitizerStyle();
          resolve(finalCanvas.toDataURL("image/png"));
        } catch (err) {
          this._removeSanitizerStyle();
          resolve(false);
        }
      };

      // --- Attach Listeners ---
      canvas.addEventListener("mousedown", onMouseDown);
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      document.addEventListener("keydown", onKeyDown);
    });
  }
}
