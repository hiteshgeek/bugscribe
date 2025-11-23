// VideoRecorder.js

import CursorHighlighter from "./CursorHighlighter.js";

/**
 * Defines standard video resolutions (width x height) and corresponding bitrates (bps).
 */
const VideoResolution = {
  P480: { width: 854, height: 480, bitrate: 1000000 }, // ~1 Mbps
  P720: { width: 1280, height: 720, bitrate: 2500000 }, // ~2.5 Mbps
  P1080: { width: 1920, height: 1080, bitrate: 5000000 }, // ~5 Mbps
  P1440: { width: 2560, height: 1440, bitrate: 10000000 }, // ~10 Mbps
  P2160: { width: 3840, height: 2160, bitrate: 18000000 }, // ~18 Mbps (4K)
};

/**
 * An object to easily access the bitrate values by resolution name.
 * Exported for external use.
 */
const VideoQuality = {
  P480: VideoResolution.P480.bitrate,
  P720: VideoResolution.P720.bitrate,
  P1080: VideoResolution.P1080.bitrate,
  P1440: VideoResolution.P1440.bitrate,
  P2160: VideoResolution.P2160.bitrate,
};

export default class VideoRecorder {
  /**
   * @type {object | null}
   * @private
   */
  _activeRecorder = null;
  /**
   * @type {CursorHighlighter}
   * @private
   */
  _cursorHighlighter;

  /**
   * Callback executed when recording starts.
   * @type {(isMicMuted: boolean) => void | null}
   */
  onRecordingStarted = null;

  constructor() {
    this._cursorHighlighter = new CursorHighlighter();
  }

  /**
   * Starts the video recording process, capturing screen/window/tab and optionally microphone.
   * @param {boolean} [captureMicrophone=true] - Whether to capture audio from the microphone.
   * @param {boolean} [startWithMicMuted=false] - Whether the microphone should start muted.
   * @param {object} [resolution=VideoResolution.P1080] - The desired resolution constraints (VideoResolution preset).
   * @returns {Promise<{url: string, blob: Blob, duration: number, size: number, type: string, width: number, height: number}>} A promise that resolves with the recording data.
   */
  async startRecording(
    captureMicrophone = true,
    startWithMicMuted = false,
    resolution = VideoResolution.P1080
  ) {
    let mediaRecorder = null;
    let recordedChunks = [];
    let displayStream = null;
    let micStream = null;
    let audioContext = null;
    let audioDestination = null;
    let combinedStream = null;
    let startTime = Date.now();

    const targetBitrate = resolution.bitrate;

    try {
      const videoConstraints = {
        cursor: "always",
        width: { ideal: resolution.width, max: resolution.width },
        height: { ideal: resolution.height, max: resolution.height },
        frameRate: { ideal: 30, max: 60 },
      };

      displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: videoConstraints,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 48000,
        },
      });

      const videoTrack = displayStream.getVideoTracks()[0];
      const systemAudioTrack = displayStream.getAudioTracks()[0];

      // Setup audio context and routing
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioDestination = audioContext.createMediaStreamDestination();

      if (systemAudioTrack) {
        const systemAudioStream = new MediaStream([systemAudioTrack]);
        const systemSource =
          audioContext.createMediaStreamSource(systemAudioStream);
        systemSource.connect(audioDestination);
      }

      if (captureMicrophone) {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        const micTrack = micStream.getAudioTracks()[0];
        if (micTrack) micTrack.enabled = !startWithMicMuted;

        const micSource = audioContext.createMediaStreamSource(micStream);
        micSource.connect(audioDestination);
      }

      const audioTracks = audioDestination.stream.getAudioTracks();
      combinedStream =
        audioTracks.length > 0
          ? new MediaStream([videoTrack, audioTracks[0]])
          : new MediaStream([videoTrack]);

      let options = {
        mimeType: "video/webm;codecs=vp9,opus",
        audioBitsPerSecond: 128000,
        videoBitsPerSecond: targetBitrate,
      };

      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = "video/webm;codecs=vp8,opus";
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: "video/webm" };
      }

      mediaRecorder = new MediaRecorder(combinedStream, options);

      // Start cursor highlighter
      this._cursorHighlighter.start();

      const recordingPromise = new Promise((resolve, reject) => {
        mediaRecorder.ondataavailable = (event) => {
          if (event.data?.size > 0) recordedChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
          // Stop cursor highlighter
          this._cursorHighlighter.stop();

          // Get final video settings
          const finalSettings = videoTrack.getSettings();

          displayStream?.getTracks().forEach((t) => t.stop());
          micStream?.getTracks().forEach((t) => t.stop());
          combinedStream?.getTracks().forEach((t) => t.stop());
          audioContext?.close();

          const blob = new Blob(recordedChunks, { type: "video/webm" });

          resolve({
            url: URL.createObjectURL(blob),
            blob,
            duration: Date.now() - startTime,
            size: blob.size,
            type: "video",
            width: finalSettings.width,
            height: finalSettings.height,
          });
        };

        mediaRecorder.onerror = (event) => {
          reject(new Error(`Recording failed: ${event.error.name}`));
        };
      });

      videoTrack.addEventListener("ended", () => {
        if (mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
        }
      });

      mediaRecorder.start(100);

      this._activeRecorder = {
        recorder: mediaRecorder,
        displayStream,
        micStream,
        combinedStream,
        audioContext,
        micMutedOnStart: startWithMicMuted,
      };

      if (this.onRecordingStarted) {
        this.onRecordingStarted(startWithMicMuted);
      }

      return recordingPromise;
    } catch (error) {
      // Clean up cursor highlighter on error
      this._cursorHighlighter.stop();

      displayStream?.getTracks().forEach((t) => t.stop());
      micStream?.getTracks().forEach((t) => t.stop());
      combinedStream?.getTracks().forEach((t) => t.stop());
      audioContext?.close();

      throw error;
    }
  }

  stopRecording() {
    if (this._activeRecorder) {
      this._activeRecorder.recorder?.stop();
    }
  }

  pauseRecording() {
    if (this._activeRecorder?.recorder?.state === "recording") {
      this._activeRecorder.recorder.pause();
    }
  }

  resumeRecording() {
    if (this._activeRecorder?.recorder?.state === "paused") {
      this._activeRecorder.recorder.resume();
    }
  }

  toggleMicrophone() {
    if (this._activeRecorder?.micStream) {
      const micTrack = this._activeRecorder.micStream.getAudioTracks()[0];
      if (micTrack) {
        micTrack.enabled = !micTrack.enabled;
        return !micTrack.enabled;
      }
    }
    return true;
  }

  isRecording() {
    return !!this._activeRecorder;
  }
}

// Export the resolution and quality presets for easier external usage
export { VideoResolution, VideoQuality };
