/**
 * CustomVideoPlayer - Main orchestrator for modular video player
 * Coordinates all modules and manages player lifecycle
 */

import VideoState from "./core/VideoState.js";
import VideoControls from "./core/VideoControls.js";
import VideoProgressManager from "./core/VideoProgressManager.js";
import VideoEventHandlers from "./core/VideoEventHandlers.js";
import VideoMenus from "./ui/VideoMenus.js";
import { icons } from "../icons.js";

export default class CustomVideoPlayer {
  constructor(videoUrl, options = {}) {
    this.videoUrl = videoUrl;
    this.options = {
      autoplay: options.autoplay || false,
      showDownload: options.showDownload !== false,
      showClose: options.showClose !== false,
      onClose: options.onClose || null,
      knownDuration: options.knownDuration || null,
      ...options,
    };

    // Initialize state
    this.state = new VideoState(this.options);

    // References
    this.modal = null;
    this.video = null;
    this.centerIcon = null;
    this.controlsInstance = null;
    this.progressManager = null;
    this.eventHandlers = null;
    this.menus = null;
  }

  /**
   * Open video player modal
   */
  open() {
    // Create modal
    this.modal = document.createElement("div");
    this.modal.className = "custom-video-modal-overlay";

    const content = document.createElement("div");
    content.className = "custom-video-modal-content";

    // Create video element
    this.video = this._createVideo();

    // Create center play/pause icon
    this.centerIcon = document.createElement("div");
    this.centerIcon.className = "video-center-icon";
    this.centerIcon.innerHTML = icons.play;

    // Create controls wrapper
    const controlsWrapper = document.createElement("div");
    controlsWrapper.className = "custom-video-controls-wrapper";

    // Initialize controls
    this.controlsInstance = new VideoControls(this.options);
    const controls = this.controlsInstance.createControls();
    const controlRefs = this.controlsInstance.getControls();

    controlsWrapper.appendChild(controls);

    // Append to content
    content.append(this.video, this.centerIcon, controlsWrapper);
    this.modal.appendChild(content);

    // Add to DOM
    document.body.appendChild(this.modal);

    // Initialize managers
    this.progressManager = new VideoProgressManager(
      this.video,
      this.state,
      controlRefs
    );

    this.menus = new VideoMenus(
      controlRefs.speedMenu,
      controlRefs.settingsMenu
    );

    this.eventHandlers = new VideoEventHandlers(
      this.video,
      this.state,
      controlRefs,
      this.progressManager,
      this.menus,
      this.options
    );

    // Set references in event handlers
    this.eventHandlers.setCenterIcon(this.centerIcon);
    this.eventHandlers.setModal(this.modal);

    // Attach all event listeners
    this.eventHandlers.attachAllListeners();

    // Show controls initially
    controlsWrapper.classList.add("show");

    // Setup auto-hide
    this._setupControlsAutoHide(content, controlsWrapper);
  }

  /**
   * Create video element
   * @private
   */
  _createVideo() {
    const video = document.createElement("video");
    video.src = this.videoUrl;
    video.className = "custom-video-player";
    video.preload = "auto";
    video.controls = false;
    video.controlsList = "nodownload noplaybackrate";

    // Disable context menu
    video.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      return false;
    });

    if (this.options.autoplay) {
      video.autoplay = true;
    }

    return video;
  }

  /**
   * Setup controls auto-hide functionality
   * @private
   */
  _setupControlsAutoHide(content, controlsWrapper) {
    let hideTimeout;

    const showControls = () => {
      controlsWrapper.classList.add("show");
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        if (this.state.isPlaying && !this.state.isSeeking) {
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

  /**
   * Close video player
   */
  close() {
    if (this.video) {
      this.video.pause();
    }

    // Cleanup state
    this.state.cleanup();

    // Detach event listeners
    if (this.eventHandlers) {
      this.eventHandlers.detachAllListeners();
    }

    // Remove modal
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }

    // Call onClose callback
    if (this.options.onClose) {
      this.options.onClose();
    }
  }

  /**
   * Destroy player instance
   */
  destroy() {
    this.close();
  }
}
