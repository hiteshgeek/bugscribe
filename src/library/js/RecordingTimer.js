// RecordingTimer.js

import { icons } from "./icons.js";
import Tooltip from "./components/Tooltip.js";

export default class RecordingTimer {
  /**
   * @type {object}
   * @private
   */
  mediaCapture;
  /**
   * @type {number}
   * @private
   */
  maxRecordingSeconds;
  /**
   * @type {NodeJS.Timeout | null}
   * @private
   */
  _interval = null;
  /**
   * @type {NodeJS.Timeout | null}
   * @private
   */
  drawWaveformInterval = null; // Storing the waveform interval
  /**
   * @type {boolean}
   * @private
   */
  _isPaused = false;
  /**
   * @type {number}
   * @private
   * Tracks the time (in ms) accumulated during all pause periods.
   */
  _pausedTime = 0;
  /**
   * @type {number}
   * @private
   * Tracks the total elapsed seconds of recording time.
   */
  _elapsedSeconds = 0;

  /**
   * @type {HTMLButtonElement | null}
   * @private
   */
  pauseBtn = null;
  /**
   * @type {HTMLButtonElement | null}
   * @private
   */
  resumeBtn = null;
  /**
   * @type {HTMLDivElement | null}
   * @private
   */
  timerDisplay = null;

  constructor(mediaCapture, maxRecordingSeconds, config = {}) {
    this.mediaCapture = mediaCapture;
    this.maxRecordingSeconds = maxRecordingSeconds;

    // Configuration options
    this.config = {
      initialPosition: config.initialPosition || "center", // 'left' | 'center' | 'right'
      initialMinimized: config.initialMinimized || false, // boolean
      scale: config.scale || 1, // number (0.5 to 2.0 for size scaling)
      minScale: config.minScale || 0.5,
      maxScale: config.maxScale || 2.0,
      scaleStep: config.scaleStep || 0.1,
      countdownMode: config.countdownMode || false, // boolean - start with countdown from max time
      allowTimerToggle: config.allowTimerToggle !== false, // boolean - allow clicking to toggle timer display mode

      // Visibility options
      showMicButton: config.showMicButton !== false, // boolean
      showSystemAudioButton: config.showSystemAudioButton !== false, // boolean
      showPauseButton: config.showPauseButton !== false, // boolean
      showStopButton: config.showStopButton !== false, // boolean
      showRecordingTime: config.showRecordingTime !== false, // boolean
      showWaveform: config.showWaveform !== false, // boolean
      showDot: config.showDot !== false, // boolean
      showMaxTime: config.showMaxTime !== false, // boolean
      showPositionToolbar: config.showPositionToolbar !== false, // boolean
      showScalingToolbar: config.showScalingToolbar !== false, // boolean
      showResetScaleButton: config.showResetScaleButton !== false, // boolean
      showMinimizeButton: config.showMinimizeButton !== false, // boolean
      showHideToggle: config.showHideToggle !== false, // boolean
      showDotOnHidden: config.showDotOnHidden !== false, // boolean - show dot when timer is hidden (overrides showDot)
      autoHideToolbars: config.autoHideToolbars || true, // boolean - auto-hide toolbars on mouse idle
      autoHideDelay: config.autoHideDelay || 5000, // number - delay in ms before hiding toolbars (default 5 seconds)

      ...config,
    };

    // Current scale state
    this.currentScale = this.config.scale;

    // Timer display mode state
    this.isCountdownMode = this.config.countdownMode;

    // Hidden state for hide/show toggle
    this.isHidden = false;
    this.previousPosition = null;
    this.previousState = null;

    // Auto-hide state
    this.autoHideTimeout = null;

    // Store references for keyboard shortcuts
    this.timerContainer = null;
    this.minimizeBtn = null;
    this.maximizeBtn = null;
  }

  /**
   * Helper function to format seconds into MM:SS string.
   * @param {number} totalSeconds
   * @returns {string}
   */
  _formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  }

  /**
   * Updates the timer display and applies visual warnings if time is low.
   * @private
   */
  _updateDisplay(currentTimeSpan, timerDisplay) {
    // Display elapsed time or countdown based on mode
    const timeToDisplay = this.isCountdownMode
      ? this.maxRecordingSeconds - this._elapsedSeconds
      : this._elapsedSeconds;

    const formattedTime = this._formatTime(Math.max(0, timeToDisplay));
    currentTimeSpan.textContent = this.isCountdownMode
      ? `-${formattedTime}`
      : formattedTime;

    if (this.maxRecordingSeconds - this._elapsedSeconds <= 30) {
      currentTimeSpan.style.color = "#ff4444";
      timerDisplay.style.animation = "timer-warning 1s ease-in-out infinite";
    } else {
      // Ensure styles are reset if timer was in warning and now resumed/restarted
      currentTimeSpan.style.color = "";
      timerDisplay.style.animation = "";
    }
  }

  /**
   * Utility function to convert hex color to RGB object.
   * @private
   * @param {string} hex - Hex color string.
   * @returns {Object} RGB object.
   */
  _hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  /**
   * Utility function to convert RGB to hex color string.
   * @private
   * @param {number} r - Red value.
   * @param {number} g - Green value.
   * @param {number} b - Blue value.
   * @returns {string} Hex color string.
   */
  _rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /**
   * Utility function to mix two hex colors with a percentage.
   * @private
   * @param {string} color1 - First hex color.
   * @param {string} color2 - Second hex color.
   * @param {number} percentage - Mix percentage (0-1).
   * @returns {string} Mixed hex color.
   */
  _mixColors(color1, color2, percentage) {
    const rgb1 = this._hexToRgb(color1);
    const rgb2 = this._hexToRgb(color2);
    if (!rgb1 || !rgb2) return color1;
    const result = {
      r: Math.round(rgb1.r * (1 - percentage) + rgb2.r * percentage),
      g: Math.round(rgb1.g * (1 - percentage) + rgb2.g * percentage),
      b: Math.round(rgb1.b * (1 - percentage) + rgb2.b * percentage),
    };
    return this._rgbToHex(result.r, result.g, result.b);
  }

  /**
   * Draws a professional multi-bar microphone waveform on the canvas, inspired by Google Meet's audio indicator.
   * Uses frequency data segmented into multiple bars for a dynamic, responsive visualization.
   * @private
   * @param {CanvasRenderingContext2D} context - The canvas 2D context.
   * @param {AnalyserNode} analyzer - The audio analyzer node.
   * @param {Uint8Array} dataArray - The array to store frequency data.
   */
  _drawWaveform(context, analyzer, dataArray) {
    if (!analyzer || !dataArray) return;

    // Stop drawing waveform when paused
    if (this._isPaused) {
      context.clearRect(0, 0, context.canvas.width, context.canvas.height);
      return;
    }

    const width = context.canvas.width;
    const height = context.canvas.height;
    const barCount = 5; // Number of bars for a professional, segmented look
    const barWidth = 2; // Fixed thin bar width
    const totalBarsWidth = barCount * barWidth;
    const gap = (width - totalBarsWidth) / (barCount + 1); // Even spacing gaps
    const noiseThreshold = 5; // Adjusted threshold to filter noise while allowing subtle audio
    const visualMultiplier = 2.0; // Balanced multiplier for smooth scaling in small canvas

    // Fetch CSS variables for theme-aware colors
    const style = getComputedStyle(document.documentElement);
    let primary = style.getPropertyValue("--timer-primary").trim();
    if (!primary) primary = "#2ecc71"; // Fallback
    const lighter = this._mixColors(primary, "#ffffff", 0.15); // Mix 15% white for lighter bottom (adjust as needed for theme)

    // 1. Get the frequency data
    analyzer.getByteFrequencyData(dataArray);

    context.clearRect(0, 0, width, height);

    // 2. Segment frequency data into bars and draw each
    const binSize = Math.floor(dataArray.length / barCount);
    for (let i = 0; i < barCount; i++) {
      // Calculate average for this frequency segment
      let sum = 0;
      for (let j = 0; j < binSize; j++) {
        sum += dataArray[i * binSize + j];
      }
      const average = sum / binSize;

      // Normalize magnitude
      let magnitude =
        Math.max(0, average - noiseThreshold) / (255 - noiseThreshold);
      let barHeight = height * magnitude * visualMultiplier;
      barHeight = Math.min(barHeight, height); // Cap at full height

      // Position: centered horizontally with gaps, grow from bottom
      const x = (i + 1) * gap + i * barWidth;
      const y = height - barHeight;

      // Create a subtle gradient for professional look (primary to lighter)
      const gradient = context.createLinearGradient(x, y, x, height);
      gradient.addColorStop(0, primary); // Primary at top
      gradient.addColorStop(1, lighter); // Lighter at bottom

      context.fillStyle = gradient;
      context.fillRect(x, y, barWidth, barHeight);

      // Optional: Add a thin white outline for crispness (subtle)
      context.strokeStyle = "rgba(255, 255, 255, 0.3)";
      context.lineWidth = 0.5;
      context.strokeRect(x, y, barWidth, barHeight);
    }
  }

  show(micMutedOnStart = false) {
    this.hide(); // Clear any existing timer
    this._elapsedSeconds = 0; // Reset counter for new recording
    this._pausedTime = 0; // Reset paused time
    this._isPaused = false;

    const timerWrapper = document.createElement("div");
    timerWrapper.id = "recording-timer-wrapper";
    timerWrapper.className = "recording-timer-wrapper bug-element";

    // --- Timer Display Setup ---
    const timerDisplay = document.createElement("div");
    timerDisplay.className = "recording-timer-display";

    const maxTimeContent = this._formatTime(this.maxRecordingSeconds);
    const initialTime = this.isCountdownMode ? maxTimeContent : "00:00";

    if (this.config.showMaxTime) {
      timerDisplay.innerHTML = `
               <span class="recording-current-time">${initialTime}</span>
               <span class="recording-separator"> / </span>
               <span class="recording-max-time">${maxTimeContent}</span>
             `;
    } else {
      timerDisplay.innerHTML = `
               <span class="recording-current-time">${initialTime}</span>
             `;
    }
    const currentTimeSpan = timerDisplay.querySelector(
      ".recording-current-time"
    );

    // Add click handler to toggle timer display mode (if allowed and maxTime is shown)
    if (this.config.allowTimerToggle && this.config.showMaxTime) {
      timerDisplay.style.cursor = "pointer";
      timerDisplay.setAttribute(
        "data-tooltip-text",
        "Click to toggle timer mode"
      );
      timerDisplay.setAttribute("data-tooltip-shortcut", "Click");
      timerDisplay.setAttribute("data-tooltip-position", "auto");
      timerDisplay.addEventListener("click", () => {
        this.isCountdownMode = !this.isCountdownMode;
        const tooltipText = this.isCountdownMode
          ? "Countdown mode"
          : "Elapsed mode";
        Tooltip.updateText(timerDisplay, tooltipText);
        this._updateDisplay(currentTimeSpan, timerDisplay);
      });
    }

    // Ensure initial display is correct before interval fires
    this._updateDisplay(currentTimeSpan, timerDisplay);

    // Store reference
    this.timerDisplay = timerDisplay;

    // --- Mic Button & Waveform Setup ---
    const micBtn = document.createElement("button");
    micBtn.className = "recording-control-btn recording-mic-btn";

    const waveformCanvas = document.createElement("canvas");
    waveformCanvas.id = "mic-waveform-canvas";
    waveformCanvas.className = "recording-waveform-canvas";
    waveformCanvas.width = 40; // Reduced width for smaller waveform
    waveformCanvas.height = 20;

    const canvasContext = waveformCanvas.getContext("2d");
    // Get the Analyzer Node from the VideoRecorder
    const analyzer = this.mediaCapture.getMicAnalyzer();

    // A place to store the frequency data (must be Uint8Array)
    const dataArray = analyzer
      ? new Uint8Array(analyzer.frequencyBinCount)
      : null;

    // Determine initial mic state
    const micTrack =
      this.mediaCapture.video?._activeRecorder?.micStream?.getAudioTracks?.()[0] ||
      null;

    let isMicMuted;
    if (!micTrack) {
      isMicMuted = true; // No mic track means it's effectively muted (no input)
    } else if (typeof micMutedOnStart === "boolean") {
      isMicMuted = micMutedOnStart;
    } else {
      isMicMuted = !micTrack.enabled;
    }

    micBtn.innerHTML = isMicMuted ? icons.microhpone_disabled : icons.microhone;
    micBtn.setAttribute(
      "data-tooltip-text",
      isMicMuted ? "Unmute microphone" : "Mute microphone"
    );
    micBtn.setAttribute("data-tooltip-shortcut", "M");
    micBtn.setAttribute("data-tooltip-position", "auto");
    micBtn.classList.toggle("muted", isMicMuted);

    micBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const isMuted = this.mediaCapture.toggleMicrophone();
      this.updateMicVisual(isMuted);
    });

    // --- System Audio Button Setup (The Smart Button Logic) ---
    const systemAudioBtn = document.createElement("button");
    systemAudioBtn.className =
      "recording-control-btn recording-system-audio-btn";

    const systemTrack =
      this.mediaCapture.video?._activeRecorder?.displayStream?.getAudioTracks?.()[0] ||
      null;

    // Check if the track exists at all
    const trackExists = !!systemTrack;
    let isSystemMuted = !trackExists || !systemTrack.enabled; // Default to muted if no track

    systemAudioBtn.innerHTML = isSystemMuted
      ? icons.speaker_disabled
      : icons.speaker;

    systemAudioBtn.classList.toggle("muted", isSystemMuted);

    if (trackExists) {
      // CASE 1: Track exists - Button is a functional toggle
      systemAudioBtn.setAttribute(
        "data-tooltip-text",
        isSystemMuted ? "Enable system audio" : "Mute system audio"
      );
      systemAudioBtn.setAttribute("data-tooltip-shortcut", "S");
      systemAudioBtn.setAttribute("data-tooltip-position", "auto");

      systemAudioBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const isMuted = this.mediaCapture.toggleSystemAudio();
        this.updateSystemAudioVisual(isMuted);
      });
    } else {
      // CASE 2: Track is missing - Button is a disabled indicator/warning
      systemAudioBtn.setAttribute("disabled", "true");
      systemAudioBtn.style.opacity = "0.4"; // Visual cue for disabled
      systemAudioBtn.setAttribute(
        "data-tooltip-text",
        "System audio not captured"
      );
      systemAudioBtn.setAttribute("data-tooltip-position", "auto");

      systemAudioBtn.addEventListener("click", (e) => {
        e.preventDefault();
        // Optional: Display a temporary on-screen message (toast/alert)
        // to reinforce the limitation.
      });
    }

    // --- Control Buttons Setup ---
    const pauseBtn = document.createElement("button");
    pauseBtn.className = "recording-control-btn recording-pause-btn";
    pauseBtn.innerHTML = icons.pause;
    pauseBtn.setAttribute("data-tooltip-text", "Pause recording");
    pauseBtn.setAttribute("data-tooltip-shortcut", "P");
    pauseBtn.setAttribute("data-tooltip-position", "auto");
    pauseBtn.style.display = "flex"; // Ensure visible

    const resumeBtn = document.createElement("button");
    resumeBtn.className = "recording-control-btn recording-resume-btn";
    resumeBtn.innerHTML = icons.play;
    resumeBtn.setAttribute("data-tooltip-text", "Resume recording");
    resumeBtn.setAttribute("data-tooltip-shortcut", "P");
    resumeBtn.setAttribute("data-tooltip-position", "auto");
    resumeBtn.style.display = "none";

    const stopBtn = document.createElement("button");
    stopBtn.className = "recording-control-btn recording-stop-btn";
    stopBtn.innerHTML = icons.stop;
    stopBtn.setAttribute("data-tooltip-text", "Stop recording");
    stopBtn.setAttribute("data-tooltip-shortcut", "Esc");
    stopBtn.setAttribute("data-tooltip-position", "auto");

    // Store references
    this.pauseBtn = pauseBtn;
    this.resumeBtn = resumeBtn;

    pauseBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.mediaCapture.isRecording() && !this.mediaCapture.isPaused()) {
        this.mediaCapture.pauseRecording();
        this.updateToPaused();
      }
    });

    resumeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.mediaCapture.isRecording() && this.mediaCapture.isPaused()) {
        this.mediaCapture.resumeRecording();
        this.updateToResumed();
      }
    });

    stopBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.mediaCapture.stopRecording();
    });

    // --- Append to Wrapper (with visibility checks) ---
    const recordingDot = document.createElement("div");
    recordingDot.className = "recording-dot";

    // Store reference to recording dot
    this.recordingDot = recordingDot;

    // Append elements based on visibility config
    // Always append dot if showDotOnHidden is true (even if showDot is false)
    if (this.config.showDot || this.config.showDotOnHidden) {
      timerWrapper.append(recordingDot);
      // If showDot is false but showDotOnHidden is true, add class to hide it in normal state
      if (!this.config.showDot && this.config.showDotOnHidden) {
        recordingDot.classList.add("hide-dot-normal");
      }
    }

    if (this.config.showRecordingTime) {
      timerWrapper.append(timerDisplay);
    }

    if (this.config.showWaveform) {
      timerWrapper.append(waveformCanvas);
    }

    if (this.config.showMicButton) {
      timerWrapper.append(micBtn);
    }

    if (this.config.showSystemAudioButton) {
      timerWrapper.append(systemAudioBtn);
    }

    if (this.config.showPauseButton) {
      timerWrapper.append(pauseBtn, resumeBtn);
    }

    if (this.config.showStopButton) {
      timerWrapper.append(stopBtn);
    }

    // --- Position Controls Toolbar (outside timer, at bottom) ---
    const positionToolbar = document.createElement("div");
    positionToolbar.className = "timer-position-toolbar";

    const leftPosBtn = document.createElement("button");
    leftPosBtn.className = "timer-position-btn";
    leftPosBtn.innerHTML = icons.arrow_left;
    leftPosBtn.setAttribute("data-tooltip-text", "Position left");
    leftPosBtn.setAttribute("data-tooltip-position", "auto");
    leftPosBtn.addEventListener("click", () => {
      timerContainer.classList.remove("center", "right");
      timerContainer.classList.add("left");
      this.updatePositionButtonsVisibility("left");
    });

    const centerPosBtn = document.createElement("button");
    centerPosBtn.className = "timer-position-btn";
    centerPosBtn.innerHTML = icons.minus;
    centerPosBtn.setAttribute("data-tooltip-text", "Position center");
    centerPosBtn.setAttribute("data-tooltip-position", "auto");
    centerPosBtn.addEventListener("click", () => {
      timerContainer.classList.remove("left", "right");
      timerContainer.classList.add("center");
      this.updatePositionButtonsVisibility("center");
    });

    const rightPosBtn = document.createElement("button");
    rightPosBtn.className = "timer-position-btn";
    rightPosBtn.innerHTML = icons.arrow_right;
    rightPosBtn.setAttribute("data-tooltip-text", "Position right");
    rightPosBtn.setAttribute("data-tooltip-position", "auto");
    rightPosBtn.addEventListener("click", () => {
      timerContainer.classList.remove("left", "center");
      timerContainer.classList.add("right");
      this.updatePositionButtonsVisibility("right");
    });

    positionToolbar.append(leftPosBtn, centerPosBtn, rightPosBtn);

    // Store position button references
    this.leftPosBtn = leftPosBtn;
    this.centerPosBtn = centerPosBtn;
    this.rightPosBtn = rightPosBtn;

    // --- Minimize Toggle Button (small, for toolbar) ---
    const minimizeBtn = document.createElement("button");
    minimizeBtn.className = "timer-minimize-btn";
    minimizeBtn.innerHTML = icons.minimize;
    minimizeBtn.setAttribute("data-tooltip-text", "Minimize timer");
    minimizeBtn.setAttribute("data-tooltip-position", "auto");
    minimizeBtn.addEventListener("click", () => {
      const isMinimized = timerContainer.classList.toggle("minimized");
      const tooltipText = isMinimized ? "Restore timer" : "Minimize timer";
      minimizeBtn.innerHTML = isMinimized ? icons.mazimize : icons.minimize;
      Tooltip.updateText(minimizeBtn, tooltipText);
      maximizeBtn.innerHTML = isMinimized ? icons.mazimize : icons.minimize;
      Tooltip.updateText(maximizeBtn, tooltipText);
    });

    // --- Maximize Button (full-size, only visible when minimized) ---
    const maximizeBtn = document.createElement("button");
    maximizeBtn.className = "recording-control-btn timer-maximize-btn";
    maximizeBtn.innerHTML = icons.mazimize;
    maximizeBtn.setAttribute("data-tooltip-text", "Restore timer");
    maximizeBtn.setAttribute("data-tooltip-position", "auto");
    maximizeBtn.addEventListener("click", () => {
      const isMinimized = timerContainer.classList.toggle("minimized");
      const tooltipText = isMinimized ? "Restore timer" : "Minimize timer";
      minimizeBtn.innerHTML = isMinimized ? icons.mazimize : icons.minimize;
      Tooltip.updateText(minimizeBtn, tooltipText);
      maximizeBtn.innerHTML = isMinimized ? icons.mazimize : icons.minimize;
      Tooltip.updateText(maximizeBtn, tooltipText);
    });

    // --- Scaling Controls Toolbar ---
    const scalingToolbar = document.createElement("div");
    scalingToolbar.className = "timer-scaling-toolbar";

    const decreaseScaleBtn = document.createElement("button");
    decreaseScaleBtn.className = "timer-scaling-btn";
    decreaseScaleBtn.innerHTML = icons.minus;
    decreaseScaleBtn.setAttribute("data-tooltip-text", "Decrease size");
    decreaseScaleBtn.setAttribute("data-tooltip-position", "auto");

    const increaseScaleBtn = document.createElement("button");
    increaseScaleBtn.className = "timer-scaling-btn";
    increaseScaleBtn.innerHTML = icons.plus;
    increaseScaleBtn.setAttribute("data-tooltip-text", "Increase size");
    increaseScaleBtn.setAttribute("data-tooltip-position", "auto");

    const resetScaleBtn = document.createElement("button");
    resetScaleBtn.className = "timer-scaling-btn timer-reset-scale-btn";
    resetScaleBtn.innerHTML = icons.equal;
    resetScaleBtn.setAttribute("data-tooltip-text", "Reset size");
    resetScaleBtn.setAttribute("data-tooltip-position", "auto");

    // Scaling button event handlers
    decreaseScaleBtn.addEventListener("click", () => {
      const newScale = Math.max(
        this.config.minScale,
        this.currentScale - this.config.scaleStep
      );
      this.updateScale(newScale, timerContainer);
    });

    increaseScaleBtn.addEventListener("click", () => {
      const newScale = Math.min(
        this.config.maxScale,
        this.currentScale + this.config.scaleStep
      );
      this.updateScale(newScale, timerContainer);
    });

    resetScaleBtn.addEventListener("click", () => {
      this.updateScale(this.config.scale, timerContainer);
    });

    // Append buttons in order: minus, equals, plus
    scalingToolbar.append(decreaseScaleBtn);
    if (this.config.showResetScaleButton) {
      scalingToolbar.append(resetScaleBtn);
    }
    scalingToolbar.append(increaseScaleBtn);

    // Store references for scale buttons
    this.decreaseScaleBtn = decreaseScaleBtn;
    this.increaseScaleBtn = increaseScaleBtn;
    this.resetScaleBtn = resetScaleBtn;

    // --- Hide/Show Toggle Button (for toolbar) ---
    let hideShowToggle = null;
    if (this.config.showHideToggle) {
      hideShowToggle = document.createElement("button");
      hideShowToggle.className = "timer-minimize-btn";
      hideShowToggle.innerHTML = icons.hide;
      hideShowToggle.setAttribute("data-tooltip-text", "Hide timer");
      hideShowToggle.setAttribute("data-tooltip-position", "auto");

      hideShowToggle.addEventListener("click", () => {
        this.toggleHideShow();
      });
    }

    // --- Left Controls Group (position + scaling toolbars) ---
    const leftControlsGroup = document.createElement("div");
    leftControlsGroup.className = "timer-left-controls-group";

    if (this.config.showPositionToolbar) {
      leftControlsGroup.append(positionToolbar);
    }

    if (this.config.showScalingToolbar) {
      leftControlsGroup.append(scalingToolbar);
    }

    // --- Right Controls Group (minimize + hide) ---
    const rightControlsGroup = document.createElement("div");
    rightControlsGroup.className = "timer-right-controls-group";

    if (this.config.showMinimizeButton) {
      rightControlsGroup.append(minimizeBtn);
    }

    if (this.config.showHideToggle && hideShowToggle) {
      rightControlsGroup.append(hideShowToggle);
    }

    // --- Controls Row (left controls left, right controls right) ---
    const controlsRow = document.createElement("div");
    controlsRow.className = "timer-controls-row";

    // Append left controls if any are visible
    if (this.config.showPositionToolbar || this.config.showScalingToolbar) {
      controlsRow.append(leftControlsGroup);
    }

    // Append right controls if any are visible
    if (this.config.showMinimizeButton || this.config.showHideToggle) {
      controlsRow.append(rightControlsGroup);
    }

    // --- Container to hold timer and controls row ---
    const timerContainer = document.createElement("div");
    timerContainer.className = `recording-timer-container ${this.config.initialPosition}`;

    // Apply initial minimized state
    if (this.config.initialMinimized) {
      timerContainer.classList.add("minimized");
      minimizeBtn.innerHTML = icons.mazimize;
      minimizeBtn.title = "Restore timer";
      maximizeBtn.innerHTML = icons.mazimize;
      maximizeBtn.title = "Restore timer";
    }

    // Apply scale transformation
    if (this.config.scale !== 1) {
      timerContainer.style.transform =
        this.config.initialPosition === "center"
          ? `translateX(-50%) scale(${this.config.scale})`
          : `scale(${this.config.scale})`;
      timerContainer.style.transformOrigin =
        this.config.initialPosition === "left"
          ? "bottom left"
          : this.config.initialPosition === "right"
          ? "bottom right"
          : "bottom center";
    }

    // --- Show Button (appears inside timer when hidden) ---
    const showBtn = document.createElement("button");
    showBtn.className = "recording-control-btn timer-show-btn";
    showBtn.innerHTML = icons.show;
    showBtn.setAttribute("data-tooltip-text", "Show timer");
    showBtn.setAttribute("data-tooltip-position", "auto");
    showBtn.addEventListener("click", () => {
      this.toggleHideShow();
    });

    timerWrapper.append(maximizeBtn, showBtn); // Add maximize and show buttons to timer wrapper
    timerContainer.append(timerWrapper, controlsRow);

    document.body.appendChild(timerContainer);

    // Store references for keyboard shortcuts
    this.timerContainer = timerContainer;
    this.minimizeBtn = minimizeBtn;
    this.maximizeBtn = maximizeBtn;
    this.hideShowToggle = hideShowToggle;
    this.showBtn = showBtn;

    // --- Initialize Tooltips ---
    setTimeout(() => {
      Tooltip.initAll(timerContainer);
      if (hideShowToggle) {
        Tooltip.init(hideShowToggle);
      }
    }, 0);

    // --- Initialize Button States ---
    // Set initial position button visibility based on initialPosition
    this.updatePositionButtonsVisibility(this.config.initialPosition);

    // Set initial equals button disabled state based on current scale
    if (this.resetScaleBtn) {
      const isAtDefault =
        Math.abs(this.currentScale - this.config.scale) < 0.01;
      this.resetScaleBtn.disabled = isAtDefault;
      this.resetScaleBtn.style.opacity = isAtDefault ? "0.4" : "1";
    }

    // --- Setup Auto-hide for Toolbars ---
    if (this.config.autoHideToolbars && controlsRow) {
      this._setupAutoHideToolbars(timerContainer, controlsRow);
    }

    // --- Start Waveform Drawing ---
    if (analyzer && dataArray) {
      this.drawWaveformInterval = setInterval(() => {
        this._drawWaveform(canvasContext, analyzer, dataArray);
      }, 50); // Draw 20 times per second for smooth animation
    }

    // --- Start Timer Interval ---
    this._interval = setInterval(() => {
      if (this._isPaused) {
        this._pausedTime += 1000;
        return;
      }

      this._elapsedSeconds += 1;

      if (this._elapsedSeconds >= this.maxRecordingSeconds) {
        this.mediaCapture.stopRecording();
        return;
      }

      this._updateDisplay(currentTimeSpan, timerDisplay);
    }, 1000);
  }

  /**
   * Visually and internally updates the timer state to PAUSED.
   */
  updateToPaused() {
    this._isPaused = true;
    if (this.pauseBtn && this.resumeBtn && this.timerDisplay) {
      this.pauseBtn.style.display = "none";
      this.resumeBtn.style.display = "flex";
      this.timerDisplay.style.opacity = "0.6";
    }

    // Stop recording dot pulsation
    const recordingDot = document.querySelector(".recording-dot");
    if (recordingDot) {
      recordingDot.classList.add("paused");
    }
  }

  /**
   * Visually and internally updates the timer state to RESUMED.
   */
  updateToResumed() {
    this._isPaused = false;
    if (this.pauseBtn && this.resumeBtn && this.timerDisplay) {
      this.resumeBtn.style.display = "none";
      this.pauseBtn.style.display = "flex";
      this.timerDisplay.style.opacity = "1";
    }

    // Resume recording dot pulsation
    const recordingDot = document.querySelector(".recording-dot");
    if (recordingDot) {
      recordingDot.classList.remove("paused");
    }
  }

  /**
   * Visually updates the mic button state.
   * @param {boolean} isMuted - The new mute state (true if muted).
   */
  updateMicVisual(isMuted) {
    const micBtn = document.querySelector(".recording-mic-btn");
    if (micBtn) {
      micBtn.innerHTML = isMuted ? icons.microhpone_disabled : icons.microhone;
      const tooltipText = isMuted ? "Unmute microphone" : "Mute microphone";
      Tooltip.updateText(micBtn, tooltipText);
      micBtn.classList.toggle("muted", isMuted);
    }
  }

  /**
   * Visually updates the system audio button state.
   * NOTE: This is only called if a system audio track *exists*.
   * @param {boolean} isMuted - The new mute state (true if muted).
   */
  updateSystemAudioVisual(isMuted) {
    const systemBtn = document.querySelector(".recording-system-audio-btn");
    // Only update if the button is NOT disabled (i.e., the track exists)
    if (systemBtn && !systemBtn.hasAttribute("disabled")) {
      systemBtn.innerHTML = isMuted ? icons.speaker_disabled : icons.speaker;
      const tooltipText = isMuted ? "Enable system audio" : "Mute system audio";
      Tooltip.updateText(systemBtn, tooltipText);
      systemBtn.classList.toggle("muted", isMuted);
    }
  }

  /**
   * Updates the timer scale/size
   * @param {number} newScale - New scale value
   * @param {HTMLElement} timerContainer - Timer container element
   */
  updateScale(newScale, timerContainer) {
    this.currentScale = newScale;

    // Update transform based on position
    const position = timerContainer.classList.contains("left")
      ? "left"
      : timerContainer.classList.contains("right")
      ? "right"
      : "center";

    if (position === "center") {
      timerContainer.style.transform = `translateX(-50%) scale(${newScale})`;
    } else {
      timerContainer.style.transform = `scale(${newScale})`;
    }

    // Update button states
    if (this.decreaseScaleBtn) {
      this.decreaseScaleBtn.disabled = newScale <= this.config.minScale;
      this.decreaseScaleBtn.style.opacity =
        newScale <= this.config.minScale ? "0.4" : "1";
    }
    if (this.increaseScaleBtn) {
      this.increaseScaleBtn.disabled = newScale >= this.config.maxScale;
      this.increaseScaleBtn.style.opacity =
        newScale >= this.config.maxScale ? "0.4" : "1";
    }
    if (this.resetScaleBtn) {
      const isAtDefault = Math.abs(newScale - this.config.scale) < 0.01;
      this.resetScaleBtn.disabled = isAtDefault;
      this.resetScaleBtn.style.opacity = isAtDefault ? "0.4" : "1";
    }
  }

  /**
   * Updates position button visibility based on current position
   * Hides the button corresponding to the current position
   * @param {string} position - Current position: 'left', 'center', or 'right'
   */
  updatePositionButtonsVisibility(position) {
    if (!this.leftPosBtn || !this.centerPosBtn || !this.rightPosBtn) return;

    // Show all buttons first
    this.leftPosBtn.style.display = "flex";
    this.centerPosBtn.style.display = "flex";
    this.rightPosBtn.style.display = "flex";

    // Hide the button corresponding to current position
    if (position === "left") {
      this.leftPosBtn.style.display = "none";
    } else if (position === "center") {
      this.centerPosBtn.style.display = "none";
    } else if (position === "right") {
      this.rightPosBtn.style.display = "none";
    }
  }

  /**
   * Toggles the timer minimize/maximize state
   * Can be called from keyboard shortcuts
   */
  toggleMinimize() {
    if (!this.timerContainer) return;

    const isMinimized = this.timerContainer.classList.toggle("minimized");
    const tooltipText = isMinimized ? "Restore timer" : "Minimize timer";

    if (this.minimizeBtn) {
      this.minimizeBtn.innerHTML = isMinimized
        ? icons.mazimize
        : icons.minimize;
      Tooltip.updateText(this.minimizeBtn, tooltipText);
    }

    if (this.maximizeBtn) {
      this.maximizeBtn.innerHTML = isMinimized
        ? icons.mazimize
        : icons.minimize;
      Tooltip.updateText(this.maximizeBtn, tooltipText);
    }
  }

  /**
   * Toggles hide/show state of the timer
   * Can be called from keyboard shortcuts
   */
  toggleHideShow() {
    if (!this.timerContainer) return;

    if (!this.isHidden) {
      // Hide: Store current state and show only dot + show button
      this.isHidden = true;
      this.previousPosition = this.timerContainer.classList.contains("left")
        ? "left"
        : this.timerContainer.classList.contains("right")
        ? "right"
        : "center";
      this.previousState = {
        minimized: this.timerContainer.classList.contains("minimized"),
        transform: this.timerContainer.style.transform,
      };

      // Remove position classes and add hidden state
      this.timerContainer.classList.remove("left", "center", "right");
      this.timerContainer.classList.add("left", "hidden");

      // Add class to control dot visibility on hidden state
      if (!this.config.showDotOnHidden) {
        this.timerContainer.classList.add("hide-dot-on-hidden");
      }

      // Update hide button if exists
      if (this.hideShowToggle) {
        this.hideShowToggle.innerHTML = icons.show;
        Tooltip.updateText(this.hideShowToggle, "Show timer");
      }
    } else {
      // Show: Restore previous state
      this.isHidden = false;

      // Restore position
      this.timerContainer.classList.remove(
        "left",
        "center",
        "right",
        "hidden",
        "hide-dot-on-hidden"
      );
      this.timerContainer.classList.add(this.previousPosition);

      // Restore minimized state
      if (this.previousState.minimized) {
        this.timerContainer.classList.add("minimized");
      }

      // Restore transform
      this.timerContainer.style.transform = this.previousState.transform;

      // Update position button visibility
      this.updatePositionButtonsVisibility(this.previousPosition);

      // Update hide button if exists
      if (this.hideShowToggle) {
        this.hideShowToggle.innerHTML = icons.hide;
        Tooltip.updateText(this.hideShowToggle, "Hide timer");
      }
    }
  }

  /**
   * Setup auto-hide functionality for toolbars
   * @private
   */
  _setupAutoHideToolbars(timerContainer, controlsRow) {
    // Initially hide the controls row
    controlsRow.classList.add("auto-hidden");

    const showToolbars = () => {
      controlsRow.classList.remove("auto-hidden");

      // Clear existing timeout
      if (this.autoHideTimeout) {
        clearTimeout(this.autoHideTimeout);
      }

      // Set new timeout to hide after delay
      this.autoHideTimeout = setTimeout(() => {
        controlsRow.classList.add("auto-hidden");
      }, this.config.autoHideDelay);
    };

    const hideToolbars = () => {
      if (this.autoHideTimeout) {
        clearTimeout(this.autoHideTimeout);
      }
      controlsRow.classList.add("auto-hidden");
    };

    // Show toolbars on mouse enter
    timerContainer.addEventListener("mouseenter", showToolbars);

    // Reset timer on mouse move
    timerContainer.addEventListener("mousemove", showToolbars);

    // Hide immediately on mouse leave
    timerContainer.addEventListener("mouseleave", hideToolbars);

    // Store reference for cleanup
    this.controlsRow = controlsRow;
  }

  /**
   * Shows keyboard shortcuts modal
   */
  showShortcutsModal() {
    // Create modal overlay
    const modalOverlay = document.createElement("div");
    modalOverlay.className = "recording-shortcuts-modal-overlay";

    // Create modal content
    const modalContent = document.createElement("div");
    modalContent.className = "recording-shortcuts-modal";

    // Create header
    const header = document.createElement("div");
    header.className = "recording-shortcuts-header";
    header.innerHTML = `
      <h2>Recording Keyboard Shortcuts</h2>
      <button class="recording-shortcuts-close">${icons.cancel}</button>
    `;

    // Create shortcuts list
    const shortcutsList = document.createElement("div");
    shortcutsList.className = "recording-shortcuts-list";
    shortcutsList.innerHTML = `
      <div class="shortcut-item">
        <span class="shortcut-label">Stop Recording</span>
        <span class="shortcut-keys">
          <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> or <kbd>Esc</kbd>
        </span>
      </div>
      <div class="shortcut-item">
        <span class="shortcut-label">Pause/Resume Recording</span>
        <span class="shortcut-keys">
          <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>
        </span>
      </div>
      <div class="shortcut-item">
        <span class="shortcut-label">Toggle Microphone</span>
        <span class="shortcut-keys">
          <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>M</kbd>
        </span>
      </div>
      <div class="shortcut-item">
        <span class="shortcut-label">Toggle System Audio</span>
        <span class="shortcut-keys">
          <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd>
        </span>
      </div>
      <div class="shortcut-item">
        <span class="shortcut-label">Minimize/Maximize Timer</span>
        <span class="shortcut-keys">
          <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>T</kbd>
        </span>
      </div>
      <div class="shortcut-item">
        <span class="shortcut-label">Hide/Show Timer</span>
        <span class="shortcut-keys">
          <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>H</kbd>
        </span>
      </div>
      <div class="shortcut-item">
        <span class="shortcut-label">Show Shortcuts</span>
        <span class="shortcut-keys">
          <kbd>Ctrl</kbd> + <kbd>F1</kbd>
        </span>
      </div>
    `;

    modalContent.append(header, shortcutsList);
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    // Close handlers
    const closeModal = () => {
      modalOverlay.remove();
    };

    header
      .querySelector(".recording-shortcuts-close")
      .addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    // ESC to close
    const escHandler = (e) => {
      if (e.key === "Escape") {
        closeModal();
        document.removeEventListener("keydown", escHandler);
      }
    };
    document.addEventListener("keydown", escHandler);
  }

  hide() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }

    // Stop Waveform Drawing
    if (this.drawWaveformInterval) {
      clearInterval(this.drawWaveformInterval);
      this.drawWaveformInterval = null;
    }

    // Clear auto-hide timeout
    if (this.autoHideTimeout) {
      clearTimeout(this.autoHideTimeout);
      this.autoHideTimeout = null;
    }

    // Clear references
    this.pauseBtn = null;
    this.resumeBtn = null;
    this.timerDisplay = null;

    // Remove the entire container (includes toolbar and minimize button)
    const container = document.querySelector(".recording-timer-container");
    if (container) container.remove();
  }
}
