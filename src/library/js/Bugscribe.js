// Bugscribe.js (Updated)

import BugButtonWrapper from "./BugButtonWrapper.js";
import MediaCapture from "./MediaCapture.js";
import ConsoleCapture from "./ConsoleCapture.js";
import PreviewManager from "./PreviewManager.js"; // NEW
import RecordingTimer from "./RecordingTimer.js"; // NEW
import { icons } from "./icons.js"; // Keep this if used elsewhere

export default class Bugscribe {
  constructor(options = {}) {
    this._options = options;

    this.maxRecordingSeconds = options.maxRecordingSeconds || 120;
    this.captureMicrophone = true;
    this.startWithMicMuted = false;

    this._screenshotPreviews = [];
    this.bugButtonWrapper = new BugButtonWrapper(options.button || {});
    this.mediaCapture = new MediaCapture();

    // Initialize new helper classes
    this.previewManager = new PreviewManager(); // NEW
    this.recordingTimer = new RecordingTimer(
      this.mediaCapture,
      this.maxRecordingSeconds
    ); // NEW

    // Called from MediaCapture.startRecording once recorder is ready
    this.mediaCapture.onRecordingStarted = (micMutedOnStart) => {
      this.recordingTimer.show(micMutedOnStart); // Use the new class
      console.log(
        "Recording started. Stop it using the timer button or browser's stop sharing."
      );
    };

    this.initMediaEvents();
    this.setHotKeys();
  }

  /* ------------------------------- EVENT BINDING ------------------------------- */
  initMediaEvents() {
    const eventMap = {
      bug_menu_full_page: () => this.captureScreenshot("captureFullScreen"),
      bug_menu_visible_page: () =>
        this.captureScreenshot("captureVisibleScreen"),
      bug_menu_custom_area: () => this.captureScreenshot("captureSelectedArea"),
      bug_menu_any_page: () => this.captureScreenshot("captureAny"),
      recordBtn: this.startRecording,
    };

    Object.entries(eventMap).forEach(([key, handler]) => {
      this.bugButtonWrapper[key]?.addEventListener("click", handler);
    });
  }

  /* ------------------------------ SCREENSHOT HANDLER ------------------------------ */
  captureScreenshot = async (method) => {
    try {
      await this.previewManager.hideWrapper(); // Use PreviewManager
      const imgURL = await this.mediaCapture[method]?.();
      if (!imgURL) return;

      const thumbnail = await this.mediaCapture.createImageThumbnail(imgURL);

      this._screenshotPreviews.push({
        type: "image",
        url: imgURL,
        thumbnail,
        timestamp: Date.now(),
      });

      this.previewManager.showImagePreview(imgURL, thumbnail); // Use PreviewManager
      this.previewManager.showWrapper(); // Use PreviewManager
    } catch (err) {
      console.error(`Error capturing via ${method}:`, err);
    }
  };

  /* ------------------------------ VIDEO RECORDING ------------------------------ */
  startRecording = async () => {
    try {
      await this.previewManager.hideWrapper(); // Use PreviewManager
      console.log("Starting recording...");

      const result = await this.mediaCapture.startRecording(
        this.captureMicrophone,
        this.startWithMicMuted
      );

      // When MediaRecorder stops, we hide the timer
      this.recordingTimer.hide(); // Use RecordingTimer

      if (!result?.url) {
        console.log("Recording was cancelled or failed.");
        this.previewManager.showWrapper(); // Use PreviewManager
        return;
      }

      console.log("Recording completed:", {
        duration: `${(result.duration / 1000).toFixed(1)}s`,
        size: `${(result.size / 1024 / 1024).toFixed(2)}MB`,
      });

      const thumbnail = await this.mediaCapture.createVideoThumbnail(
        result.url
      );

      this._screenshotPreviews.push({
        type: "video",
        url: result.url,
        thumbnail,
        blob: result.blob,
        duration: result.duration,
        size: result.size,
        timestamp: Date.now(),
      });

      this.previewManager.showVideoPreview(result.url, thumbnail); // Use PreviewManager
      this.previewManager.showWrapper(); // Use PreviewManager
    } catch (err) {
      console.error("Error during screen recording:", err?.message || err);
      this.recordingTimer.hide(); // Use RecordingTimer
      this.previewManager.showWrapper(); // Use PreviewManager
    }
  };

  /* ------------------------------ UI HELPERS (Removed/Delegated) ------------------------------ */
  // The following methods have been moved to PreviewManager.js or RecordingTimer.js:
  // showImagePreview, viewFullImage, showVideoPreview, playFullVideo
  // showRecordingTimer, hideRecordingTimer
  // hideImagePreviewWrapper, showImagePreviewWrapper, createImagePreviewWrapper

  hideRecordingTimer() {
    this.recordingTimer.hide();
  }

  /* ------------------------------ HOTKEYS ------------------------------ */
  setHotKeys() {
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        const actions = {
          Digit1: () => this.captureScreenshot("captureFullScreen"),
          Digit2: () => this.captureScreenshot("captureVisibleScreen"),
          Digit3: () => this.captureScreenshot("captureSelectedArea"),
          Digit4: () => this.captureScreenshot("captureAny"),
          Digit5: this.startRecording,
          Digit9: () => {
            const logger = new ConsoleCapture();
            console.log("Hello world");
            console.warn("Warning");
            console.error("Error");
            logger.showOverlay();
            logger.clearLogs();
          },
        };
        actions[e.code]?.();
      }
    });
  }

  /* ------------------------------ PUBLIC API ------------------------------ */
  getScreenshots = () => this._screenshotPreviews;
}

export { Bugscribe };
