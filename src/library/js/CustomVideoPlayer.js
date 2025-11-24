import { icons } from "./icons.js";

export default class CustomVideoPlayer {
  constructor(videoUrl, options = {}) {
    this.videoUrl = videoUrl;
    this.options = {
      autoplay: options.autoplay || false,
      showDownload: options.showDownload !== false,
      showClose: options.showClose !== false,
      onClose: options.onClose || null,
      knownDuration: options.knownDuration || null, // Accept known duration from recording
      ...options,
    };

    this.modal = null;
    this.video = null;
    this.isPlaying = false;
    this.isMuted = false;
    this.isSeeking = false;
    this.progressAnimationId = null;
    this.estimatedDuration = options.knownDuration || null; // Use known duration if provided
    this.maxTimeObserved = 0;
  }

  open() {
    this.modal = document.createElement("div");
    this.modal.className = "custom-video-modal-overlay";

    const content = document.createElement("div");
    content.className = "custom-video-modal-content";

    this.video = document.createElement("video");
    this.video.src = this.videoUrl;
    this.video.className = "custom-video-player";
    this.video.preload = "auto"; // Changed from "metadata" to "auto" for faster loading
    this.video.controls = false;

    if (this.options.autoplay) {
      this.video.autoplay = true;
    }

    const controlsWrapper = document.createElement("div");
    controlsWrapper.className = "custom-video-controls-wrapper";

    const controls = this._createControls();
    controlsWrapper.appendChild(controls);

    content.append(this.video, controlsWrapper);
    this.modal.appendChild(content);

    // Add to DOM FIRST so video can start loading
    document.body.appendChild(this.modal);

    // NOW attach listeners after video is in DOM
    this._attachControlListeners();

    // Show controls initially
    controlsWrapper.classList.add("show");

    // Auto-hide logic
    this._setupControlsAutoHide(content, controlsWrapper);

    // Keyboard controls
    document.addEventListener("keydown", this._handleKeyboard);
  }

  _createControls() {
    const controls = document.createElement("div");
    controls.className = "custom-video-controls";

    const progressRow = document.createElement("div");
    progressRow.className = "video-progress-row";

    this.progressBar = document.createElement("div");
    this.progressBar.className = "video-progress-bar";
    this.progressFilled = document.createElement("div");
    this.progressFilled.className = "video-progress-filled";
    this.progressBuffer = document.createElement("div");
    this.progressBuffer.className = "video-progress-buffer";
    this.progressHandle = document.createElement("div");
    this.progressHandle.className = "video-progress-handle";

    this.progressBar.append(
      this.progressBuffer,
      this.progressFilled,
      this.progressHandle
    );
    progressRow.appendChild(this.progressBar);

    // Bottom Controls
    const bottomRow = document.createElement("div");
    bottomRow.className = "video-bottom-controls";

    const leftControls = document.createElement("div");
    leftControls.className = "video-controls-left";

    this.playPauseBtn = document.createElement("button");
    this.playPauseBtn.className = "video-control-btn";
    this.playPauseBtn.innerHTML = icons.play;

    this.timeDisplay = document.createElement("span");
    this.timeDisplay.className = "video-time";
    this.timeDisplay.textContent = "0:00 / 0:00";

    leftControls.append(this.playPauseBtn, this.timeDisplay);

    const rightControls = document.createElement("div");
    rightControls.className = "video-controls-right";

    // Volume Controls
    const volumeControl = document.createElement("div");
    volumeControl.className = "video-volume-control";

    this.volumeBtn = document.createElement("button");
    this.volumeBtn.className = "video-control-btn";
    this.volumeBtn.innerHTML = icons.volume;

    this.volumeSlider = document.createElement("input");
    this.volumeSlider.type = "range";
    this.volumeSlider.className = "video-volume-slider";
    this.volumeSlider.min = "0";
    this.volumeSlider.max = "100";
    this.volumeSlider.value = "100";

    volumeControl.append(this.volumeBtn, this.volumeSlider);

    if (this.options.showDownload) {
      this.downloadBtn = document.createElement("button");
      this.downloadBtn.className = "video-control-btn";
      this.downloadBtn.innerHTML = icons.download;
    }

    this.fullscreenBtn = document.createElement("button");
    this.fullscreenBtn.className = "video-control-btn";
    this.fullscreenBtn.innerHTML = icons.fullscreen;

    if (this.options.showClose) {
      this.closeBtn = document.createElement("button");
      this.closeBtn.className = "video-control-btn video-close-btn";
      this.closeBtn.innerHTML = "×";
    }

    rightControls.append(volumeControl);
    if (this.options.showDownload) rightControls.append(this.downloadBtn);
    rightControls.append(this.fullscreenBtn);
    if (this.options.showClose) rightControls.append(this.closeBtn);

    bottomRow.append(leftControls, rightControls);
    controls.append(progressRow, bottomRow);

    return controls;
  }

  _startProgressSync() {
    const sync = () => {
      // Always update progress if not seeking, don't wait for readyState
      if (!this.isSeeking) {
        this._updateProgress();
      }
      if (this.modal && this.video) {
        this.progressAnimationId = requestAnimationFrame(sync);
      }
    };
    this.progressAnimationId = requestAnimationFrame(sync);
  }

  _attachControlListeners() {
    this.playPauseBtn.addEventListener("click", () => this.togglePlayPause());
    this.video.addEventListener("click", () => this.togglePlayPause());

    // Use progress event for buffer updates only
    this.video.addEventListener("progress", () => this._updateBuffer());

    // Update on these events to ensure immediate UI feedback
    this.video.addEventListener("loadedmetadata", () => {
      this._updateProgress();
      this._updateBuffer();
    });

    this.video.addEventListener("loadeddata", () => {
      this._updateProgress();
    });

    this.video.addEventListener("canplay", () => {
      this._updateProgress();
    });

    // SEEK
    this.progressBar.addEventListener("mousedown", (e) => {
      this.isSeeking = true;
      this._seek(e);

      const move = (e) => this.isSeeking && this._seek(e);
      const up = () => {
        this.isSeeking = false;
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
      };

      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    });

    this.volumeBtn.addEventListener("click", () => this.toggleMute());
    this.volumeSlider.addEventListener("input", (e) => {
      this.video.volume = e.target.value / 100;
      this._updateVolumeIcon();
    });

    if (this.downloadBtn) {
      this.downloadBtn.addEventListener("click", () => this._download());
    }

    this.fullscreenBtn.addEventListener("click", () => this.toggleFullscreen());
    if (this.closeBtn)
      this.closeBtn.addEventListener("click", () => this.close());

    this.video.addEventListener("ended", () => {
      this.isPlaying = false;
      this.playPauseBtn.innerHTML = icons.play;

      // Capture final duration if it was Infinity
      if (!isFinite(this.video.duration) && this.video.currentTime > 0) {
        this.estimatedDuration = this.video.currentTime;
        this._updateProgress();
      }
    });

    this.video.addEventListener("play", () => {
      this.isPlaying = true;
      this._updateProgress(); // Force immediate update on play
    });

    this.video.addEventListener("pause", () => {
      this.isPlaying = false;
    });

    // Force initial update
    this._updateProgress();

    // Start the progress sync loop after all listeners are attached
    this._startProgressSync();
  }

  _updateProgress() {
    let duration = this.video.duration;
    const currentTime = this.video.currentTime || 0;

    // Track maximum time observed for duration estimation
    if (currentTime > this.maxTimeObserved) {
      this.maxTimeObserved = currentTime;
    }

    // Use known duration if video.duration is not finite
    if (!isFinite(duration)) {
      if (this.estimatedDuration) {
        duration = this.estimatedDuration;
      } else if (this.maxTimeObserved > 0) {
        this.estimatedDuration = Math.max(
          this.estimatedDuration || 0,
          this.maxTimeObserved + 10
        );
        duration = this.estimatedDuration;
      } else {
        this.timeDisplay.textContent = `${this._formatTime(
          currentTime
        )} / --:--`;
        this.progressFilled.style.width = "0%";
        this.progressHandle.style.left = "0";
        return;
      }
    }

    // Handle NaN or zero duration
    if (!duration || isNaN(duration) || duration <= 0) {
      this.timeDisplay.textContent = `${this._formatTime(currentTime)} / --:--`;
      this.progressFilled.style.width = "0%";
      this.progressHandle.style.left = "0";
      return;
    }

    const percent = (currentTime / duration) * 100;
    const clampedPercent = Math.max(0, Math.min(100, percent));

    // Update both filled bar and handle to exact same position
    this.progressFilled.style.width = `${clampedPercent}%`;
    this.progressHandle.style.left = `${clampedPercent}%`;

    const durationText = this._formatTime(duration);
    this.timeDisplay.textContent = `${this._formatTime(
      currentTime
    )} / ${durationText}`;
  }

  _seek(e) {
    let duration = this.video.duration;

    // Use estimated duration if actual is Infinity
    if (!isFinite(duration) && this.estimatedDuration) {
      duration = this.estimatedDuration;
    }

    if (!duration || isNaN(duration) || !isFinite(duration) || duration <= 0)
      return;

    const rect = this.progressBar.getBoundingClientRect();
    const percent = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width)
    );
    const newTime = percent * duration;

    // Double-check the calculated time is valid before setting
    if (isFinite(newTime) && newTime >= 0) {
      this.video.currentTime = newTime;

      // Update UI immediately for responsive feedback
      const percentValue = percent * 100;
      this.progressFilled.style.width = `${percentValue}%`;
      this.progressHandle.style.left = `${percentValue}%`;
    }
  }

  _updateBuffer() {
    if (!this.video.buffered.length || !this.video.duration) return;
    const end = this.video.buffered.end(this.video.buffered.length - 1);
    this.progressBuffer.style.width = `${(end / this.video.duration) * 100}%`;
  }

  togglePlayPause() {
    if (this.video.paused) {
      this.video.play();
      this.playPauseBtn.innerHTML = icons.pause;
    } else {
      this.video.pause();
      this.playPauseBtn.innerHTML = icons.play;
    }
  }

  toggleMute() {
    this.video.muted = !this.video.muted;
    this._updateVolumeIcon();
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.modal.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  _download() {
    const link = document.createElement("a");
    link.href = this.videoUrl;
    link.download = `video_${Date.now()}.webm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  _formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  _updateVolumeIcon() {
    if (this.video.muted || this.video.volume <= 0.05) {
      this.volumeBtn.innerHTML = icons.muted;
    } else if (this.video.volume < 0.5) {
      this.volumeBtn.innerHTML = icons.volumeLow;
    } else {
      this.volumeBtn.innerHTML = icons.volume;
    }
  }

  _handleKeyboard = (e) => {
    if (!this.modal) return;

    switch (e.key) {
      case " ":
      case "k":
        e.preventDefault();
        this.togglePlayPause();
        break;
      case "m":
        this.toggleMute();
        break;
      case "Escape":
        this.close();
        break;
      case "ArrowLeft":
        if (this.video.duration && isFinite(this.video.duration)) {
          this.video.currentTime = Math.max(0, this.video.currentTime - 5);
        }
        break;
      case "ArrowRight":
        if (this.video.duration && isFinite(this.video.duration)) {
          this.video.currentTime = Math.min(
            this.video.duration,
            this.video.currentTime + 5
          );
        }
        break;
    }
  };

  _setupControlsAutoHide(content, controlsWrapper) {
    let hideTimeout;

    const showControls = () => {
      controlsWrapper.classList.add("show");
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        if (this.isPlaying && !this.isSeeking) {
          controlsWrapper.classList.remove("show");
        }
      }, 3000);
    };

    content.addEventListener("mousemove", showControls);

    this.video.addEventListener("play", showControls);
    this.video.addEventListener("pause", () =>
      controlsWrapper.classList.add("show")
    );
  }

  close() {
    this.video.pause();

    // Cancel animation frame
    if (this.progressAnimationId) {
      cancelAnimationFrame(this.progressAnimationId);
      this.progressAnimationId = null;
    }

    document.removeEventListener("keydown", this._handleKeyboard);

    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }

    if (this.options.onClose) this.options.onClose();
  }

  destroy() {
    this.close();
  }
}
