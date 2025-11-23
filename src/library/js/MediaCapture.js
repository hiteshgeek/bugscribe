// MediaCapture.js
import ScreenshotCapture from "./ScreenshotCapture.js";
import VideoRecorder from "./VideoRecorder.js";
import ThumbnailGenerator from "./ThumbnailGenerator.js";

export default class MediaCapture {
  constructor() {
    this.screenshots = new ScreenshotCapture();
    this.video = new VideoRecorder();
    this.thumbnail = new ThumbnailGenerator();

    // Proxy callbacks
    this.onRecordingStarted = null;
    this.video.onRecordingStarted = (micMuted) => {
      if (this.onRecordingStarted) this.onRecordingStarted(micMuted);
    };
  }

  // Proxy Screenshot Methods
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

  // Proxy Video Methods
  startRecording(captureMicrophone, startWithMicMuted) {
    return this.video.startRecording(captureMicrophone, startWithMicMuted);
  }

  stopRecording() {
    return this.video.stopRecording();
  }

  pauseRecording() {
    return this.video.pauseRecording();
  }

  resumeRecording() {
    return this.video.resumeRecording();
  }

  toggleMicrophone() {
    return this.video.toggleMicrophone();
  }

  isRecording() {
    return this.video.isRecording();
  }

  // Proxy Thumbnail Methods
  createImageThumbnail(url, w, h) {
    return this.thumbnail.createImageThumbnail(url, w, h);
  }

  createVideoThumbnail(url, w, h, t) {
    return this.thumbnail.createVideoThumbnail(url, w, h, t);
  }
}
