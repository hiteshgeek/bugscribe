// MediaCapture.js
import ScreenshotCapture from "./ScreenshotCapture.js";
import VideoRecorder from "./VideoRecorder.js";
import ThumbnailGenerator from "./ThumbnailGenerator.js";

export default class MediaCapture {
  constructor() {
    this.screenshots = new ScreenshotCapture();
    this.video = new VideoRecorder();
    this.thumbnail = new ThumbnailGenerator(); // Proxy callbacks

    this.onRecordingStarted = null;
    this.video.onRecordingStarted = (micMuted) => {
      if (this.onRecordingStarted) this.onRecordingStarted(micMuted);
    };

    // NEW/UPDATED: Callbacks for state changes (Pause, Resume, Mic Toggle)
    this.onPause = () => {};
    this.onResume = () => {};
    this.onMicToggled = (isMuted) => {};
  } // Proxy Screenshot Methods

  captureAny() {
    return this.screenshots.captureAny();
  }

  captureFullScreen() {
    return this.screenshots.captureFullScreen();
  }

  captureVisibleScreen() {
    return this.screenshots.captureVisibleScreen();
  }

  captureSelectedArea() {
    return this.screenshots.captureSelectedArea();
  }

  captureFreeformArea() {
    return this.screenshots.captureFreeformArea();
  } // Proxy Video Methods

  startRecording(captureMicrophone, startWithMicMuted, resolution) {
    return this.video.startRecording(
      captureMicrophone,
      startWithMicMuted,
      resolution
    );
  }

  stopRecording() {
    return this.video.stopRecording();
  }

  pauseRecording = () => {
    const result = this.video.pauseRecording();
    this.onPause();
    return result;
  };

  resumeRecording = () => {
    const result = this.video.resumeRecording();
    this.onResume();
    return result;
  };

  toggleMicrophone = () => {
    const isNowMuted = this.video.toggleMicrophone();
    this.onMicToggled(isNowMuted);
    return isNowMuted;
  };

  isRecording = () => {
    return this.video.isRecording();
  };

  isPaused = () => {
    return this.video.isPaused();
  };

  getMicAnalyzer() {
    return this.video.getMicAnalyzer();
  } // Proxy Thumbnail Methods

  createImageThumbnail(url, w, h) {
    return this.thumbnail.createImageThumbnail(url, w, h);
  }

  createVideoThumbnail(url, w, h, t) {
    return this.thumbnail.createVideoThumbnail(url, w, h, t);
  }
}
