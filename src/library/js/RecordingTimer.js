// RecordingTimer.js

import { icons } from "./icons.js";

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

  constructor(mediaCapture, maxRecordingSeconds) {
    this.mediaCapture = mediaCapture;
    this.maxRecordingSeconds = maxRecordingSeconds;
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
    currentTimeSpan.textContent = this._formatTime(this._elapsedSeconds);

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

    timerDisplay.innerHTML = `
    			 <span class="recording-current-time">00:00</span>
    			 <span class="recording-separator"> / </span>
    			 <span class="recording-max-time">${maxTimeContent}</span>
    		 `;
    const currentTimeSpan = timerDisplay.querySelector(
      ".recording-current-time"
    );

    // Ensure initial display is 00:00 before interval fires
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
    micBtn.title = isMicMuted ? "Unmute microphone" : "Mute microphone";
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
      systemAudioBtn.title = isSystemMuted
        ? "Enable system audio"
        : "Mute system audio";

      systemAudioBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const isMuted = this.mediaCapture.toggleSystemAudio();
        this.updateSystemAudioVisual(isMuted);
      });
    } else {
      // CASE 2: Track is missing - Button is a disabled indicator/warning
      systemAudioBtn.setAttribute("disabled", "true");
      systemAudioBtn.style.opacity = "0.4"; // Visual cue for disabled
      systemAudioBtn.title =
        "System audio not captured. Stop and restart recording to include it.";

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
    pauseBtn.title = "Pause recording";
    pauseBtn.style.display = "flex"; // Ensure visible

    const resumeBtn = document.createElement("button");
    resumeBtn.className = "recording-control-btn recording-resume-btn";
    resumeBtn.innerHTML = icons.play;
    resumeBtn.style.display = "none";
    resumeBtn.title = "Resume recording";

    const stopBtn = document.createElement("button");
    stopBtn.className = "recording-control-btn recording-stop-btn";
    stopBtn.innerHTML = icons.stop;
    stopBtn.title = "Stop recording";

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

    // --- Append to Wrapper ---
    const recordingDot = document.createElement("div");
    recordingDot.className = "recording-dot";

    timerWrapper.append(
      recordingDot,
      timerDisplay,
      waveformCanvas, // Integrated waveform canvas
      micBtn,
      systemAudioBtn,
      pauseBtn,
      resumeBtn,
      stopBtn
    );
    document.body.appendChild(timerWrapper);

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
  }

  /**
   * Visually updates the mic button state.
   * @param {boolean} isMuted - The new mute state (true if muted).
   */
  updateMicVisual(isMuted) {
    const micBtn = document.querySelector(".recording-mic-btn");
    if (micBtn) {
      micBtn.innerHTML = isMuted ? icons.microhpone_disabled : icons.microhone;
      micBtn.title = isMuted ? "Unmute microphone" : "Mute microphone";
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
    if (systemBtn && !systemBtn.hasAttribute("disabled")) {
      systemBtn.innerHTML = isMuted ? icons.speaker_disabled : icons.speaker;
      systemBtn.title = isMuted ? "Enable system audio" : "Mute system audio";
      systemBtn.classList.toggle("muted", isMuted);
    }
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

    // Clear references
    this.pauseBtn = null;
    this.resumeBtn = null;
    this.timerDisplay = null;

    const timer = document.getElementById("recording-timer-wrapper");
    if (timer) timer.remove();
  }
}
