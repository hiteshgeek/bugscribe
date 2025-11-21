export default class MediaCapture {
  constructor() {
    this.screenshotPreviews = [];
  }

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
      // If user cancels screen share
      if (err.name === "NotAllowedError" || err.name === "AbortError") {
        return false;
      }

      return false; // fallback
    }
  }

  async captureFullScreen() {
    const modifiedElements = []; // store elements & their old styles

    try {
      // Detect and temporarily change unsupported color styles
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

      // Capture screenshot
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        scale: 2,
        logging: false,
      });

      return canvas.toDataURL("image/png");
    } catch (err) {
      console.error("Error capturing with html2canvas:", err);
      return false;
    } finally {
      // Restore original styles
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

      // Create an overlay clone
      const clone = document.body.cloneNode(true);

      // Container to prevent layout flicker
      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.top = "0";
      container.style.left = "0";
      container.style.right = "0";
      container.style.bottom = "0";
      container.style.overflow = "hidden";
      container.style.zIndex = "-1"; // behind everything
      container.style.opacity = "0"; // invisible but still rendered
      container.style.pointerEvents = "none"; // ignore clicks

      clone.style.transform = `translate(-${scrollX}px, -${scrollY}px)`;
      clone.style.position = "absolute";

      container.appendChild(clone);
      document.body.appendChild(container); // add invisible clone to DOM

      const canvas = await html2canvas(clone, {
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        width: window.innerWidth,
        height: window.innerHeight,
        scale: 2,
      });

      container.remove(); // cleanup

      return canvas.toDataURL("image/png");
    } catch (err) {
      console.error("Error capturing visible screen:", err);
      return false;
    }
  }
}
