import BugButtonWrapper from "./BugButtonWrapper.js";
import MediaCapture from "./MediaCapture.js";
import ConsoleCapture from "./ConsoleCapture.js";

export default class Bugscribe {
  constructor(options = {}) {
    this._options = options;
    this._screenshotPreviews = [];
    this.bugButtonWrapper = new BugButtonWrapper(options.button || {});

    this.mediaCapture = new MediaCapture();

    // Bind the handler to the class instance
    this.captureUsingMediaCapture = this.captureUsingMediaCapture.bind(this);

    this.initMediaEvents();
    this.setHotKeys();
  }

  initMediaEvents() {
    this.bugButtonWrapper.screenshotButton.addEventListener(
      "click",
      this.captureUsingMediaCapture
    );
  }

  async captureUsingMediaCapture() {
    try {
      const imgURL = await this.mediaCapture.captureAny();

      if (!imgURL) return; // if user cancelled or failed

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

  hideImagePreviewWrapper() {
    const bug_elements = document.querySelectorAll(".bug-element");

    bug_elements.forEach((el) => {
      el.classList.add("hide_el");
    });

    return Promise.resolve();
  }

  showImagePreviewWrapper() {
    const bug_elements = document.querySelectorAll(".bug-element");

    bug_elements.forEach((el) => {
      el.classList.remove("hide_el");
    });
  }

  createImagePreviewWrapper() {
    if (this.preview_wrapper) {
      return;
    }

    const preview_wrapper_id = "bugscribe-preview-wrapper";
    const wrapper = document.createElement("div");
    wrapper.id = preview_wrapper_id;
    wrapper.className = "bug-element thin-scroll";
    document.body.appendChild(wrapper);
    this.preview_wrapper = wrapper;
  }

  // Preview function (optional)
  showPreview(imgURL) {
    this.createImagePreviewWrapper();

    const img = document.createElement("img");
    img.src = imgURL;
    img.className = "screenshot-preview";

    this.preview_wrapper.appendChild(img);
  }

  setHotKeys() {
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && e.code === "Digit1") {
        e.preventDefault();
        this.captureUsingMediaCapture();
        console.log("Ctrl + Shift + 1");
      } else if (e.ctrlKey && e.shiftKey && e.code === "Digit2") {
        e.preventDefault();
        this.captureFullScreen();
        console.log("Ctrl + Shift + 2");
      } else if (e.ctrlKey && e.shiftKey && e.code === "Digit3") {
        e.preventDefault();
        this.captureVisibleScreen();
        console.log("Ctrl + Shift + 3");
      } else if (e.ctrlKey && e.shiftKey && e.code === "Digit4") {
        const logger = new ConsoleCapture();

        console.log("Hello world");
        console.warn("This is a warning");
        console.error("An error occurred");
        console.info("Some info message");

        // Get stored logs
        console.table(logger.getLogs());

        // Show logs on screen
        logger.showOverlay();

        // Clear stored logs (does not clear real console)
        logger.clearLogs();
        return;
      }
    });
  }

  getScreenshots() {
    return this._screenshotPreviews;
  }
}

export { Bugscribe };
