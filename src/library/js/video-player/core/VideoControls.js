/**
 * VideoControls - Creates and manages video player UI controls
 */

import { icons } from "../../icons.js";
import Tooltip from "../../components/Tooltip.js";

export default class VideoControls {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Create all video controls
   * @returns {Object} Controls container and close button
   */
  createControls() {
    const controls = document.createElement("div");
    controls.className = "custom-video-controls";

    const progressRow = this._createProgressRow();
    const bottomRow = this._createBottomRow();

    controls.append(progressRow, bottomRow);

    // Create close button separately (for top-right positioning)
    let closeButton = null;
    if (this.options.showClose !== false) {
      closeButton = this._createCloseButton();
    }

    // Initialize tooltips after a tick
    setTimeout(() => {
      const allControls = controls.querySelectorAll("[data-tooltip-text]");
      allControls.forEach((control) => Tooltip.init(control));
      if (closeButton) {
        Tooltip.init(closeButton);
      }
    }, 0);

    return { controls, closeButton };
  }

  /**
   * Create progress row
   * @private
   */
  _createProgressRow() {
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

    return progressRow;
  }

  /**
   * Create bottom controls row
   * @private
   */
  _createBottomRow() {
    const bottomRow = document.createElement("div");
    bottomRow.className = "video-bottom-controls";

    const leftControls = this._createLeftControls();
    const rightControls = this._createRightControls();

    bottomRow.append(leftControls, rightControls);
    return bottomRow;
  }

  /**
   * Create left side controls
   * @private
   */
  _createLeftControls() {
    const leftControls = document.createElement("div");
    leftControls.className = "video-controls-left";

    // Play/Pause Button
    this.playPauseBtn = this._createButton(icons.play, "Play", "K");

    // Backward 10 seconds
    this.backward10Btn = this._createButton(
      icons.backward10,
      "Backward 10s",
      "J"
    );

    // Forward 10 seconds
    this.forward10Btn = this._createButton(icons.forward10, "Forward 10s", "L");

    // Volume Control
    const volumeControl = this._createVolumeControl();

    // Time Display
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

    return leftControls;
  }

  /**
   * Create right side controls
   * @private
   */
  _createRightControls() {
    const rightControls = document.createElement("div");
    rightControls.className = "video-controls-right";

    // Speed Control
    const speedControl = this._createSpeedControl();
    rightControls.append(speedControl);

    // Settings Control
    const settingsControl = this._createSettingsControl();
    rightControls.append(settingsControl);

    // Download Button
    if (this.options.showDownload !== false) {
      this.downloadBtn = this._createButton(icons.download, "Download");
      rightControls.append(this.downloadBtn);
    }

    // Picture-in-Picture Button
    this.pipBtn = this._createButton(icons.pip, "Picture in Picture", "I");

    // Fullscreen Button
    this.fullscreenBtn = this._createButton(
      icons.fullscreen,
      "Fullscreen",
      "F"
    );

    rightControls.append(this.pipBtn, this.fullscreenBtn);

    return rightControls;
  }

  /**
   * Create close button for top-right positioning
   * @private
   */
  _createCloseButton() {
    this.closeBtn = document.createElement("button");
    this.closeBtn.className = "video-control-btn video-close-btn video-close-btn-top";
    this.closeBtn.innerHTML = "×";
    this.closeBtn.setAttribute("data-tooltip-text", "Close");
    this.closeBtn.setAttribute("data-tooltip-shortcut", "Esc");
    return this.closeBtn;
  }

  /**
   * Create a control button
   * @private
   */
  _createButton(iconHTML, tooltipText, shortcut = null) {
    const button = document.createElement("button");
    button.className = "video-control-btn";
    button.innerHTML = iconHTML;
    button.setAttribute("data-tooltip-text", tooltipText);
    if (shortcut) {
      button.setAttribute("data-tooltip-shortcut", shortcut);
    }
    return button;
  }

  /**
   * Create volume control
   * @private
   */
  _createVolumeControl() {
    const volumeControl = document.createElement("div");
    volumeControl.className = "video-volume-control";

    this.volumeBtn = this._createButton(icons.volume, "Mute", "M");

    this.volumeSlider = document.createElement("input");
    this.volumeSlider.type = "range";
    this.volumeSlider.className = "video-volume-slider";
    this.volumeSlider.min = "0";
    this.volumeSlider.max = "100";
    this.volumeSlider.value = "100";
    this.volumeSlider.setAttribute("data-tooltip-text", "Volume");

    volumeControl.append(this.volumeBtn, this.volumeSlider);
    return volumeControl;
  }

  /**
   * Create speed control with menu
   * @private
   */
  _createSpeedControl() {
    const speedControl = document.createElement("div");
    speedControl.className = "video-speed-control";

    this.speedBtn = this._createButton(icons.speed, "Playback speed");
    this.speedBtn.classList.add("video-speed-btn");

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
    return speedControl;
  }

  /**
   * Create settings control with menu
   * @private
   */
  _createSettingsControl() {
    const settingsControl = document.createElement("div");
    settingsControl.className = "video-settings-control";

    this.settingsBtn = this._createButton(icons.settings, "Settings");
    this.settingsBtn.classList.add("video-settings-btn");

    this.settingsMenu = document.createElement("div");
    this.settingsMenu.className = "video-settings-menu";

    const shortcutsOption = document.createElement("div");
    shortcutsOption.className = "video-settings-option";
    shortcutsOption.innerHTML = `<span class="settings-icon">${icons.keyboard}</span> Keyboard Shortcuts`;
    this.settingsMenu.appendChild(shortcutsOption);

    settingsControl.append(this.settingsBtn, this.settingsMenu);
    return settingsControl;
  }

  /**
   * Get all control references
   * @returns {Object} Control element references
   */
  getControls() {
    return {
      progressBar: this.progressBar,
      progressFilled: this.progressFilled,
      progressBuffer: this.progressBuffer,
      progressHandle: this.progressHandle,
      playPauseBtn: this.playPauseBtn,
      backward10Btn: this.backward10Btn,
      forward10Btn: this.forward10Btn,
      volumeBtn: this.volumeBtn,
      volumeSlider: this.volumeSlider,
      timeDisplay: this.timeDisplay,
      speedBtn: this.speedBtn,
      speedMenu: this.speedMenu,
      settingsBtn: this.settingsBtn,
      settingsMenu: this.settingsMenu,
      downloadBtn: this.downloadBtn,
      pipBtn: this.pipBtn,
      fullscreenBtn: this.fullscreenBtn,
      closeBtn: this.closeBtn,
    };
  }
}
