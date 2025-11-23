export default class ShapeCapture {
  constructor(utils, shapeSelector) {
    this.utils = utils;
    this.shapeSelector = shapeSelector;
  }

  async capture() {
    return new Promise(async (resolve) => {
      const shapeType = await this.shapeSelector.show();

      if (!shapeType) {
        resolve(false);
        return;
      }

      let startX, startY, endX, endY;
      let isSelecting = false;
      let rafId = null;

      const backdrop = document.createElement("div");
      backdrop.className = "mc-backdrop";
      document.body.appendChild(backdrop);

      const selectionBox = document.createElement("div");
      selectionBox.className = "mc-selection-box";
      document.body.appendChild(selectionBox);

      document.body.classList.add("mc-selecting");

      const updateSelection = () => {
        const maintainSquare = shapeType === "square" || shapeType === "circle";
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

        const clipPathValue = this._generateClipPath(shapeType, rect);
        backdrop.style.clipPath = clipPathValue;

        if (shapeType === "ellipse" || shapeType === "circle") {
          selectionBox.style.borderRadius = "50%";
        } else {
          selectionBox.style.borderRadius = "0px";
        }

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

      const onMouseUp = async () => {
        if (!isSelecting) return;
        isSelecting = false;

        const maintainSquare = shapeType === "square" || shapeType === "circle";
        const finalRect = this.utils.adjustRectForAspectRatio(
          startX,
          startY,
          endX,
          endY,
          maintainSquare
        );

        if (finalRect.width < 10 || finalRect.height < 10) {
          cleanup();
          resolve(false);
          return;
        }

        const imgURL = await this._captureArea(finalRect, shapeType);
        cleanup();
        resolve(imgURL);
      };

      const onKeyDown = (e) => {
        if (e.key === "Escape") {
          isSelecting = false;
          cleanup();
          resolve(false);
        }
      };

      backdrop.addEventListener("mousedown", onMouseDown);
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      document.addEventListener("keydown", onKeyDown);
    });
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
    await new Promise((r) => setTimeout(r, 50));

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

      this.utils.removeSanitizerStyle();

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
    } catch (err) {
      console.error("Selective capture failed:", err);
      this.utils.removeSanitizerStyle();
      return false;
    }
  }
}
