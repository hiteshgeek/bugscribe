// RecordingTimer.js

import { icons } from "./icons.js"; // Assuming 'icons.js' provides the necessary icon SVG strings

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

    // --- Mic Button Setup ---
    const micBtn = document.createElement("button");
    micBtn.className = "recording-control-btn recording-mic-btn";

    // Determine initial mic state
    const micTrack =
      this.mediaCapture.video._activeRecorder?.micStream?.getAudioTracks?.()[0] ||
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

    micBtn.addEventListener("click", () => {
      const isMuted = this.mediaCapture.toggleMicrophone();
      this.updateMicVisual(isMuted);
    });

    // --- Control Buttons Setup ---
    const pauseBtn = document.createElement("button");
    pauseBtn.className = "recording-control-btn recording-pause-btn";
    pauseBtn.innerHTML = icons.pause;
    pauseBtn.title = "Pause recording";

    const resumeBtn = document.createElement("button");
    resumeBtn.className = "recording-control-btn recording-resume-btn";
    resumeBtn.innerHTML = icons.play;
    resumeBtn.style.display = "none";
    resumeBtn.title = "Resume recording";

    const stopBtn = document.createElement("button");
    stopBtn.className = "recording-control-btn recording-stop-btn";
    stopBtn.innerHTML = icons.stop;
    stopBtn.title = "Stop recording";

    pauseBtn.addEventListener("click", () => {
      this.mediaCapture.pauseRecording();
      // In a well-structured application, the mediaCapture listener should call updateToPaused()
    });

    resumeBtn.addEventListener("click", () => {
      this.mediaCapture.resumeRecording();
      // In a well-structured application, the mediaCapture listener should call updateToResumed()
    });

    stopBtn.addEventListener("click", () => {
      this.mediaCapture.stopRecording();
    });

    // --- Append to Wrapper ---
    const recordingDot = document.createElement("div");
    recordingDot.className = "recording-dot";

    timerWrapper.append(
      recordingDot,
      timerDisplay,
      micBtn,
      pauseBtn,
      resumeBtn,
      stopBtn
    );
    document.body.appendChild(timerWrapper);

    // --- Start Timer Interval ---
    this._interval = setInterval(() => {
      if (this._isPaused) {
        // If paused, just accumulate time that passed since the last second
        this._pausedTime += 1000;
        return;
      }

      this._elapsedSeconds += 1; // Increment stable counter

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
    const pauseBtn = document.querySelector(".recording-pause-btn");
    const resumeBtn = document.querySelector(".recording-resume-btn");
    const timerDisplay = document.querySelector(".recording-timer-display");

    if (pauseBtn && resumeBtn && timerDisplay) {
      pauseBtn.style.display = "none";
      resumeBtn.style.display = "flex";
      timerDisplay.style.opacity = "0.6";
    }
  }

  /**
   * Visually and internally updates the timer state to RESUMED.
   */
  updateToResumed() {
    this._isPaused = false;
    // The time tracking relies on the incrementing counter (_elapsedSeconds), which is more stable.

    const pauseBtn = document.querySelector(".recording-pause-btn");
    const resumeBtn = document.querySelector(".recording-resume-btn");
    const timerDisplay = document.querySelector(".recording-timer-display");

    if (pauseBtn && resumeBtn && timerDisplay) {
      resumeBtn.style.display = "none";
      pauseBtn.style.display = "flex";
      timerDisplay.style.opacity = "1";
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

  hide() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
    const timer = document.getElementById("recording-timer-wrapper");
    if (timer) timer.remove();
  }
}
