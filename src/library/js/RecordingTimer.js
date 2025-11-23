// RecordingTimer.js

import { icons } from "./icons.js";

export default class RecordingTimer {
  constructor(mediaCapture, maxRecordingSeconds) {
    this.mediaCapture = mediaCapture;
    this.maxRecordingSeconds = maxRecordingSeconds;
    this._interval = null;
    this._isPaused = false;
    this._pausedTime = 0;
  }

  show(micMutedOnStart = false) {
    this.hide(); // Clear any existing timer

    const timerWrapper = document.createElement("div");
    timerWrapper.id = "recording-timer-wrapper";
    timerWrapper.className = "recording-timer-wrapper bug-element";

    // --- Timer Display Setup ---
    const timerDisplay = document.createElement("div");
    timerDisplay.className = "recording-timer-display";
    const currentTime = document.createElement("span");
    currentTime.className = "recording-current-time";
    currentTime.textContent = "00:00";
    const maxMinutes = Math.floor(this.maxRecordingSeconds / 60);
    const maxSeconds = this.maxRecordingSeconds % 60;
    const maxTimeContent = `${String(maxMinutes).padStart(2, "0")}:${String(
      maxSeconds
    ).padStart(2, "0")}`;

    timerDisplay.innerHTML = `
      <span class="recording-current-time">00:00</span>
      <span class="recording-separator"> / </span>
      <span class="recording-max-time">${maxTimeContent}</span>
    `;
    const currentTimeSpan = timerDisplay.querySelector(
      ".recording-current-time"
    );

    // --- Mic Button Setup ---
    const micBtn = document.createElement("button");
    micBtn.className = "recording-control-btn recording-mic-btn";

    // Access the recorder state via the mediaCapture instance's video recorder
    const micTrack =
      this.mediaCapture.video._activeRecorder?.micStream?.getAudioTracks?.()[0] ||
      null;

    let isMicMuted;
    if (!micTrack) {
      isMicMuted = true;
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
      micBtn.innerHTML = isMuted ? icons.microhpone_disabled : icons.microhone;
      micBtn.title = isMuted ? "Unmute microphone" : "Mute microphone";
      micBtn.classList.toggle("muted", isMuted);
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
      this._isPaused = true;
      pauseBtn.style.display = "none";
      resumeBtn.style.display = "flex";
      timerDisplay.style.opacity = "0.6";
    });

    resumeBtn.addEventListener("click", () => {
      this.mediaCapture.resumeRecording();
      this._isPaused = false;
      resumeBtn.style.display = "none";
      pauseBtn.style.display = "flex";
      timerDisplay.style.opacity = "1";
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
    const startTime = Date.now();
    this._interval = setInterval(() => {
      if (this._isPaused) {
        this._pausedTime += 1000;
        return;
      }

      const elapsed = Math.floor(
        (Date.now() - startTime - this._pausedTime) / 1000
      );

      if (elapsed >= this.maxRecordingSeconds) {
        this.mediaCapture.stopRecording();
        return;
      }

      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      currentTimeSpan.textContent = `${String(minutes).padStart(
        2,
        "0"
      )}:${String(seconds).padStart(2, "0")}`;

      if (this.maxRecordingSeconds - elapsed <= 30) {
        currentTimeSpan.style.color = "#ff4444";
        timerDisplay.style.animation = "timer-warning 1s ease-in-out infinite";
      }
    }, 1000);
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
