import BugButtonWrapper from "./BugButtonWrapper.js";
import MediaCapture from "./MediaCapture.js";
import ConsoleCapture from "./ConsoleCapture.js";
import { icons } from "./icons.js";

export default class Bugscribe {
  constructor(options = {}) {
    this._options = options;

    this.maxRecordingSeconds = options.maxRecordingSeconds || 120;
    this.captureMicrophone = true; // you can later wire this to options.captureMicrophone
    this.startWithMicMuted = true; // initial configuration

    this._screenshotPreviews = [];
    this.bugButtonWrapper = new BugButtonWrapper(options.button || {});
    this.mediaCapture = new MediaCapture();

    // Called from MediaCapture.startRecording once recorder is ready
    this.mediaCapture.onRecordingStarted = (micMutedOnStart) => {
      this.showRecordingTimer(micMutedOnStart);
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
      await this.hideImagePreviewWrapper();
      const imgURL = await this.mediaCapture[method]?.();
      if (!imgURL) return;

      const thumbnail = await this.mediaCapture.createImageThumbnail(imgURL);

      this._screenshotPreviews.push({
        type: "image",
        url: imgURL,
        thumbnail,
        timestamp: Date.now(),
      });

      this.showImagePreview(imgURL, thumbnail);
      this.showImagePreviewWrapper();
    } catch (err) {
      console.error(`Error capturing via ${method}:`, err);
    }
  };

  /* ------------------------------ VIDEO RECORDING ------------------------------ */
  startRecording = async () => {
    try {
      await this.hideImagePreviewWrapper();
      console.log("Starting recording...");

      const result = await this.mediaCapture.startRecording(
        this.captureMicrophone,
        this.startWithMicMuted
      );

      // When MediaRecorder stops, we hide the timer
      this.hideRecordingTimer();

      if (!result?.url) {
        console.log("Recording was cancelled or failed.");
        this.showImagePreviewWrapper();
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

      this.showVideoPreview(result.url, thumbnail);
      this.showImagePreviewWrapper();
    } catch (err) {
      console.error("Error during screen recording:", err?.message || err);
      this.hideRecordingTimer();
      this.showImagePreviewWrapper();
    }
  };

  /* ------------------------------ IMAGE PREVIEW ------------------------------ */
  showImagePreview = (imageUrl, thumbnailUrl) => {
    this.createImagePreviewWrapper();

    const wrapper = document.createElement("div");
    wrapper.className = "image-preview-wrapper";
    wrapper.setAttribute("data-image-url", imageUrl);

    const thumbnailImg = document.createElement("img");
    thumbnailImg.src = thumbnailUrl;
    thumbnailImg.className = "screenshot-preview image-thumbnail";
    wrapper.appendChild(thumbnailImg);

    wrapper.addEventListener("click", () => this.viewFullImage(imageUrl));
    this.preview_wrapper.appendChild(wrapper);
  };

  viewFullImage(imageUrl) {
    const modal = document.createElement("div");
    modal.className = "image-modal-overlay";

    const content = document.createElement("div");
    content.className = "image-modal-content";

    const close = document.createElement("button");
    close.className = "image-modal-close";
    close.innerHTML = "×";
    close.addEventListener("click", () => modal.remove());

    const img = document.createElement("img");
    img.src = imageUrl;
    img.className = "image-modal-viewer";

    content.append(close, img);
    modal.appendChild(content);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
  }

  /* ------------------------------ VIDEO PREVIEW ------------------------------ */
  showVideoPreview = (videoUrl, thumbnailUrl) => {
    this.createImagePreviewWrapper();

    const wrapper = document.createElement("div");
    wrapper.className = "video-preview-wrapper";
    wrapper.setAttribute("data-video-url", videoUrl);

    const thumbnailImg = document.createElement("img");
    thumbnailImg.src = thumbnailUrl;
    thumbnailImg.className = "screenshot-preview video-thumbnail";

    const playIcon = document.createElement("div");
    playIcon.className = "video-play-icon";
    playIcon.innerHTML = icons.play;

    wrapper.append(thumbnailImg, playIcon);

    wrapper.addEventListener("click", () => this.playFullVideo(videoUrl));
    this.preview_wrapper.appendChild(wrapper);
  };

  playFullVideo(videoUrl) {
    const modal = document.createElement("div");
    modal.className = "video-modal-overlay";

    const content = document.createElement("div");
    content.className = "video-modal-content";

    const close = document.createElement("button");
    close.className = "video-modal-close";
    close.innerHTML = "×";
    close.addEventListener("click", () => modal.remove());

    const video = document.createElement("video");
    video.src = videoUrl;
    video.controls = true;
    video.autoplay = true;
    video.className = "video-modal-player";

    content.append(close, video);
    modal.appendChild(content);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
  }

  /* ------------------------------ RECORDING TIMER ------------------------------ */
  showRecordingTimer(micMutedOnStart = false) {
    // Remove existing timer if any
    this.hideRecordingTimer();

    // Create timer wrapper
    const timerWrapper = document.createElement("div");
    timerWrapper.id = "recording-timer-wrapper";
    timerWrapper.className = "recording-timer-wrapper bug-element";

    // Create timer display
    const timerDisplay = document.createElement("div");
    timerDisplay.className = "recording-timer-display";

    const currentTime = document.createElement("span");
    currentTime.className = "recording-current-time";
    currentTime.textContent = "00:00";

    const separator = document.createElement("span");
    separator.className = "recording-separator";
    separator.textContent = " / ";

    const maxTime = document.createElement("span");
    maxTime.className = "recording-max-time";
    const maxMinutes = Math.floor(this.maxRecordingSeconds / 60);
    const maxSeconds = this.maxRecordingSeconds % 60;
    maxTime.textContent = `${String(maxMinutes).padStart(2, "0")}:${String(
      maxSeconds
    ).padStart(2, "0")}`;

    timerDisplay.appendChild(currentTime);
    timerDisplay.appendChild(separator);
    timerDisplay.appendChild(maxTime);

    // Create microphone toggle button with correct initial state
    const micBtn = document.createElement("button");
    micBtn.className = "recording-control-btn recording-mic-btn";

    // Get mic track if available
    const micTrack =
      this.mediaCapture.video._activeRecorder?.micStream?.getAudioTracks?.()[0] ||
      null;

    // Determine initial mic state:
    // Priority: micUnavailable → micMutedOnStart → real mic state
    let isMicMuted;
    if (!micTrack) {
      // No microphone available → treat as muted
      isMicMuted = true;
      console.log("part 1");
    } else if (typeof micMutedOnStart === "boolean") {
      // Apply initial user preference passed from startRecording.
      // The actual micTrack state was set in VideoRecorder.js.
      // REMOVED: micTrack.enabled = !micMutedOnStart;
      isMicMuted = micMutedOnStart;
      console.log("part 2");
    } else {
      // Fallback to real live enabled state
      isMicMuted = !micTrack.enabled;
      console.log("part 3");
    }

    console.table({ micMutedOnStart, isMicMuted });

    // Apply button UI
    micBtn.innerHTML = isMicMuted ? icons.microhpone_disabled : icons.microhone;
    micBtn.title = isMicMuted ? "Unmute microphone" : "Mute microphone";
    micBtn.classList.toggle("muted", isMicMuted);

    // Microphone toggle functionality
    micBtn.addEventListener("click", () => {
      const isMuted = this.mediaCapture.toggleMicrophone();

      micBtn.innerHTML = isMuted ? icons.microhpone_disabled : icons.microhone;
      micBtn.title = isMuted ? "Unmute microphone" : "Mute microphone";
      micBtn.classList.toggle("muted", isMuted);
    });

    // Create pause button
    const pauseBtn = document.createElement("button");
    pauseBtn.className = "recording-control-btn recording-pause-btn";
    pauseBtn.innerHTML = icons.pause;
    pauseBtn.title = "Pause recording";

    // Create resume button (hidden initially)
    const resumeBtn = document.createElement("button");
    resumeBtn.className = "recording-control-btn recording-resume-btn";
    resumeBtn.innerHTML = icons.play;
    resumeBtn.style.display = "none";
    resumeBtn.title = "Resume recording";

    // Create stop button
    const stopBtn = document.createElement("button");
    stopBtn.className = "recording-control-btn recording-stop-btn";
    stopBtn.innerHTML = icons.stop;
    stopBtn.title = "Stop recording";

    // Pause/Resume functionality
    let isPaused = false;
    let pausedTime = 0;

    pauseBtn.addEventListener("click", () => {
      this.mediaCapture.pauseRecording();
      isPaused = true;
      pauseBtn.style.display = "none";
      resumeBtn.style.display = "flex";
      timerDisplay.style.opacity = "0.6";
    });

    resumeBtn.addEventListener("click", () => {
      this.mediaCapture.resumeRecording();
      isPaused = false;
      resumeBtn.style.display = "none";
      pauseBtn.style.display = "flex";
      timerDisplay.style.opacity = "1";
    });

    stopBtn.addEventListener("click", () => {
      this.mediaCapture.stopRecording();
    });

    // Create recording indicator (red dot)
    const recordingDot = document.createElement("div");
    recordingDot.className = "recording-dot";

    timerWrapper.appendChild(recordingDot);
    timerWrapper.appendChild(timerDisplay);
    timerWrapper.appendChild(micBtn);
    timerWrapper.appendChild(pauseBtn);
    timerWrapper.appendChild(resumeBtn);
    timerWrapper.appendChild(stopBtn);

    document.body.appendChild(timerWrapper);

    // Start timer
    const startTime = Date.now();
    this._recordingTimerInterval = setInterval(() => {
      if (isPaused) {
        pausedTime += 1000;
        return;
      }

      const elapsed = Math.floor((Date.now() - startTime - pausedTime) / 1000);

      // Check if max time reached
      if (elapsed >= this.maxRecordingSeconds) {
        this.mediaCapture.stopRecording();
        return;
      }

      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      currentTime.textContent = `${String(minutes).padStart(2, "0")}:${String(
        seconds
      ).padStart(2, "0")}`;

      // Change color when approaching limit (last 30 seconds)
      if (this.maxRecordingSeconds - elapsed <= 30) {
        currentTime.style.color = "#ff4444";
        timerDisplay.style.animation = "timer-warning 1s ease-in-out infinite";
      }
    }, 1000);
  }

  hideRecordingTimer() {
    if (this._recordingTimerInterval) {
      clearInterval(this._recordingTimerInterval);
      this._recordingTimerInterval = null;
    }
    const timer = document.getElementById("recording-timer-wrapper");
    if (timer) timer.remove();
  }

  /* ------------------------------ UI HELPERS ------------------------------ */
  hideImagePreviewWrapper = () => {
    document
      .querySelectorAll(".bug-element")
      .forEach((el) => el.classList.add("hide_el"));
    return Promise.resolve();
  };

  showImagePreviewWrapper = () => {
    document
      .querySelectorAll(".bug-element")
      .forEach((el) => el.classList.remove("hide_el"));
  };

  createImagePreviewWrapper = () => {
    if (this.preview_wrapper) return;
    const wrapper = document.createElement("div");
    wrapper.id = "bugscribe-preview-wrapper";
    wrapper.className = "bug-element thin-scroll";
    document.body.appendChild(wrapper);
    this.preview_wrapper = wrapper;
  };

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
