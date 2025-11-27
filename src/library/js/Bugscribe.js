// Bugscribe.js

import BugButtonWrapper from "./BugButtonWrapper.js";
import MediaCapture from "./MediaCapture.js";
import ConsoleCapture from "./ConsoleCapture.js";
import PreviewManager from "./PreviewManager.js";
import RecordingTimer from "./RecordingTimer.js";
import { VideoResolution } from "./VideoRecorder.js";

export default class Bugscribe {
  constructor(options = {}) {
    this._options = options;
    this.defaultScreenshotMethod =
      options.defaultScreenshotMethod || "captureSelectedArea"; //screenshot method options: captureFullScreen, captureVisibleScreen, captureSelectedArea, captureAny, captureFreeformArea

    this.maxRecordingSeconds = options.maxRecordingSeconds || 120;
    this.captureMicrophone = true;
    this.startWithMicMuted = false;

    this._screenshotPreviews = [];
    this.bugButtonWrapper = new BugButtonWrapper(options.button || {});
    this.mediaCapture = new MediaCapture(); // Initialize new helper classes

    // this.previewManager = new PreviewManager(
    //   this.getFullMediaData,
    //   this.deleteMediaData
    // );

    this.previewManager = new PreviewManager(
      this.getFullMediaData,
      this.deleteMediaData,
      {
        viewMode: "carousel",
      }
    );

    this.recordingTimer = new RecordingTimer(
      this.mediaCapture,
      this.maxRecordingSeconds
    ); // Called from MediaCapture.startRecording once recorder is ready

    // {
    //   showDot: false,
    //   showDotOnHidden: true,
    // }
    // this.recordingTimer = new RecordingTimer(this.mediaCapture, 300, {
    //   showDot: false,
    //   showWaveform: false,

    //   showRecordingTime: false,
    //   showMaxTime: true,

    //   showMicButton: false,
    //   showSystemAudioButton: false,

    //   showPauseButton: false,
    //   showStopButton: true,

    //   showPositionToolbar: false,
    //   showScalingToolbar: true,
    //   showMinimizeButton: false,
    // });

    this.mediaCapture.onRecordingStarted = (micMutedOnStart) => {
      this.recordingTimer.show(micMutedOnStart);
      console.log(
        "Recording started. Stop it using the timer button or browser's stop sharing."
      );
    };

    this.mediaCapture.onPause = () => {
      this.recordingTimer.updateToPaused();
      console.log("Video recording paused via MediaCapture event.");
    };

    this.mediaCapture.onResume = () => {
      this.recordingTimer.updateToResumed();
      console.log("Video recording resumed via MediaCapture event.");
    };

    this.mediaCapture.onMicToggled = (isNowMuted) => {
      this.recordingTimer.updateMicVisual(isNowMuted);
      console.log(
        `Microphone toggled via MediaCapture event. Muted: ${isNowMuted}`
      );
    };
    // ------------------------------------------

    this.initMediaEvents();
    this.setHotKeys();
  } /* ------------------------------- EVENT BINDING ------------------------------- */

  initMediaEvents() {
    const eventMap = {
      // Handlers now include stopPropagation() to prevent event bubbling
      bug_menu_full_page: (e) => {
        e.stopPropagation();
        this.captureScreenshot("captureFullScreen");
      },
      bug_menu_visible_page: (e) => {
        e.stopPropagation();
        this.captureScreenshot("captureVisibleScreen");
      },
      bug_menu_custom_area: (e) => {
        e.stopPropagation();
        this.captureScreenshot("captureSelectedArea");
      },
      bug_menu_any_page: (e) => {
        e.stopPropagation();
        this.captureScreenshot("captureAny");
      },
      bug_menu_freeform_area: (e) => {
        e.stopPropagation();
        this.captureScreenshot("captureFreeformArea");
      },
      recordBtn: () => this.startRecording(), // ✅ Main screenshot button enabled

      screenshotButton: () =>
        this.captureScreenshot(this.defaultScreenshotMethod),
    };

    Object.entries(eventMap).forEach(([key, handler]) => {
      this.bugButtonWrapper[key]?.addEventListener("click", handler);
    });
  } /* ------------------------------ SCREENSHOT HANDLER ------------------------------ */

  captureScreenshot = async (method) => {
    try {
      await this.previewManager.hideWrapper(); // 1. Hide the wrapper (Always happens)
      const imgURL = await this.mediaCapture[method]?.();

      if (!imgURL) {
        console.log(`Screenshot capture via ${method} was cancelled.`);
        this.previewManager.showWrapper(); // 2. Show the wrapper on cancel/failure
        return;
      }

      const thumbnail = await this.mediaCapture.createImageThumbnail(imgURL);

      const newPreviewData = {
        type: "image",
        url: imgURL, // Full URL
        thumbnail,
        timestamp: Date.now(),
      };

      this._screenshotPreviews.push(newPreviewData);
      const previewIndex = this._screenshotPreviews.length - 1; // Get the index // Pass the index/ID instead of the full URL for preview

      this.previewManager.showImagePreview(previewIndex, thumbnail);
      this.previewManager.showWrapper(); // 3. Show the wrapper on success
    } catch (err) {
      console.error(`Error capturing via ${method}:`, err);
      this.previewManager.showWrapper(); // 4. Show the wrapper on error
    }
  }; /* ------------------------------ VIDEO RECORDING ------------------------------ */

  startRecording = async (resolution = VideoResolution.P1080) => {
    try {
      await this.previewManager.hideWrapper(); // Use PreviewManager
      console.log("Starting recording...");

      const result = await this.mediaCapture.startRecording(
        this.captureMicrophone,
        this.startWithMicMuted,
        resolution
      ); // When MediaRecorder stops, we hide the timer

      this.recordingTimer.hide(); // Use RecordingTimer

      if (!result?.url) {
        console.log("Recording was cancelled or failed.");
        this.previewManager.showWrapper(); // FIX: Wrapper shown on video cancel
        return;
      }

      console.log("Recording completed:", {
        duration: `${(result.duration / 1000).toFixed(1)}s`,
        size: `${(result.size / 1024 / 1024).toFixed(2)}MB`,
        resolution:
          result.width && result.height
            ? `${result.width}x${result.height}`
            : "N/A",
      }); // NOTE: Using result.url for thumbnail generation

      const thumbnail = await this.mediaCapture.createVideoThumbnail(
        result.url
      );

      const newPreviewData = {
        type: "video",
        url: result.url, // Full URL
        thumbnail,
        blob: result.blob,
        duration: result.duration,
        size: result.size,
        timestamp: Date.now(),
      };

      this._screenshotPreviews.push(newPreviewData);
      const previewIndex = this._screenshotPreviews.length - 1; // Get the index // Pass the index/ID instead of the full URL for preview

      this.previewManager.showVideoPreview(previewIndex, thumbnail);
      this.previewManager.showWrapper(); // Use PreviewManager
    } catch (err) {
      console.error("Error during screen recording:", err?.message || err);
      this.recordingTimer.hide(); // Use RecordingTimer
      this.previewManager.showWrapper(); // Use PreviewManager
    }
  }; /* ------------------------------ MEDIA DATA RETRIEVAL ------------------------------ */

  getFullMediaData = (index) => {
    return this._screenshotPreviews[index];
  }; /* ------------------------------ MEDIA DATA DELETION ------------------------------ */

  deleteMediaData = (index) => {
    if (index >= 0 && index < this._screenshotPreviews.length) {
      const deletedItem = this._screenshotPreviews.splice(index, 1);
      console.log(`Deleted media item at index ${index}:`, deletedItem[0].type); // Re-render the entire preview wrapper to update indices

      this.previewManager.redrawPreviews(this._screenshotPreviews);
      return true;
    }
    return false;
  }; /* ------------------------------ UI HELPERS (Removed/Delegated) ------------------------------ */

  hideRecordingTimer() {
    this.recordingTimer.hide();
  } /* ------------------------------ HOTKEYS ------------------------------ */

  setHotKeys() {
    document.addEventListener("keydown", (e) => {
      // ESC key to stop recording
      if (e.key === "Escape" && this.mediaCapture.isRecording()) {
        e.preventDefault();
        this.mediaCapture.stopRecording();
        return;
      }

      // Ctrl+F1 to show recording shortcuts modal
      if (e.ctrlKey && e.key === "F1") {
        e.preventDefault();
        if (this.recordingTimer) {
          this.recordingTimer.showShortcutsModal();
        }
        return;
      }

      if (e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        const actions = {
          Digit1: () => this.captureScreenshot("captureFullScreen"),
          Digit2: () => this.captureScreenshot("captureVisibleScreen"),
          Digit3: () => this.captureScreenshot("captureSelectedArea"),
          Digit4: () => this.captureScreenshot("captureAny"),
          Digit5: () => this.captureScreenshot("captureFreeformArea"),
          Digit6: () => this.startRecording(VideoResolution.P480),
          Digit7: () => this.startRecording(VideoResolution.P720),
          Digit8: () => this.startRecording(),
          Digit9: () => this.startRecording(VideoResolution.P1440),
          Digit0: () => {
            const logger = new ConsoleCapture();
            console.log("Hello world");
            console.warn("Warning");
            console.error("Error");
            logger.showOverlay();
            logger.clearLogs();
          },

          KeyA: () => {
            // e.g., Ctrl+Shift+A for system audio
            if (this.mediaCapture.isRecording()) {
              const isNowMuted = this.mediaCapture.toggleSystemAudio();
              this.recordingTimer.updateSystemAudioVisual(isNowMuted);
              console.log(
                `System audio toggled via shortcut. Muted: ${isNowMuted}`
              );
            }
          },

          KeyS: () => {
            if (this.mediaCapture.isRecording()) {
              this.mediaCapture.stopRecording();
            }
          },

          KeyP: () => {
            if (this.mediaCapture.isRecording()) {
              if (this.mediaCapture.isPaused()) {
                this.mediaCapture.resumeRecording();
              } else {
                this.mediaCapture.pauseRecording();
              }
            }
          },

          KeyM: () => {
            if (this.mediaCapture.isRecording()) {
              this.mediaCapture.toggleMicrophone();
            }
          },

          KeyT: () => {
            // Toggle timer minimize/maximize
            if (this.recordingTimer) {
              this.recordingTimer.toggleMinimize();
            }
          },

          KeyH: () => {
            // Toggle timer hide/show
            if (this.recordingTimer) {
              this.recordingTimer.toggleHideShow();
            }
          },
        };
        actions[e.code]?.();
      }
    });
  } /* ------------------------------ PUBLIC API ------------------------------ */

  getScreenshots = () => this._screenshotPreviews;
}

export { Bugscribe };
