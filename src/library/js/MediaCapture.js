export default class MediaCapture {
  constructor() {
    this.screenshotPreviews = [];
  }

  async captureFullScreen() {
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

  async captureScreenWithHtml2Canvas() {
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
}
