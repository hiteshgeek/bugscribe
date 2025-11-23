import CursorHighlighter from "./CursorHighlighter.js";

export default class VideoRecorder {
  constructor() {
    this._activeRecorder = null;
    this.onRecordingStarted = null;
    this._cursorHighlighter = new CursorHighlighter(); // Initialize the highlighter
  }

  async startRecording(captureMicrophone = true, startWithMicMuted = false) {
    let mediaRecorder = null;
    let recordedChunks = [];
    let displayStream = null;
    let micStream = null;
    let audioContext = null;
    let audioDestination = null;
    let combinedStream = null;
    let startTime = Date.now();

    try {
      displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 48000,
        },
      });

      const videoTrack = displayStream.getVideoTracks()[0];
      const systemAudioTrack = displayStream.getAudioTracks()[0];

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
        videoBitsPerSecond: 2500000,
      };

      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = "video/webm;codecs=vp8,opus";
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: "video/webm" };
      }

      mediaRecorder = new MediaRecorder(combinedStream, options);

      // --- START CURSOR HIGHLIGHTER ---
      this._cursorHighlighter.start();
      // --------------------------------

      const recordingPromise = new Promise((resolve, reject) => {
        mediaRecorder.ondataavailable = (event) => {
          if (event.data?.size > 0) recordedChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
          // --- STOP CURSOR HIGHLIGHTER ---
          this._cursorHighlighter.stop();
          // -------------------------------

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
      // --- CLEAN UP CURSOR HIGHLIGHTER ON ERROR ---
      this._cursorHighlighter.stop();
      // --------------------------------------------

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
