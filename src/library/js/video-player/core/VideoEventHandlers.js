/**
 * VideoEventHandlers - Manages all event listeners for video player
 */

import { icons } from "../../icons.js";
import VideoUtils from "../utils/VideoUtils.js";

export default class VideoEventHandlers {
  constructor(video, state, controls, progressManager, menus, options) {
    this.video = video;
    this.state = state;
    this.controls = controls;
    this.progressManager = progressManager;
    this.menus = menus;
    this.options = options;
    this.centerIcon = null;
    this.modal = null;
    this.onClose = options.onClose;
  }

  /**
   * Set center icon element
   */
  setCenterIcon(centerIcon) {
    this.centerIcon = centerIcon;
  }

  /**
   * Set modal element
   */
  setModal(modal) {
    this.modal = modal;
  }

  /**
   * Attach all event listeners
   */
  attachAllListeners() {
    this._attachPlaybackListeners();
    this._attachProgressListeners();
    this._attachVolumeListeners();
    this._attachMenuListeners();
    this._attachVideoListeners();
    this._attachKeyboardListeners();
    this._attachFullscreenListeners();

    // Start progress sync
    this.progressManager.startProgressSync();

    // Initial update
    this.progressManager.updateProgress();
  }

  /**
   * Attach playback control listeners
   * @private
   */
  _attachPlaybackListeners() {
    this.controls.playPauseBtn.addEventListener("click", () =>
      this.togglePlayPause()
    );
    this.video.addEventListener("click", () => this.togglePlayPause());

    this.controls.backward10Btn.addEventListener("click", () => {
      this.progressManager.skip(-10);
    });

    this.controls.forward10Btn.addEventListener("click", () => {
      this.progressManager.skip(10);
    });

    this.controls.timeDisplay.addEventListener("click", () => {
      this.state.toggleTimeDisplay();
      this.progressManager.updateProgress();
    });

    if (this.controls.pipBtn) {
      this.controls.pipBtn.addEventListener("click", () =>
        this.togglePictureInPicture()
      );
    }

    if (this.controls.closeBtn) {
      this.controls.closeBtn.addEventListener("click", () => this.close());
    }
  }

  /**
   * Attach progress bar listeners
   * @private
   */
  _attachProgressListeners() {
    this.controls.progressBar.addEventListener("mousedown", (e) => {
      this.state.isSeeking = true;
      this.progressManager.seek(e);

      const move = (e) => this.state.isSeeking && this.progressManager.seek(e);
      const up = () => {
        this.state.isSeeking = false;
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
      };

      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    });
  }

  /**
   * Attach volume control listeners
   * @private
   */
  _attachVolumeListeners() {
    this.controls.volumeBtn.addEventListener("click", () => this.toggleMute());

    this.controls.volumeSlider.addEventListener("input", (e) => {
      const volume = e.target.value / 100;
      this.video.volume = volume;
      this.controls.volumeSlider.style.setProperty(
        "--volume-level",
        `${e.target.value}%`
      );
      this._updateVolumeIcon();
    });
  }

  /**
   * Attach menu listeners
   * @private
   */
  _attachMenuListeners() {
    // Speed menu
    this.controls.speedBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.state.toggleSpeedMenu();
      this.menus.toggleSpeedMenu(this.state.speedMenuOpen);
    });

    this.controls.speedMenu
      .querySelectorAll(".video-speed-option")
      .forEach((option) => {
        option.addEventListener("click", (e) => {
          e.stopPropagation();
          const speed = parseFloat(option.dataset.speed);
          this.setPlaybackSpeed(speed);
        });
      });

    // Settings menu
    this.controls.settingsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.state.toggleSettingsMenu();
      this.menus.toggleSettingsMenu(this.state.settingsMenuOpen);
    });

    this.controls.settingsMenu
      .querySelector(".video-settings-option")
      .addEventListener("click", (e) => {
        e.stopPropagation();
        this.menus.showKeyboardShortcuts();
        this.state.closeSettingsMenu();
        this.menus.toggleSettingsMenu(false);
      });

    // Close menus on outside click
    document.addEventListener("click", (e) => {
      if (
        this.state.speedMenuOpen &&
        !e.target.closest(".video-speed-control")
      ) {
        this.state.closeSpeedMenu();
        this.menus.toggleSpeedMenu(false);
      }
      if (
        this.state.settingsMenuOpen &&
        !e.target.closest(".video-settings-control")
      ) {
        this.state.closeSettingsMenu();
        this.menus.toggleSettingsMenu(false);
      }
    });

    // Download
    if (this.controls.downloadBtn) {
      this.controls.downloadBtn.addEventListener("click", () => {
        VideoUtils.downloadVideo(this.video.src);
      });
    }
  }

  /**
   * Attach video event listeners
   * @private
   */
  _attachVideoListeners() {
    this.video.addEventListener("progress", () =>
      this.progressManager.updateBuffer()
    );
    this.video.addEventListener("loadedmetadata", () => {
      this.progressManager.updateProgress();
      this.progressManager.updateBuffer();
    });
    this.video.addEventListener("loadeddata", () =>
      this.progressManager.updateProgress()
    );
    this.video.addEventListener("canplay", () =>
      this.progressManager.updateProgress()
    );

    this.video.addEventListener("play", () => {
      this.state.isPlaying = true;
      this.progressManager.updateProgress();
    });

    this.video.addEventListener("pause", () => {
      this.state.isPlaying = false;
    });

    this.video.addEventListener("ended", () => {
      this.state.isPlaying = false;
      this.controls.playPauseBtn.innerHTML = icons.play;

      if (!isFinite(this.video.duration) && this.video.currentTime > 0) {
        this.state.estimatedDuration = this.video.currentTime;
        this.progressManager.updateProgress();
      }
    });
  }

  /**
   * Attach keyboard listeners
   * @private
   */
  _attachKeyboardListeners() {
    this.handleKeyboard = (e) => {
      if (!this.modal) return;

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          this.togglePlayPause();
          break;
        case "j":
          e.preventDefault();
          this.progressManager.skip(-10);
          break;
        case "l":
          e.preventDefault();
          this.progressManager.skip(10);
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

    document.addEventListener("keydown", this.handleKeyboard);
  }

  /**
   * Attach fullscreen listeners
   * @private
   */
  _attachFullscreenListeners() {
    this.controls.fullscreenBtn.addEventListener("click", () =>
      this.toggleFullscreen()
    );

    document.addEventListener("fullscreenchange", () => {
      if (document.fullscreenElement) {
        this.controls.fullscreenBtn.innerHTML = icons.fullscreen_off;
        this.controls.fullscreenBtn.setAttribute(
          "data-tooltip-text",
          "Exit fullscreen"
        );
      } else {
        this.controls.fullscreenBtn.innerHTML = icons.fullscreen;
        this.controls.fullscreenBtn.setAttribute(
          "data-tooltip-text",
          "Fullscreen"
        );
      }
    });
  }

  /**
   * Toggle play/pause
   */
  togglePlayPause() {
    if (this.video.paused) {
      this.video.play();
      this.controls.playPauseBtn.innerHTML = icons.pause;
      this.controls.playPauseBtn.setAttribute("data-tooltip-text", "Pause");
      this._showCenterIcon(icons.play);
    } else {
      this.video.pause();
      this.controls.playPauseBtn.innerHTML = icons.play;
      this.controls.playPauseBtn.setAttribute("data-tooltip-text", "Play");
      this._showCenterIcon(icons.pause);
    }
  }

  /**
   * Show center icon with animation
   * @private
   */
  _showCenterIcon(iconHTML) {
    if (!this.centerIcon) return;

    this.centerIcon.innerHTML = iconHTML;
    this.centerIcon.classList.remove("hide");
    this.centerIcon.classList.add("show");

    if (this.state.centerIconTimeout) {
      clearTimeout(this.state.centerIconTimeout);
    }

    this.state.centerIconTimeout = setTimeout(() => {
      this.centerIcon.classList.remove("show");
      this.centerIcon.classList.add("hide");
    }, 500);
  }

  /**
   * Toggle mute
   */
  toggleMute() {
    this.video.muted = !this.video.muted;
    this._updateVolumeIcon();
  }

  /**
   * Update volume icon
   * @private
   */
  _updateVolumeIcon() {
    if (this.video.muted || this.video.volume <= 0.05) {
      this.controls.volumeBtn.innerHTML = icons.muted;
    } else if (this.video.volume < 0.5) {
      this.controls.volumeBtn.innerHTML = icons.volumeLow;
    } else {
      this.controls.volumeBtn.innerHTML = icons.volume;
    }
  }

  /**
   * Toggle fullscreen
   */
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      // Try to find the fullscreen target element
      let fullscreenTarget = this.modal;

      // If modal doesn't exist or isn't connected, try to find the carousel overlay
      if (!fullscreenTarget || !fullscreenTarget.isConnected) {
        fullscreenTarget = document.querySelector('.media-carousel-overlay');
      }

      // If still not found, try to find any parent modal-like container
      if (!fullscreenTarget || !fullscreenTarget.isConnected) {
        fullscreenTarget = this.video?.closest('.custom-video-modal-overlay, .image-modal-overlay, .media-carousel-overlay');
      }

      // Request fullscreen on the found element
      if (fullscreenTarget && fullscreenTarget.isConnected) {
        fullscreenTarget.requestFullscreen().catch((err) => {
          console.error("Failed to enter fullscreen:", err);
        });
      } else {
        console.warn("No valid fullscreen target found");
      }
    } else {
      document.exitFullscreen();
    }
  }

  /**
   * Toggle Picture-in-Picture
   */
  togglePictureInPicture() {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
    } else if (document.pictureInPictureEnabled) {
      this.video.requestPictureInPicture().catch((err) => {
        console.error("Failed to enter Picture-in-Picture:", err);
      });
    }
  }

  /**
   * Set playback speed
   */
  setPlaybackSpeed(speed) {
    this.state.setPlaybackRate(speed);
    this.video.playbackRate = speed;

    this.controls.speedMenu
      .querySelectorAll(".video-speed-option")
      .forEach((option) => {
        option.classList.remove("active");
        if (parseFloat(option.dataset.speed) === speed) {
          option.classList.add("active");
        }
      });

    this.state.closeSpeedMenu();
    this.menus.toggleSpeedMenu(false);
  }

  /**
   * Close player
   */
  close() {
    this.video.pause();
    document.removeEventListener("keydown", this.handleKeyboard);

    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }

    if (this.onClose) this.onClose();
  }

  /**
   * Remove all listeners
   */
  detachAllListeners() {
    document.removeEventListener("keydown", this.handleKeyboard);
  }
}
