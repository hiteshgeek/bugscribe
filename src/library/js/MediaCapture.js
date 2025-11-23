export default class MediaCapture {
  constructor() {
    this.screenshotPreviews = [];
  }

  async captureAny() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: "screen" },
      });

      const track = stream.getVideoTracks()[0];
      const imageCapture = new ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();

      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bitmap, 0, 0);

      const imgURL = canvas.toDataURL("image/png");
      track.stop();
      return imgURL;
    } catch (err) {
      // If user cancels screen share
      if (err.name === "NotAllowedError" || err.name === "AbortError") {
        return false;
      }

      return false; // fallback
    }
  }

  async captureFullScreen() {
    const modifiedElements = []; // store elements & their old styles

    try {
      // Detect and temporarily change unsupported color styles
      document.querySelectorAll("*").forEach((el) => {
        const style = getComputedStyle(el);

        if (
          style.color.includes("color(") ||
          style.backgroundColor.includes("color(")
        ) {
          modifiedElements.push({
            el,
            originalColor: el.style.color,
            originalBg: el.style.backgroundColor,
          });

          if (style.color.includes("color(")) {
            el.style.color = "rgb(0,0,0)";
          }
          if (style.backgroundColor.includes("color(")) {
            el.style.backgroundColor = "white";
          }
        }
      });

      // Capture screenshot
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        scale: 2,
        logging: false,
      });

      return canvas.toDataURL("image/png");
    } catch (err) {
      console.error("Error capturing with html2canvas:", err);
      return false;
    } finally {
      // Restore original styles
      modifiedElements.forEach(({ el, originalColor, originalBg }) => {
        el.style.color = originalColor;
        el.style.backgroundColor = originalBg;
      });
    }
  }

  async captureVisibleScreen() {
    try {
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      // Create an overlay clone
      const clone = document.body.cloneNode(true);

      // Container to prevent layout flicker
      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.top = "0";
      container.style.left = "0";
      container.style.right = "0";
      container.style.bottom = "0";
      container.style.overflow = "hidden";
      container.style.zIndex = "-1"; // behind everything
      container.style.opacity = "0"; // invisible but still rendered
      container.style.pointerEvents = "none"; // ignore clicks

      clone.style.transform = `translate(-${scrollX}px, -${scrollY}px)`;
      clone.style.position = "absolute";

      container.appendChild(clone);
      document.body.appendChild(container); // add invisible clone to DOM

      const canvas = await html2canvas(clone, {
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        width: window.innerWidth,
        height: window.innerHeight,
        scale: 2,
      });

      container.remove(); // cleanup

      return canvas.toDataURL("image/png");
    } catch (err) {
      console.error("Error capturing visible screen:", err);
      return false;
    }
  }

  async captureSelectedArea() {
    return new Promise((resolve) => {
      let startX, startY, endX, endY;
      let isSelecting = false;
      let rafId = null;

      // Inject sanitizer <style> to prevent color() errors
      const injectColorSanitizerStyle = () => {
        const style = document.createElement("style");
        style.id = "html2canvas-color-sanitize";
        style.textContent = `
        * {
          color: rgb(0,0,0) !important;
          background-color: transparent !important;
          border-color: rgb(160,160,160) !important;
          outline-color: rgb(0,0,0) !important;
          text-decoration-color: rgb(0,0,0) !important;
          box-shadow: none !important;
        }
        *::before, *::after {
          color: rgb(0,0,0) !important;
          background-color: transparent !important;
        }
        svg, svg * {
          fill: rgb(0,0,0) !important;
          stroke: rgb(0,0,0) !important;
        }
      `;
        document.head.appendChild(style);
      };

      const removeSanitizerStyle = () => {
        const el = document.getElementById("html2canvas-color-sanitize");
        if (el) el.remove();
      };

      const backdrop = document.createElement("div");
      backdrop.className = "mc-backdrop";
      document.body.appendChild(backdrop);

      const selectionBox = document.createElement("div");
      selectionBox.className = "mc-selection-box";
      document.body.appendChild(selectionBox);

      document.body.classList.add("mc-selecting");

      const updateSelection = () => {
        const rect = {
          left: Math.min(startX, endX),
          top: Math.min(startY, endY),
          width: Math.abs(endX - startX),
          height: Math.abs(endY - startY),
        };

        Object.assign(selectionBox.style, {
          left: `${rect.left}px`,
          top: `${rect.top}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
        });

        // Create a "hole" in the backdrop using clip-path
        // This makes the selected area completely clear
        backdrop.style.clipPath = `polygon(
        evenodd,
        0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
        ${rect.left}px ${rect.top}px,
        ${rect.left}px ${rect.top + rect.height}px,
        ${rect.left + rect.width}px ${rect.top + rect.height}px,
        ${rect.left + rect.width}px ${rect.top}px,
        ${rect.left}px ${rect.top}px
      )`;

        rafId = null;
      };

      const onMouseDown = (e) => {
        isSelecting = true;
        startX = e.clientX;
        startY = e.clientY;
        endX = startX;
        endY = startY;
        Object.assign(selectionBox.style, {
          left: `${startX}px`,
          top: `${startY}px`,
          width: `0px`,
          height: `0px`,
          display: "block",
        });
      };

      const onMouseMove = (e) => {
        if (!isSelecting) return;
        endX = e.clientX;
        endY = e.clientY;

        if (!rafId) {
          rafId = requestAnimationFrame(updateSelection);
        }
      };

      const cleanup = () => {
        backdrop.remove();
        selectionBox.remove();
        document.body.classList.remove("mc-selecting");
        document.removeEventListener("mousedown", onMouseDown);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.removeEventListener("keydown", onKeyDown);
        if (rafId) cancelAnimationFrame(rafId);
      };

      const onMouseUp = async () => {
        if (!isSelecting) return;
        isSelecting = false;

        const rect = selectionBox.getBoundingClientRect();
        if (rect.width < 10 || rect.height < 10) {
          cleanup();
          resolve(false);
          return;
        }

        cleanup();
        await new Promise((r) => setTimeout(r, 50));

        injectColorSanitizerStyle();

        try {
          const canvas = await html2canvas(document.body, {
            useCORS: true,
            allowTaint: true,
            x: rect.left + window.scrollX,
            y: rect.top + window.scrollY,
            width: rect.width,
            height: rect.height,
            scrollX: -window.scrollX,
            scrollY: -window.scrollY,
            scale: 2,
            backgroundColor: null,
            logging: false,
          });

          removeSanitizerStyle();
          const imgURL = canvas.toDataURL("image/png");
          resolve(imgURL);
        } catch (err) {
          console.error("Selective capture failed:", err);
          removeSanitizerStyle();
          resolve(false);
        }
      };

      const onKeyDown = (e) => {
        if (e.key === "Escape") {
          isSelecting = false;
          cleanup();
          resolve(false);
        }
      };

      backdrop.addEventListener("mousedown", onMouseDown);
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      document.addEventListener("keydown", onKeyDown);
    });
  }

  async startRecording(captureMicrophone = true) {
    let mediaRecorder = null;
    let recordedChunks = [];
    let displayStream = null;
    let micStream = null;
    let audioContext = null;
    let audioDestination = null;
    let combinedStream = null;
    let startTime = Date.now();

    try {
      // Request screen capture with audio
      displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always",
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 48000,
        },
      });

      if (!displayStream) {
        throw new Error("Screen capture was denied");
      }

      const videoTrack = displayStream.getVideoTracks()[0];
      const systemAudioTrack = displayStream.getAudioTracks()[0];

      // Create audio context for mixing
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioDestination = audioContext.createMediaStreamDestination();

      // Add system audio if available
      if (systemAudioTrack) {
        const systemAudioStream = new MediaStream([systemAudioTrack]);
        const systemSource =
          audioContext.createMediaStreamSource(systemAudioStream);
        systemSource.connect(audioDestination);
        console.log("System audio connected");
      } else {
        console.warn("No system audio track available");
      }

      // Request and add microphone if enabled
      if (captureMicrophone) {
        try {
          micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });

          const micSource = audioContext.createMediaStreamSource(micStream);
          micSource.connect(audioDestination);
          console.log("Microphone audio connected");
        } catch (micError) {
          console.warn("Microphone access denied or not available:", micError);
        }
      }

      // Create combined stream with video and mixed audio
      const audioTracks = audioDestination.stream.getAudioTracks();

      if (audioTracks.length > 0) {
        combinedStream = new MediaStream([videoTrack, audioTracks[0]]);
        console.log("Combined stream created with audio");
      } else {
        combinedStream = new MediaStream([videoTrack]);
        console.warn("No audio tracks available, recording video only");
      }

      // Create MediaRecorder
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

      console.log("Using mimeType:", options.mimeType);

      mediaRecorder = new MediaRecorder(combinedStream, options);

      const recordingPromise = new Promise((resolve, reject) => {
        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          // Stop all tracks
          if (displayStream) {
            displayStream.getTracks().forEach((track) => track.stop());
          }
          if (micStream) {
            micStream.getTracks().forEach((track) => track.stop());
          }
          if (combinedStream) {
            combinedStream.getTracks().forEach((track) => track.stop());
          }

          // Close audio context only if not already closed
          if (audioContext && audioContext.state !== "closed") {
            audioContext.close().catch((err) => {
              console.warn("Error closing audio context:", err);
            });
          }

          // Create video blob
          const blob = new Blob(recordedChunks, { type: "video/webm" });
          const videoURL = URL.createObjectURL(blob);

          console.log("Recording stopped, blob size:", blob.size);

          resolve({
            url: videoURL,
            blob: blob,
            duration: Date.now() - startTime,
            size: blob.size,
            type: "video",
          });
        };

        mediaRecorder.onerror = (event) => {
          console.error("MediaRecorder error:", event.error);
          if (displayStream) {
            displayStream.getTracks().forEach((track) => track.stop());
          }
          if (micStream) {
            micStream.getTracks().forEach((track) => track.stop());
          }
          if (audioContext && audioContext.state !== "closed") {
            audioContext.close().catch((err) => {
              console.warn("Error closing audio context:", err);
            });
          }
          reject(new Error(`Recording failed: ${event.error.name}`));
        };
      });

      // Track when user stops sharing
      videoTrack.addEventListener("ended", () => {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
        }
      });

      // Start recording
      mediaRecorder.start(100);
      console.log("MediaRecorder started");

      // Store recorder instance
      this._activeRecorder = {
        recorder: mediaRecorder,
        displayStream: displayStream,
        micStream: micStream,
        combinedStream: combinedStream,
        audioContext: audioContext,
      };

      if (this.onRecordingStarted) {
        this.onRecordingStarted();
      }

      return recordingPromise;
    } catch (error) {
      // Cleanup on error
      if (displayStream) {
        displayStream.getTracks().forEach((track) => track.stop());
      }
      if (micStream) {
        micStream.getTracks().forEach((track) => track.stop());
      }
      if (combinedStream) {
        combinedStream.getTracks().forEach((track) => track.stop());
      }
      if (audioContext && audioContext.state !== "closed") {
        audioContext.close().catch((err) => {
          console.warn("Error closing audio context:", err);
        });
      }

      if (error.name === "NotAllowedError") {
        throw new Error("Screen recording permission was denied");
      } else if (error.name === "NotFoundError") {
        throw new Error("No screen capture source was selected");
      } else if (error.name === "NotSupportedError") {
        throw new Error("Screen recording is not supported in this browser");
      } else {
        throw error;
      }
    }
  }

  // Updated stopRecording method
  stopRecording() {
    if (this._activeRecorder) {
      const {
        recorder,
        displayStream,
        micStream,
        combinedStream,
        audioContext,
      } = this._activeRecorder;

      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }

      if (displayStream) {
        displayStream.getTracks().forEach((track) => track.stop());
      }
      if (micStream) {
        micStream.getTracks().forEach((track) => track.stop());
      }
      if (combinedStream) {
        combinedStream.getTracks().forEach((track) => track.stop());
      }
      if (audioContext && audioContext.state !== "closed") {
        audioContext.close().catch((err) => {
          console.warn("Error closing audio context:", err);
        });
      }

      this._activeRecorder = null;
    }
  }

  // Pause recording
  pauseRecording() {
    if (this._activeRecorder && this._activeRecorder.recorder) {
      const { recorder } = this._activeRecorder;
      if (recorder.state === "recording") {
        recorder.pause();
        console.log("Recording paused");
      }
    }
  }

  // Resume recording
  resumeRecording() {
    if (this._activeRecorder && this._activeRecorder.recorder) {
      const { recorder } = this._activeRecorder;
      if (recorder.state === "paused") {
        recorder.resume();
        console.log("Recording resumed");
      }
    }
  }

  // Check if recording is in progress
  isRecording() {
    return this._activeRecorder !== null;
  }

  // Create thumbnail from image URL
  async createImageThumbnail(imageUrl, maxWidth = 300, maxHeight = 200) {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        // Calculate thumbnail dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        // Create canvas for thumbnail
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.8);
        resolve(thumbnailUrl);
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = imageUrl;
    });
  }

  // Create thumbnail from video URL
  async createVideoThumbnail(
    videoUrl,
    maxWidth = 300,
    maxHeight = 200,
    timeInSeconds = 1
  ) {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.style.display = "none";
      document.body.appendChild(video);

      video.onloadedmetadata = () => {
        // Set time to capture frame (default 1 second or video start)
        video.currentTime = Math.min(timeInSeconds, video.duration);
      };

      video.onseeked = () => {
        try {
          // Calculate thumbnail dimensions maintaining aspect ratio
          let width = video.videoWidth;
          let height = video.videoHeight;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = width * ratio;
            height = height * ratio;
          }

          // Create canvas for thumbnail
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, width, height);

          const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.8);

          // Cleanup
          if (video.parentNode) {
            document.body.removeChild(video);
          }
          video.src = "";

          resolve(thumbnailUrl);
        } catch (error) {
          if (video.parentNode) {
            document.body.removeChild(video);
          }
          reject(error);
        }
      };

      video.onerror = () => {
        if (video.parentNode) {
          document.body.removeChild(video);
        }
        reject(new Error("Failed to load video"));
      };

      video.src = videoUrl;
      video.load();
    });
  }
}
