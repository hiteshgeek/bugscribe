export class RecordingService {
  constructor() {
    this.mediaRecorder = null;
    this.chunks = [];
    this.overlay = null;
  }

  async start(onStop) {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });

    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(stream);

    this.mediaRecorder.ondataavailable = (e) =>
      e.data.size && this.chunks.push(e.data);
    this.mediaRecorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      onStop(new Blob(this.chunks, { type: "video/webm" }));
      this.removeCursorOverlay();
    };

    this.mediaRecorder.start();
    this.createCursorOverlay();
  }

  stop() {
    this.mediaRecorder?.stop();
  }

  createCursorOverlay() {
    // overlay + circle use CSS and CSS variables for positioning
    const overlay = document.createElement("div");
    overlay.className = "screenshot-cursor-overlay";

    const circle = document.createElement("div");
    circle.className = "screenshot-cursor-circle";
    overlay.appendChild(circle);

    document.body.appendChild(overlay);
    this.overlay = overlay;

    // keep handler reference so we can remove it later
    this._cursorHandler = (e) => {
      try {
        circle.style.setProperty("--cursor-left", e.clientX + "px");
        circle.style.setProperty("--cursor-top", e.clientY + "px");
      } catch (err) {}
    };

    document.addEventListener("pointermove", this._cursorHandler, {
      passive: true,
    });
  }

  removeCursorOverlay() {
    if (this._cursorHandler) {
      document.removeEventListener("pointermove", this._cursorHandler);
      this._cursorHandler = null;
    }
    this.overlay?.remove();
    this.overlay = null;
  }

  extractThumbnail(videoBlob) {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.src = URL.createObjectURL(videoBlob);
      video.addEventListener("loadeddata", () => {
        const c = document.createElement("canvas");
        c.width = 300;
        c.height = 180;
        c.getContext("2d").drawImage(video, 0, 0, 300, 180);
        resolve(c.toDataURL("image/png"));
      });
    });
  }
}
