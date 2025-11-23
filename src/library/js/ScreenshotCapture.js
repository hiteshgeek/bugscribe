// ScreenCapture.js
export default class ScreenshotCapture {
  async captureAny() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: "screen" },
      });

      const track = stream.getVideoTracks()[0];
      const imageCapture = new ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();

      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bitmap, 0, 0);

      const imgURL = canvas.toDataURL("image/png");
      track.stop();
      return imgURL;
    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "AbortError") {
        return false;
      }

      return false;
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
    return new Promise((resolve) => {
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

        backdrop.style.clipPath = `polygon(
          evenodd,
          0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
          ${rect.left}px ${rect.top}px,
          ${rect.left}px ${rect.top + rect.height}px,
          ${rect.left + rect.width}px ${rect.top + rect.height}px,
          ${rect.left + rect.width}px ${rect.top}px,
          ${rect.left}px ${rect.top}px
        )`;

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
        document.removeEventListener("mousedown", onMouseDown);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.removeEventListener("keydown", onKeyDown);
        if (rafId) cancelAnimationFrame(rafId);
      };

      const onMouseUp = async () => {
        if (!isSelecting) return;
        isSelecting = false;

        const rect = selectionBox.getBoundingClientRect();
        if (rect.width < 10 || rect.height < 10) {
          cleanup();
          resolve(false);
          return;
        }

        cleanup();
        await new Promise((r) => setTimeout(r, 50));

        injectColorSanitizerStyle();

        try {
          const canvas = await html2canvas(document.body, {
            useCORS: true,
            allowTaint: true,
            x: rect.left + window.scrollX,
            y: rect.top + window.scrollY,
            width: rect.width,
            height: rect.height,
            scrollX: -window.scrollX,
            scrollY: -window.scrollY,
            scale: 2,
            backgroundColor: null,
            logging: false,
          });

          removeSanitizerStyle();
          resolve(canvas.toDataURL("image/png"));
        } catch (err) {
          console.error("Selective capture failed:", err);
          removeSanitizerStyle();
          resolve(false);
        }
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
}
