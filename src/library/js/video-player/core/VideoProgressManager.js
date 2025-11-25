/**
 * VideoProgressManager - Manages video progress, seeking, and buffering
 */

import VideoUtils from '../utils/VideoUtils.js';

export default class VideoProgressManager {
  constructor(video, state, controls) {
    this.video = video;
    this.state = state;
    this.controls = controls;
  }

  /**
   * Start progress sync loop
   */
  startProgressSync() {
    const sync = () => {
      if (!this.state.isSeeking) {
        this.updateProgress();
      }
      if (this.video && this.state) {
        this.state.progressAnimationId = requestAnimationFrame(sync);
      }
    };
    this.state.progressAnimationId = requestAnimationFrame(sync);
  }

  /**
   * Update progress bar and time display
   */
  updateProgress() {
    const currentTime = this.video.currentTime || 0;
    
    // Track max time for duration estimation
    this.state.updateMaxTime(currentTime);
    
    // Get duration (estimated if needed)
    const duration = this.state.estimateDuration(this.video);
    
    if (!VideoUtils.isValidDuration(duration)) {
      this.controls.timeDisplay.textContent = `${VideoUtils.formatTime(currentTime)} / --:--`;
      this.controls.progressFilled.style.width = "0%";
      this.controls.progressHandle.style.left = "0";
      return;
    }

    const percent = (currentTime / duration) * 100;
    const clampedPercent = VideoUtils.clamp(percent, 0, 100);

    // Update progress bar and handle
    this.controls.progressFilled.style.width = `${clampedPercent}%`;
    this.controls.progressHandle.style.left = `${clampedPercent}%`;

    // Update time display
    if (this.state.timeDisplayMode === "remaining") {
      const remaining = duration - currentTime;
      this.controls.timeDisplay.textContent = 
        `-${VideoUtils.formatTime(remaining)} / ${VideoUtils.formatTime(duration)}`;
    } else {
      this.controls.timeDisplay.textContent = 
        `${VideoUtils.formatTime(currentTime)} / ${VideoUtils.formatTime(duration)}`;
    }
  }

  /**
   * Seek to position
   * @param {MouseEvent} e - Mouse event
   */
  seek(e) {
    const duration = this.state.estimateDuration(this.video);
    
    if (!VideoUtils.isValidDuration(duration)) return;

    const rect = this.controls.progressBar.getBoundingClientRect();
    const percent = VideoUtils.clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const newTime = percent * duration;

    if (isFinite(newTime) && newTime >= 0) {
      this.video.currentTime = newTime;

      // Update UI immediately
      const percentValue = percent * 100;
      this.controls.progressFilled.style.width = `${percentValue}%`;
      this.controls.progressHandle.style.left = `${percentValue}%`;
    }
  }

  /**
   * Update buffer bar
   */
  updateBuffer() {
    if (!this.video.buffered.length || !this.video.duration) return;
    const end = this.video.buffered.end(this.video.buffered.length - 1);
    this.controls.progressBuffer.style.width = 
      `${(end / this.video.duration) * 100}%`;
  }

  /**
   * Skip forward or backward
   * @param {number} seconds - Seconds to skip (negative for backward)
   */
  skip(seconds) {
    const duration = this.state.estimateDuration(this.video);
    const currentTime = this.video.currentTime || 0;
    const newTime = currentTime + seconds;

    if (VideoUtils.isValidDuration(duration)) {
      this.video.currentTime = VideoUtils.clamp(newTime, 0, duration);
    } else {
      this.video.currentTime = Math.max(0, newTime);
    }

    // Force immediate UI update
    requestAnimationFrame(() => this.updateProgress());
  }
}
