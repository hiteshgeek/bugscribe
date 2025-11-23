import BugButtonWrapper from "./BugButtonWrapper.js";
import MediaCapture from "./MediaCapture.js";
import ConsoleCapture from "./ConsoleCapture.js";
import { icons } from "./icons.js";

export default class Bugscribe {
  constructor(options = {}) {
    this.maxRecordingSeconds = 10;
    this._options = options;
    this.captureMicrophone = true;
    this._screenshotPreviews = [];
    this.bugButtonWrapper = new BugButtonWrapper(options.button || {});

    this.mediaCapture = new MediaCapture();

    this.captureUsingMediaCapture = this.captureUsingMediaCapture.bind(this);
    this.captureFullScreen = this.captureFullScreen.bind(this);
    this.captureVisibleScreen = this.captureVisibleScreen.bind(this);
    this.captureSelectedArea = this.captureSelectedArea.bind(this);
    this.startRecording = this.startRecording.bind(this);

    this.hideImagePreviewWrapper = this.hideImagePreviewWrapper.bind(this);
    this.showImagePreviewWrapper = this.showImagePreviewWrapper.bind(this);

    this.initMediaEvents();
    this.setHotKeys();

    this.mediaCapture.onRecordingStarted = () => {
      this.showRecordingTimer();
      console.log(
        "Recording started. Stop it using the timer button or browser's stop sharing."
      );
    };
  }

  initMediaEvents() {
    //image capture events
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

    //video record events

    this.bugButtonWrapper.recordBtn.addEventListener(
      "click",
      this.startRecording
    );
  }

  async captureFullScreen() {
    try {
      await this.hideImagePreviewWrapper();
      const imgURL = await this.mediaCapture.captureFullScreen();
      if (!imgURL) return;

      const thumbnail = await this.mediaCapture.createImageThumbnail(imgURL);

      this._screenshotPreviews.push({
        type: "image",
        url: imgURL,
        thumbnail: thumbnail,
        timestamp: Date.now(),
      });

      this.showImagePreview(imgURL, thumbnail);
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

      const thumbnail = await this.mediaCapture.createImageThumbnail(imgURL);

      this._screenshotPreviews.push({
        type: "image",
        url: imgURL,
        thumbnail: thumbnail,
        timestamp: Date.now(),
      });

      this.showImagePreview(imgURL, thumbnail);
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

      const thumbnail = await this.mediaCapture.createImageThumbnail(imgURL);

      this._screenshotPreviews.push({
        type: "image",
        url: imgURL,
        thumbnail: thumbnail,
        timestamp: Date.now(),
      });

      this.showImagePreview(imgURL, thumbnail);
      this.showImagePreviewWrapper();
    } catch (err) {
      console.error("Error capturing screenshot:", err);
    }
  }

  async captureUsingMediaCapture() {
    try {
      const imgURL = await this.mediaCapture.captureAny();
      if (!imgURL) return;

      const thumbnail = await this.mediaCapture.createImageThumbnail(imgURL);

      this._screenshotPreviews.push({
        type: "image",
        url: imgURL,
        thumbnail: thumbnail,
        timestamp: Date.now(),
      });

      this.showImagePreview(imgURL, thumbnail);
    } catch (err) {
      console.error("Error capturing using MediaCapture:", err);
    }
  }

  async startRecording() {
    try {
      // Hide previews while setting up recording
      await this.hideImagePreviewWrapper();

      console.log("Starting recording...");

      // Start the actual recording (this shows the browser's picker)
      const recordingPromise = this.mediaCapture.startRecording(
        this.captureMicrophone
      );

      // Wait for recording to finish (timer will be shown by MediaCapture)
      const result = await recordingPromise;

      // Hide timer UI
      this.hideRecordingTimer();

      if (!result || !result.url) {
        console.log("Recording was cancelled or failed.");
        this.showImagePreviewWrapper();
        return;
      }

      console.log("Recording completed:", {
        duration: `${(result.duration / 1000).toFixed(1)}s`,
        size: `${(result.size / 1024 / 1024).toFixed(2)}MB`,
      });

      // Create video thumbnail
      const thumbnail = await this.mediaCapture.createVideoThumbnail(
        result.url
      );

      // Store in screenshots array with metadata
      this._screenshotPreviews.push({
        type: "video",
        url: result.url,
        thumbnail: thumbnail,
        blob: result.blob,
        duration: result.duration,
        size: result.size,
        timestamp: Date.now(),
      });

      // Show thumbnail preview
      this.showVideoPreview(result.url, thumbnail);

      // Show the preview wrapper
      this.showImagePreviewWrapper();
    } catch (err) {
      console.error("Error during screen recording:", err.message);
      this.hideRecordingTimer();
      this.showImagePreviewWrapper();
    }
  }

  showImagePreview(imageUrl, thumbnailUrl) {
    this.createImagePreviewWrapper();

    const imageWrapper = document.createElement("div");
    imageWrapper.className = "image-preview-wrapper";
    imageWrapper.setAttribute("data-image-url", imageUrl);

    // Show thumbnail
    const thumbnailImg = document.createElement("img");
    thumbnailImg.src = thumbnailUrl;
    thumbnailImg.className = "screenshot-preview image-thumbnail";

    imageWrapper.appendChild(thumbnailImg);

    // Click to view full image
    imageWrapper.addEventListener("click", () => {
      this.viewFullImage(imageUrl);
    });

    this.preview_wrapper.appendChild(imageWrapper);
  }

  // View full size image in modal
  viewFullImage(imageUrl) {
    // Create modal overlay
    const modal = document.createElement("div");
    modal.className = "image-modal-overlay";

    const modalContent = document.createElement("div");
    modalContent.className = "image-modal-content";

    const closeBtn = document.createElement("button");
    closeBtn.className = "image-modal-close";
    closeBtn.innerHTML = "×";
    closeBtn.addEventListener("click", () => modal.remove());

    const img = document.createElement("img");
    img.src = imageUrl;
    img.className = "image-modal-viewer";

    modalContent.appendChild(closeBtn);
    modalContent.appendChild(img);
    modal.appendChild(modalContent);

    // Close on outside click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
  }

  showVideoPreview(videoUrl, thumbnailUrl) {
    this.createImagePreviewWrapper();

    const videoWrapper = document.createElement("div");
    videoWrapper.className = "video-preview-wrapper";
    videoWrapper.setAttribute("data-video-url", videoUrl);

    // Show thumbnail with play icon overlay
    const thumbnailImg = document.createElement("img");
    thumbnailImg.src = thumbnailUrl;
    thumbnailImg.className = "screenshot-preview video-thumbnail";

    const playIcon = document.createElement("div");
    playIcon.className = "video-play-icon";
    playIcon.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="48" height="48">
      <path fill="currentColor" d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80L0 432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"/>
    </svg>
  `;

    videoWrapper.appendChild(thumbnailImg);
    videoWrapper.appendChild(playIcon);

    // Click to play full video
    videoWrapper.addEventListener("click", () => {
      this.playFullVideo(videoUrl);
    });

    this.preview_wrapper.appendChild(videoWrapper);
  }

  playFullVideo(videoUrl) {
    // Create modal overlay
    const modal = document.createElement("div");
    modal.className = "video-modal-overlay";

    const modalContent = document.createElement("div");
    modalContent.className = "video-modal-content";

    const closeBtn = document.createElement("button");
    closeBtn.className = "video-modal-close";
    closeBtn.innerHTML = "×";
    closeBtn.addEventListener("click", () => modal.remove());

    const video = document.createElement("video");
    video.src = videoUrl;
    video.controls = true;
    video.autoplay = true;
    video.className = "video-modal-player";

    modalContent.appendChild(closeBtn);
    modalContent.appendChild(video);
    modal.appendChild(modalContent);

    // Close on outside click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
  }

  showRecordingTimer() {
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
    // Clear interval
    if (this._recordingTimerInterval) {
      clearInterval(this._recordingTimerInterval);
      this._recordingTimerInterval = null;
    }

    // Remove timer element
    const timer = document.getElementById("recording-timer-wrapper");
    if (timer) {
      timer.remove();
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
            this.startRecording();
            break;
          case "Digit9":
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
