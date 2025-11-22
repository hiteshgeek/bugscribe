import BugButtonWrapper from "./BugButtonWrapper.js";
import MediaCapture from "./MediaCapture.js";
import ConsoleCapture from "./ConsoleCapture.js";

export default class Bugscribe {
  constructor(options = {}) {
    this._options = options;
    this._screenshotPreviews = [];
    this.bugButtonWrapper = new BugButtonWrapper(options.button || {});

    this.mediaCapture = new MediaCapture();

    this.captureUsingMediaCapture = this.captureUsingMediaCapture.bind(this);
    this.captureFullScreen = this.captureFullScreen.bind(this);
    this.captureVisibleScreen = this.captureVisibleScreen.bind(this);
    this.captureSelectedArea = this.captureSelectedArea.bind(this);

    this.hideImagePreviewWrapper = this.hideImagePreviewWrapper.bind(this);
    this.showImagePreviewWrapper = this.showImagePreviewWrapper.bind(this);

    this.initMediaEvents();
    this.setHotKeys();
  }

  initMediaEvents() {
    this.bugButtonWrapper.bug_menu_full_page.addEventListener(
      "click",
      this.captureFullScreen
    );

    this.bugButtonWrapper.bug_menu_visible_page.addEventListener(
      "click",
      this.captureVisibleScreen
    );

    this.bugButtonWrapper.bug_menu_custom_area.addEventListener(
      "click",
      this.captureSelectedArea
    );

    this.bugButtonWrapper.bug_menu_any_page.addEventListener(
      "click",
      this.captureUsingMediaCapture
    );
  }

  async captureUsingMediaCapture() {
    try {
      const imgURL = await this.mediaCapture.captureAny();
      if (!imgURL) return;
      this._screenshotPreviews.push(imgURL);
      this.showPreview(imgURL);
    } catch (err) {
      console.error("Error capturing using MediaCapture:", err);
    }
  }

  async captureFullScreen() {
    try {
      await this.hideImagePreviewWrapper();
      const imgURL = await this.mediaCapture.captureFullScreen();
      if (!imgURL) return;
      this._screenshotPreviews.push(imgURL);
      this.showPreview(imgURL);
      this.showImagePreviewWrapper();
    } catch (err) {
      console.error("Error capturing screenshot:", err);
    }
  }

  async captureVisibleScreen() {
    try {
      await this.hideImagePreviewWrapper();
      const imgURL = await this.mediaCapture.captureVisibleScreen();
      if (!imgURL) return;
      this._screenshotPreviews.push(imgURL);
      this.showPreview(imgURL);
      this.showImagePreviewWrapper();
    } catch (err) {
      console.error("Error capturing screenshot:", err);
    }
  }

  async captureSelectedArea() {
    return new Promise((resolve) => {
      let startX, startY, endX, endY;
      let isSelecting = false;
      let rafId = null;

      // Inject sanitizer <style> to prevent color() errors
      const injectColorSanitizerStyle = () => {
        const style = document.createElement("style");
        style.id = "html2canvas-color-sanitize";
        style.textContent = `
          * {
            color: rgb(0,0,0) !important;
            background-color: transparent !important;
            border-color: rgb(160,160,160) !important;
            outline-color: rgb(0,0,0) !important;
            text-decoration-color: rgb(0,0,0) !important;
            box-shadow: none !important;
          }
          *::before, *::after {
            color: rgb(0,0,0) !important;
            background-color: transparent !important;
          }
          svg, svg * {
            fill: rgb(0,0,0) !important;
            stroke: rgb(0,0,0) !important;
          }
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
          0 0, 100% 0, 100% 100%, 0 100%,
          0 0,
          ${rect.left}px ${rect.top}px,
          ${rect.left + rect.width}px ${rect.top}px,
          ${rect.left + rect.width}px ${rect.top + rect.height}px,
          ${rect.left}px ${rect.top + rect.height}px,
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
          const imgURL = canvas.toDataURL("image/png");
          this._screenshotPreviews.push(imgURL);
          this.showPreview(imgURL);
          this.showImagePreviewWrapper();
          resolve(imgURL);
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

  hideImagePreviewWrapper() {
    document
      .querySelectorAll(".bug-element")
      .forEach((el) => el.classList.add("hide_el"));
    return Promise.resolve();
  }

  showImagePreviewWrapper() {
    document
      .querySelectorAll(".bug-element")
      .forEach((el) => el.classList.remove("hide_el"));
  }

  createImagePreviewWrapper() {
    if (this.preview_wrapper) return;
    const wrapper = document.createElement("div");
    wrapper.id = "bugscribe-preview-wrapper";
    wrapper.className = "bug-element thin-scroll";
    document.body.appendChild(wrapper);
    this.preview_wrapper = wrapper;
  }

  showPreview(imgURL) {
    this.createImagePreviewWrapper();
    const img = document.createElement("img");
    img.src = imgURL;
    img.className = "screenshot-preview";
    this.preview_wrapper.appendChild(img);
  }

  setHotKeys() {
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        switch (e.code) {
          case "Digit1":
            this.captureFullScreen();
            break;
          case "Digit2":
            this.captureVisibleScreen();
            break;
          case "Digit3":
            this.captureSelectedArea();
            break;
          case "Digit4":
            this.captureUsingMediaCapture();
            break;
          case "Digit5":
            const logger = new ConsoleCapture();
            console.log("Hello world");
            console.warn("Warning");
            console.error("Error");
            logger.showOverlay();
            logger.clearLogs();
            break;
        }
      }
    });
  }

  getScreenshots() {
    return this._screenshotPreviews;
  }
}

export { Bugscribe };
