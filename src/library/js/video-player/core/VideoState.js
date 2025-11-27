/**
 * VideoState - Manages video player state
 * Handles duration estimation, time display mode, and playback rate
 */

export default class VideoState {
  constructor(options = {}) {
    this.isPlaying = false;
    this.isMuted = false;
    this.isSeeking = false;
    this.estimatedDuration = options.knownDuration || null;
    this.maxTimeObserved = 0;
    this.timeDisplayMode = "elapsed"; // "elapsed" or "remaining"
    this.playbackRate = 1;
    this.speedMenuOpen = false;
    this.settingsMenuOpen = false;
    this.progressAnimationId = null;
    this.centerIconTimeout = null;
  }

  /**
   * Update maximum time observed for duration estimation
   */
  updateMaxTime(currentTime) {
    if (currentTime > this.maxTimeObserved) {
      this.maxTimeObserved = currentTime;
    }
  }

  /**
   * Estimate duration if video.duration is Infinity
   */
  estimateDuration(video) {
    let duration = video.duration;

    // If we have a valid finite duration from the video, use it
    if (isFinite(duration) && duration > 0) {
      // Update estimated duration with actual duration once available
      if (!this.estimatedDuration || duration > this.estimatedDuration) {
        this.estimatedDuration = duration;
      }
      return duration;
    }

    // If duration is infinite or invalid, use estimation
    if (!isFinite(duration)) {
      if (this.estimatedDuration) {
        duration = this.estimatedDuration;
      } else if (this.maxTimeObserved > 0) {
        // Only estimate if we don't have one yet
        // Add a small buffer for streams, but don't keep updating it
        duration = this.maxTimeObserved + 10;
      }
    }

    return duration;
  }

  /**
   * Toggle time display mode between elapsed and remaining
   */
  toggleTimeDisplay() {
    this.timeDisplayMode =
      this.timeDisplayMode === "elapsed" ? "remaining" : "elapsed";
  }

  /**
   * Set playback rate
   */
  setPlaybackRate(rate) {
    this.playbackRate = rate;
  }

  /**
   * Toggle speed menu
   */
  toggleSpeedMenu() {
    this.speedMenuOpen = !this.speedMenuOpen;
  }

  /**
   * Close speed menu
   */
  closeSpeedMenu() {
    this.speedMenuOpen = false;
  }

  /**
   * Toggle settings menu
   */
  toggleSettingsMenu() {
    this.settingsMenuOpen = !this.settingsMenuOpen;
  }

  /**
   * Close settings menu
   */
  closeSettingsMenu() {
    this.settingsMenuOpen = false;
  }

  /**
   * Cleanup state
   */
  cleanup() {
    if (this.progressAnimationId) {
      cancelAnimationFrame(this.progressAnimationId);
      this.progressAnimationId = null;
    }

    if (this.centerIconTimeout) {
      clearTimeout(this.centerIconTimeout);
      this.centerIconTimeout = null;
    }
  }
}
