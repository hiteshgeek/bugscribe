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
    try {
      await this.hideImagePreviewWrapper();
      const imgURL = await this.mediaCapture.captureSelectedArea();
      if (!imgURL) return;
      this._screenshotPreviews.push(imgURL);
      this.showPreview(imgURL);
      this.showImagePreviewWrapper();
    } catch (err) {
      console.error("Error capturing screenshot:", err);
    }
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
