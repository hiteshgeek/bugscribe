// ScreenCapture.js - Main entry point

import CaptureUtils from "./utils/CaptureUtils.js";
import FreeformCapture from "./utils/FreeformCapture.js";
import ShapeCapture from "./utils/ShapeCapture.js";
import ShapeSelector from "./utils/ShapeSelector.js";

export default class ScreenshotCapture {
  constructor() {
    this.utils = new CaptureUtils();
    this.shapeSelector = new ShapeSelector();
  }

  async captureAny() {
    let track = null;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: "screen" },
      });

      track = stream.getVideoTracks()[0];
      const video = document.createElement("video");
      video.srcObject = stream;

      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          setTimeout(resolve, 300);
        };

        video.play().catch((e) => {
          console.warn("Video play error (expected if backgrounded):", e);
          setTimeout(resolve, 300);
        });
      });

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imgURL = canvas.toDataURL("image/png");

      track.stop();
      return imgURL;
    } catch (err) {
      if (track) track.stop();
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
    const modifiedElements = [];

    try {
      // Sanitize colors before cloning
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
            el.style.backgroundColor = "transparent";
          }
        }
      });

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
    } finally {
      // Restore original colors
      modifiedElements.forEach(({ el, originalColor, originalBg }) => {
        el.style.color = originalColor;
        el.style.backgroundColor = originalBg;
      });
    }
  }

  async captureSelectedArea() {
    return new ShapeCapture(this.utils, this.shapeSelector).capture();
  }

  async captureFreeformArea() {
    return new FreeformCapture(this.utils).capture();
  }
}
