import Tooltip from "./Tooltip.js";
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
    this.timeDisplayMode = "elapsed"; // "elapsed" or "remaining"
    this.playbackRate = 1; // Current playback speed
    this.speedMenuOpen = false; // Track speed menu state
    this.settingsMenuOpen = false; // Track settings menu state
  }

  _createShortcutsModal() {
    const modal = document.createElement("div");
    modal.className = "video-shortcuts-modal";

    const content = document.createElement("div");
    content.className = "video-shortcuts-content";

    const header = document.createElement("div");
    header.className = "video-shortcuts-header";

    const title = document.createElement("h3");
    title.innerHTML = `<span class="header-icon">${icons.keyboard}</span> Keyboard Shortcuts`;
    header.appendChild(title);

    const closeBtn = document.createElement("button");
    closeBtn.className = "video-shortcuts-close";
    closeBtn.innerHTML = icons.cancel;
    closeBtn.onclick = () => modal.remove();
    header.appendChild(closeBtn);

    const shortcuts = [
      { key: "Space / K", action: "Play/Pause" },
      { key: "J", action: "Backward 10 seconds" },
      { key: "L", action: "Forward 10 seconds" },
      { key: "← Arrow", action: "Backward 5 seconds" },
      { key: "→ Arrow", action: "Forward 5 seconds" },
      { key: "M", action: "Mute/Unmute" },
      { key: "F", action: "Toggle Fullscreen" },
      { key: "I", action: "Picture in Picture" },
      { key: "Esc", action: "Exit Fullscreen/PiP or Close" },
      { key: "Click Timer", action: "Toggle Remaining/Elapsed Time" },
    ];

    const list = document.createElement("div");
    list.className = "video-shortcuts-list";

    shortcuts.forEach(({ key, action }) => {
      const item = document.createElement("div");
      item.className = "video-shortcuts-item";
      item.innerHTML = `
        <span class="shortcut-key">${key}</span>
        <span class="shortcut-action">${action}</span>
      `;
      list.appendChild(item);
    });

    content.append(header, list);
    modal.appendChild(content);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });

    return modal;
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
    this.video.controlsList = "nodownload noplaybackrate"; // Remove download/playback rate from native controls

    // Disable context menu on video
    this.video.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      return false;
    });

    if (this.options.autoplay) {
      this.video.autoplay = true;
    }

    const controlsWrapper = document.createElement("div");
    controlsWrapper.className = "custom-video-controls-wrapper";

    const controls = this._createControls();
    controlsWrapper.appendChild(controls);

    // Create center play/pause icon overlay
    this.centerIcon = document.createElement("div");
    this.centerIcon.className = "video-center-icon";
    this.centerIcon.innerHTML = icons.play;

    content.append(this.video, this.centerIcon, controlsWrapper);
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

    // Bottom Controls Row
    const bottomRow = document.createElement("div");
    bottomRow.className = "video-bottom-controls";

    // LEFT SIDE: Play/Pause, Volume, Time
    const leftControls = document.createElement("div");
    leftControls.className = "video-controls-left";

    // Play/Pause Button
    this.playPauseBtn = document.createElement("button");
    this.playPauseBtn.className = "video-control-btn";
    this.playPauseBtn.innerHTML = icons.play;
    this.playPauseBtn.setAttribute("data-tooltip-text", "Play");
    this.playPauseBtn.setAttribute("data-tooltip-shortcut", "K");

    // Backward 10 seconds
    this.backward10Btn = document.createElement("button");
    this.backward10Btn.className = "video-control-btn";
    this.backward10Btn.innerHTML = icons.backward10;
    this.backward10Btn.setAttribute("data-tooltip-text", "Backward 10s");
    this.backward10Btn.setAttribute("data-tooltip-shortcut", "J");

    // Forward 10 seconds
    this.forward10Btn = document.createElement("button");
    this.forward10Btn.className = "video-control-btn";
    this.forward10Btn.innerHTML = icons.forward10;
    this.forward10Btn.setAttribute("data-tooltip-text", "Forward 10s");
    this.forward10Btn.setAttribute("data-tooltip-shortcut", "L");

    // Volume Controls
    const volumeControl = document.createElement("div");
    volumeControl.className = "video-volume-control";

    this.volumeBtn = document.createElement("button");
    this.volumeBtn.className = "video-control-btn";
    this.volumeBtn.innerHTML = icons.volume;
    this.volumeBtn.setAttribute("data-tooltip-text", "Mute");
    this.volumeBtn.setAttribute("data-tooltip-shortcut", "M");

    this.volumeSlider = document.createElement("input");
    this.volumeSlider.type = "range";
    this.volumeSlider.className = "video-volume-slider";
    this.volumeSlider.min = "0";
    this.volumeSlider.max = "100";
    this.volumeSlider.value = "100";
    this.volumeSlider.setAttribute("data-tooltip-text", "Volume");

    volumeControl.append(this.volumeBtn, this.volumeSlider);

    // Time Display (clickable to toggle mode)
    this.timeDisplay = document.createElement("span");
    this.timeDisplay.className = "video-time";
    this.timeDisplay.textContent = "0:00 / 0:00";
    this.timeDisplay.setAttribute("data-tooltip-text", "Toggle time display");
    this.timeDisplay.style.cursor = "pointer";

    leftControls.append(
      this.playPauseBtn,
      this.backward10Btn,
      this.forward10Btn,
      volumeControl,
      this.timeDisplay
    );

    // RIGHT SIDE: Speed, Download, PiP, Fullscreen, Close
    const rightControls = document.createElement("div");
    rightControls.className = "video-controls-right";

    // Playback Speed Control
    const speedControl = document.createElement("div");
    speedControl.className = "video-speed-control";

    this.speedBtn = document.createElement("button");
    this.speedBtn.className = "video-control-btn video-speed-btn";
    this.speedBtn.innerHTML = icons.speed;
    this.speedBtn.setAttribute("data-tooltip-text", "Playback speed");

    // Speed menu (dropup)
    this.speedMenu = document.createElement("div");
    this.speedMenu.className = "video-speed-menu";

    const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    speeds.forEach((speed) => {
      const speedOption = document.createElement("div");
      speedOption.className = "video-speed-option";
      if (speed === 1) speedOption.classList.add("active");
      speedOption.textContent = speed === 1 ? "Normal" : `${speed}x`;
      speedOption.dataset.speed = speed;
      this.speedMenu.appendChild(speedOption);
    });

    speedControl.append(this.speedBtn, this.speedMenu);
    rightControls.append(speedControl);

    // Settings Control
    const settingsControl = document.createElement("div");
    settingsControl.className = "video-settings-control";

    this.settingsBtn = document.createElement("button");
    this.settingsBtn.className = "video-control-btn video-settings-btn";
    this.settingsBtn.innerHTML = icons.settings;
    this.settingsBtn.setAttribute("data-tooltip-text", "Settings");

    // Settings menu (dropup)
    this.settingsMenu = document.createElement("div");
    this.settingsMenu.className = "video-settings-menu";

    // Keyboard shortcuts option
    const shortcutsOption = document.createElement("div");
    shortcutsOption.className = "video-settings-option";
    shortcutsOption.innerHTML = `<span class="settings-icon">${icons.keyboard}</span> Keyboard Shortcuts`;
    this.settingsMenu.appendChild(shortcutsOption);

    settingsControl.append(this.settingsBtn, this.settingsMenu);
    rightControls.append(settingsControl);

    if (this.options.showDownload) {
      this.downloadBtn = document.createElement("button");
      this.downloadBtn.className = "video-control-btn";
      this.downloadBtn.innerHTML = icons.download;
      this.downloadBtn.setAttribute("data-tooltip-text", "Download");
      rightControls.append(this.downloadBtn);
    }

    // Picture-in-Picture Button
    this.pipBtn = document.createElement("button");
    this.pipBtn.className = "video-control-btn";
    this.pipBtn.innerHTML = icons.pip;
    this.pipBtn.setAttribute("data-tooltip-text", "Picture in Picture");
    this.pipBtn.setAttribute("data-tooltip-shortcut", "I");

    this.fullscreenBtn = document.createElement("button");
    this.fullscreenBtn.className = "video-control-btn";
    this.fullscreenBtn.innerHTML = icons.fullscreen;
    this.fullscreenBtn.setAttribute("data-tooltip-text", "Fullscreen");
    this.fullscreenBtn.setAttribute("data-tooltip-shortcut", "F");

    rightControls.append(this.pipBtn, this.fullscreenBtn);

    if (this.options.showClose) {
      this.closeBtn = document.createElement("button");
      this.closeBtn.className = "video-control-btn video-close-btn";
      this.closeBtn.innerHTML = "×";
      this.closeBtn.setAttribute("data-tooltip-text", "Close");
      this.closeBtn.setAttribute("data-tooltip-shortcut", "Esc");
      rightControls.append(this.closeBtn);
    }

    bottomRow.append(leftControls, rightControls);
    controls.append(progressRow, bottomRow);

    // Initialize tooltips for all controls
    setTimeout(() => {
      const allControls = controls.querySelectorAll("[data-tooltip-text]");
      allControls.forEach((control) => Tooltip.init(control));
    }, 0);

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

    // Backward/Forward 10 seconds - use requestAnimationFrame to ensure immediate visual feedback
    this.backward10Btn.addEventListener("click", () => {
      this.skip(-10);
      requestAnimationFrame(() => this._updateProgress());
    });
    this.forward10Btn.addEventListener("click", () => {
      this.skip(10);
      requestAnimationFrame(() => this._updateProgress());
    });

    // Time display toggle
    this.timeDisplay.addEventListener("click", () => this.toggleTimeDisplay());

    // Speed control
    this.speedBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleSpeedMenu();
    });

    // Speed menu options
    this.speedMenu.querySelectorAll(".video-speed-option").forEach((option) => {
      option.addEventListener("click", (e) => {
        e.stopPropagation();
        const speed = parseFloat(option.dataset.speed);
        this.setPlaybackSpeed(speed);
      });
    });

    // Settings control
    this.settingsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleSettingsMenu();
    });

    // Settings menu - Keyboard shortcuts
    this.settingsMenu
      .querySelector(".video-settings-option")
      .addEventListener("click", (e) => {
        e.stopPropagation();
        this.showKeyboardShortcuts();
      });

    // Close menus when clicking outside
    document.addEventListener("click", (e) => {
      if (this.speedMenuOpen && !e.target.closest(".video-speed-control")) {
        this.closeSpeedMenu();
      }
      if (
        this.settingsMenuOpen &&
        !e.target.closest(".video-settings-control")
      ) {
        this.closeSettingsMenu();
      }
    });

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
      const volume = e.target.value / 100;
      this.video.volume = volume;
      this.volumeSlider.style.setProperty(
        "--volume-level",
        `${e.target.value}%`
      );
      this._updateVolumeIcon();
    });

    if (this.downloadBtn) {
      this.downloadBtn.addEventListener("click", () => this._download());
    }

    this.pipBtn.addEventListener("click", () => this.togglePictureInPicture());
    this.fullscreenBtn.addEventListener("click", () => this.toggleFullscreen());

    // Listen for fullscreen changes (including ESC key)
    document.addEventListener("fullscreenchange", () => {
      if (document.fullscreenElement) {
        this.fullscreenBtn.innerHTML = icons.fullscreen_off;
        this.fullscreenBtn.setAttribute("data-tooltip-text", "Exit fullscreen");
      } else {
        this.fullscreenBtn.innerHTML = icons.fullscreen;
        this.fullscreenBtn.setAttribute("data-tooltip-text", "Fullscreen");
      }
    });
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

    // Update time display based on mode
    if (this.timeDisplayMode === "remaining") {
      const remaining = duration - currentTime;
      this.timeDisplay.textContent = `-${this._formatTime(
        remaining
      )} / ${this._formatTime(duration)}`;
    } else {
      const durationText = this._formatTime(duration);
      this.timeDisplay.textContent = `${this._formatTime(
        currentTime
      )} / ${durationText}`;
    }
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
      this.playPauseBtn.setAttribute("data-tooltip-text", "Pause");
      this._showCenterIcon(icons.play);
    } else {
      this.video.pause();
      this.playPauseBtn.innerHTML = icons.play;
      this.playPauseBtn.setAttribute("data-tooltip-text", "Play");
      this._showCenterIcon(icons.pause);
    }
  }

  _showCenterIcon(iconHTML) {
    if (!this.centerIcon) return;

    this.centerIcon.innerHTML = iconHTML;
    this.centerIcon.classList.remove("hide");
    this.centerIcon.classList.add("show");

    // Clear any existing timeout
    if (this.centerIconTimeout) {
      clearTimeout(this.centerIconTimeout);
    }

    // Hide after 500ms
    this.centerIconTimeout = setTimeout(() => {
      this.centerIcon.classList.remove("show");
      this.centerIcon.classList.add("hide");
    }, 500);
  }

  toggleMute() {
    this.video.muted = !this.video.muted;
    this._updateVolumeIcon();
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.modal.requestFullscreen();
      this.fullscreenBtn.innerHTML = icons.fullscreen_off;
      this.fullscreenBtn.setAttribute("data-tooltip-text", "Exit fullscreen");
    } else {
      document.exitFullscreen();
      this.fullscreenBtn.innerHTML = icons.fullscreen;
      this.fullscreenBtn.setAttribute("data-tooltip-text", "Fullscreen");
    }
  }

  togglePictureInPicture() {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
    } else if (document.pictureInPictureEnabled) {
      this.video.requestPictureInPicture().catch((err) => {
        console.error("Failed to enter Picture-in-Picture:", err);
      });
    }
  }

  skip(seconds) {
    let duration = this.video.duration;

    // Use estimated duration if video.duration not ready
    if (!isFinite(duration) && this.estimatedDuration) {
      duration = this.estimatedDuration;
    }

    // Always allow skip even if duration not fully loaded
    const currentTime = this.video.currentTime || 0;
    const newTime = currentTime + seconds;

    // Set new time - clamp only if we have valid duration
    if (duration && isFinite(duration)) {
      this.video.currentTime = Math.max(0, Math.min(duration, newTime));
    } else {
      // No duration yet, just add the seconds (browsers will clamp automatically)
      this.video.currentTime = Math.max(0, newTime);
    }

    // Force immediate UI update
    requestAnimationFrame(() => {
      this._updateProgress();
    });
  }

  toggleTimeDisplay() {
    this.timeDisplayMode =
      this.timeDisplayMode === "elapsed" ? "remaining" : "elapsed";
    this._updateProgress(); // Force immediate update
  }

  toggleSpeedMenu() {
    this.speedMenuOpen = !this.speedMenuOpen;
    if (this.speedMenuOpen) {
      this.speedMenu.classList.add("show");
    } else {
      this.speedMenu.classList.remove("show");
    }
  }

  closeSpeedMenu() {
    this.speedMenuOpen = false;
    this.speedMenu.classList.remove("show");
  }

  setPlaybackSpeed(speed) {
    this.playbackRate = speed;
    this.video.playbackRate = speed;

    // Update active state
    this.speedMenu.querySelectorAll(".video-speed-option").forEach((option) => {
      option.classList.remove("active");
      if (parseFloat(option.dataset.speed) === speed) {
        option.classList.add("active");
      }
    });

    this.closeSpeedMenu();
  }

  toggleSettingsMenu() {
    this.settingsMenuOpen = !this.settingsMenuOpen;
    if (this.settingsMenuOpen) {
      this.settingsMenu.classList.add("show");
    } else {
      this.settingsMenu.classList.remove("show");
    }
  }

  closeSettingsMenu() {
    this.settingsMenuOpen = false;
    this.settingsMenu.classList.remove("show");
  }

  showKeyboardShortcuts() {
    this.closeSettingsMenu();
    const shortcutsModal = this._createShortcutsModal();
    document.body.appendChild(shortcutsModal);
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
      case "j":
        e.preventDefault();
        this.skip(-10);
        break;
      case "l":
        e.preventDefault();
        this.skip(10);
        break;
      case "m":
        this.toggleMute();
        break;
      case "f":
        this.toggleFullscreen();
        break;
      case "i":
        this.togglePictureInPicture();
        break;
      case "Escape":
        if (document.pictureInPictureElement) {
          document.exitPictureInPicture();
        } else {
          this.close();
        }
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

    // Clear center icon timeout
    if (this.centerIconTimeout) {
      clearTimeout(this.centerIconTimeout);
      this.centerIconTimeout = null;
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
