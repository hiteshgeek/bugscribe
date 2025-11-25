/**
 * VideoUtils - Helper functions for video player
 */

export default class VideoUtils {
  /**
   * Format seconds to MM:SS format
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time string
   */
  static formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  /**
   * Check if duration is valid
   * @param {number} duration - Duration to check
   * @returns {boolean} True if valid
   */
  static isValidDuration(duration) {
    return duration && !isNaN(duration) && isFinite(duration) && duration > 0;
  }

  /**
   * Clamp a value between min and max
   * @param {number} value - Value to clamp
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Clamped value
   */
  static clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Download a video file
   * @param {string} url - Video URL
   * @param {string} filename - Optional filename
   */
  static downloadVideo(url, filename = null) {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || `video_${Date.now()}.webm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Check if browser supports Picture-in-Picture
   * @returns {boolean} True if supported
   */
  static supportsPiP() {
    return document.pictureInPictureEnabled;
  }

  /**
   * Check if element is in fullscreen
   * @returns {boolean} True if fullscreen
   */
  static isFullscreen() {
    return !!document.fullscreenElement;
  }
}
