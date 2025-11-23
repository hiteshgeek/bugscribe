export default class FreeformCapture {
  constructor(utils) {
    this.utils = utils;
  }

  async capture() {
    return new Promise((resolve) => {
      let isDrawing = false;
      const points = [];
      let cleanupDone = false;
      let rafId = null;

      const borderColor = this.utils.getCSSVariable("--bug-primary", "#d81d65");

      const backdrop = document.createElement("div");
      backdrop.className = "mc-backdrop";
      backdrop.style.pointerEvents = "none";
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
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();

        if (points.length === 1) {
          ctx.arc(points[0].x, points[0].y, 4, 0, 2 * Math.PI);
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
        isDrawing = true;
        points.length = 0;
        points.push({ x: e.clientX, y: e.clientY });
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        backdrop.style.clipPath = "";
        drawLassoBorder();
      };

      const onMouseMove = (e) => {
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
        canvas.removeEventListener("mousedown", onMouseDown);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.removeEventListener("keydown", onKeyDown);
        if (rafId) cancelAnimationFrame(rafId);
      };

      const onMouseUp = async () => {
        if (!isDrawing) return;
        isDrawing = false;

        if (points.length < 2) {
          cleanup();
          resolve(false);
          return;
        }

        if (points[points.length - 1] !== points[0]) {
          points.push(points[0]);
        }

        drawLassoBorder(true);
        updateSelection();

        const imgURL = await this._captureFreeform(points);
        cleanup();
        resolve(imgURL);
      };

      const onKeyDown = (e) => {
        if (e.key === "Escape") {
          cleanup();
          resolve(false);
        }
      };

      canvas.addEventListener("mousedown", onMouseDown);
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      document.addEventListener("keydown", onKeyDown);
    });
  }

  async _captureFreeform(points) {
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

    const roundedMinX = Math.floor(minX);
    const roundedMinY = Math.floor(minY);
    const roundedMaxX = Math.ceil(maxX);
    const roundedMaxY = Math.ceil(maxY);

    const captureX = roundedMinX + window.scrollX;
    const captureY = roundedMinY + window.scrollY;
    const captureWidth = roundedMaxX - roundedMinX;
    const captureHeight = roundedMaxY - roundedMinY;

    const scaleFactor = window.devicePixelRatio || 1;

    await new Promise((r) => setTimeout(r, 50));

    this.utils.injectColorSanitizerStyle();

    try {
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

      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = captureWidth * scaleFactor;
      finalCanvas.height = captureHeight * scaleFactor;
      const finalCtx = finalCanvas.getContext("2d");
      finalCtx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);

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

      finalCtx.drawImage(
        screenshotCanvas,
        0,
        0,
        finalCanvas.width,
        finalCanvas.height
      );

      this.utils.removeSanitizerStyle();
      return finalCanvas.toDataURL("image/png");
    } catch (err) {
      this.utils.removeSanitizerStyle();
      return false;
    }
  }
}
