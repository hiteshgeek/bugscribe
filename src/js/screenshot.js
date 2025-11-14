// screenshot.js
// Uses html2canvas to capture screenshot of the page and display preview

// Load html2canvas dynamically if not present
function loadHtml2Canvas(callback) {
  if (window.html2canvas) {
    callback();
    return;
  }
  var script = document.createElement("script");
  script.src =
    "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
  script.onload = callback;
  document.head.appendChild(script);
}

class ScreenshotManager {
  constructor() {
    this.previewContainer = null;
    this.fullscreenModal = null;
    this.previewCount = 0;
    this.recording = false;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.currentPlayingVideoUrl = null;
    this.currentPlayingVideoElement = null;
    this.recordedUrls = new Set(); // Track created blob URLs
    this.cursorOverlayElement = null; // Cursor highlight overlay element
    this.cursorOverlayListener = null; // Listener for cursor overlay
    this.initUI();
    this.registerEvents();
  }

  initUI() {
    // Use existing screenshot button and preview container in footer
    this.previewContainer = document.getElementById(
      "screenshotPreviewContainer"
    );
    // Modal for fullscreen view
    this.fullscreenModal = document.createElement("div");
    this.fullscreenModal.id = "screenshotModal";
    this.fullscreenModal.innerHTML =
      '<span id="closeScreenshotModal">&times;</span><img id="fullscreenScreenshotImg">';
    document.body.appendChild(this.fullscreenModal);
    // Revoke recorded object URLs on page unload to free memory
    window.addEventListener("beforeunload", () => {
      try {
        this.recordedUrls.forEach((u) => {
          try {
            URL.revokeObjectURL(u);
          } catch (e) {}
        });
      } catch (e) {}
    });
  }

  registerEvents() {
    // Default screenshot (full page)
    const screenshotBtn = document.getElementById("takeScreenshotBtn");
    if (screenshotBtn) {
      screenshotBtn.addEventListener("click", () => {
        this.takeScreenshot();
      });
    }
    // Dropdown: visible page screenshot
    const visibleBtn = document.getElementById("screenshotVisibleBtn");
    if (visibleBtn) {
      visibleBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.takeScreenshotVisible();
        // hide dropdown (Bootstrap)
        try {
          const group = visibleBtn.closest(".btn-group");
          const toggle = group && group.querySelector(".dropdown-toggle");
          if (toggle && window.bootstrap) {
            const inst =
              window.bootstrap.Dropdown.getInstance(toggle) ||
              new window.bootstrap.Dropdown(toggle);
            inst.hide();
          }
        } catch (err) {
          // ignore
        }
      });
    }
    // Dropdown: select area screenshot
    const areaBtn = document.getElementById("screenshotAreaBtn");
    if (areaBtn) {
      areaBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.startAreaSelection();
        // hide dropdown (Bootstrap)
        try {
          const group = areaBtn.closest(".btn-group");
          const toggle = group && group.querySelector(".dropdown-toggle");
          if (toggle && window.bootstrap) {
            const inst =
              window.bootstrap.Dropdown.getInstance(toggle) ||
              new window.bootstrap.Dropdown(toggle);
            inst.hide();
          }
        } catch (err) {
          // ignore
        }
      });
    }
    // Record button
    const recordBtn = document.getElementById("recordBtn");
    if (recordBtn) {
      recordBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        if (!this.recording) {
          await this.startRecording();
          recordBtn.classList.add("btn-danger");
          recordBtn.classList.remove("btn-outline-danger");
          recordBtn.innerHTML = '<i class="fa-solid fa-stop"></i> Stop';
        } else {
          await this.stopRecording();
          recordBtn.classList.remove("btn-danger");
          recordBtn.classList.add("btn-outline-danger");
          recordBtn.innerHTML =
            '<i class="fa-solid fa-circle-record"></i> Record';
        }
      });
    }
    // Keyboard shortcuts (Ctrl/Cmd + Shift + S/V/A)
    document.addEventListener("keydown", (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod || !e.shiftKey) return;
      const key = e.key.toLowerCase();
      if (key === "s") {
        e.preventDefault();
        this.takeScreenshot();
      } else if (key === "v") {
        e.preventDefault();
        this.takeScreenshotVisible();
      } else if (key === "a") {
        e.preventDefault();
        this.startAreaSelection();
      }
    });
    // Modal close -> use centralized cleanup to stop any playing video
    document
      .getElementById("closeScreenshotModal")
      .addEventListener("click", () => {
        this.closeFullscreen();
      });
    // Click outside image closes modal
    this.fullscreenModal.addEventListener("click", (e) => {
      if (
        e.target === this.fullscreenModal ||
        e.target.id === "closeFullscreenBtn"
      ) {
        this.closeFullscreen(true);
      }
    });
  }
  // Create and show a cursor highlight overlay that follows the cursor.
  createCursorOverlay() {
    if (this.cursorOverlayElement) return;
    // inject style for pulse animation if not present
    if (!document.getElementById("screenshot-cursor-style")) {
      const style = document.createElement("style");
      style.id = "screenshot-cursor-style";
      style.textContent =
        "@keyframes cursorPulse { 0% { transform: scale(1); opacity: 0.9 } 50% { transform: scale(1.35); opacity: 0.5 } 100% { transform: scale(1); opacity: 0.9 } }";
      document.head.appendChild(style);
    }
    const overlay = document.createElement("div");
    overlay.id = "screenshot-cursor-overlay";
    overlay.style.position = "fixed";
    overlay.style.left = "0";
    overlay.style.top = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "2147483647"; // very top

    const size = 48;
    const circle = document.createElement("div");
    circle.id = "screenshot-cursor-circle";
    // Use fixed positioning so the highlight stays tied to the viewport
    // and follows the native cursor even when elements have transforms.
    circle.style.position = "fixed";
    circle.style.width = size + "px";
    circle.style.height = size + "px";
    circle.style.borderRadius = "50%";
    // Semi-transparent filled highlight so the cursor remains visible
    circle.style.background = "rgba(255,85,0,0.28)";
    circle.style.boxShadow = "0 6px 18px rgba(255,85,0,0.35)";
    circle.style.willChange = "left, top";
    circle.style.left = "-9999px";
    circle.style.top = "-9999px";
    // No transition so the circle follows the cursor instantly
    circle.style.transition = "none";
    circle.style.pointerEvents = "none";
    circle.style.animation = "cursorPulse 1s infinite";

    overlay.appendChild(circle);
    document.body.appendChild(overlay);

    // mousemove / pointer listener
    const onMove = (e) => {
      const x = e.clientX - size / 2;
      const y = e.clientY - size / 2;
      // position via left/top for maximum compatibility
      circle.style.left = x + "px";
      circle.style.top = y + "px";
      // make highlight darker while moving
      try {
        if (typeof setActive === "function") setActive();
      } catch (e) {}
    };
    // touch support
    const onTouch = (e) => {
      const t = e.touches && e.touches[0];
      if (!t) return;
      const x = t.clientX - size / 2;
      const y = t.clientY - size / 2;
      circle.style.left = x + "px";
      circle.style.top = y + "px";
      try {
        if (typeof setActive === "function") setActive();
      } catch (e) {}
    };

    // make it darker while moving, and revert after idle
    let idleTimer = null;
    const setActive = () => {
      // darker fill and stronger shadow
      circle.style.background = "rgba(255,85,0,0.92)";
      circle.style.boxShadow = "0 8px 26px rgba(255,85,0,0.55)";
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        // revert to lighter appearance
        circle.style.background = "rgba(255,85,0,0.28)";
        circle.style.boxShadow = "0 6px 18px rgba(255,85,0,0.35)";
        idleTimer = null;
      }, 350);
      // store timer so cleanup can clear it
      try {
        this.cursorOverlayListener &&
          (this.cursorOverlayListener.idleTimer = idleTimer);
      } catch (e) {}
    };

    // Use pointer events (covers mouse, pen, touch) for best responsiveness.
    // Attach to multiple targets as some environments deliver events to
    // document instead of window, and include a mouse fallback.
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onTouch, { passive: true });

    this.cursorOverlayElement = overlay;
    this.cursorOverlayListener = { onMove, onTouch, idleTimer: null };
  }

  removeCursorOverlay() {
    if (!this.cursorOverlayElement) return;
    try {
      const { onMove, onTouch } = this.cursorOverlayListener || {};
      if (onMove) {
        try {
          window.removeEventListener("pointermove", onMove);
        } catch (e) {}
        try {
          document.removeEventListener("pointermove", onMove);
        } catch (e) {}
        try {
          window.removeEventListener("mousemove", onMove);
        } catch (e) {}
      }
      if (onTouch) {
        try {
          window.removeEventListener("touchmove", onTouch);
        } catch (e) {}
      }
    } catch (e) {}
    try {
      // clear any idle timer stored on the listener
      try {
        if (
          this.cursorOverlayListener &&
          this.cursorOverlayListener.idleTimer
        ) {
          clearTimeout(this.cursorOverlayListener.idleTimer);
          this.cursorOverlayListener.idleTimer = null;
        }
      } catch (e) {}
      this.cursorOverlayElement.remove();
    } catch (e) {}
    this.cursorOverlayElement = null;
    this.cursorOverlayListener = null;
  }

  // Screenshot of only the visible viewport
  takeScreenshotVisible() {
    loadHtml2Canvas(() => {
      html2canvas(document.body, {
        scrollY: -window.scrollY,
        height: window.innerHeight,
        windowHeight: window.innerHeight,
        width: window.innerWidth,
        windowWidth: window.innerWidth,
      }).then((canvas) => {
        // Crop to visible viewport
        const cropped = document.createElement("canvas");
        cropped.width = window.innerWidth;
        cropped.height = window.innerHeight;
        const ctx = cropped.getContext("2d");
        ctx.drawImage(
          canvas,
          0,
          0,
          window.innerWidth,
          window.innerHeight,
          0,
          0,
          window.innerWidth,
          window.innerHeight
        );
        const dataUrl = cropped.toDataURL("image/png");
        this.showPreview(dataUrl);
      });
    });
  }

  // Area selection logic
  startAreaSelection() {
    // Overlay for selection
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.left = 0;
    overlay.style.top = 0;
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.zIndex = 3000;
    overlay.style.cursor = "crosshair";
    overlay.style.background = "rgba(0,0,0,0.05)";
    document.body.appendChild(overlay);

    let startX, startY, endX, endY, rect;
    const selectionBox = document.createElement("div");
    selectionBox.style.position = "absolute";
    selectionBox.style.border = "2px dashed #007bff";
    selectionBox.style.background = "rgba(0,123,255,0.1)";
    overlay.appendChild(selectionBox);

    function setBox(x, y, w, h) {
      selectionBox.style.left = x + "px";
      selectionBox.style.top = y + "px";
      selectionBox.style.width = w + "px";
      selectionBox.style.height = h + "px";
    }

    function cleanup() {
      overlay.remove();
    }

    overlay.addEventListener("mousedown", (e) => {
      startX = e.clientX;
      startY = e.clientY;
      setBox(startX, startY, 0, 0);
      const onMove = (ev) => {
        endX = ev.clientX;
        endY = ev.clientY;
        const x = Math.min(startX, endX);
        const y = Math.min(startY, endY);
        const w = Math.abs(endX - startX);
        const h = Math.abs(endY - startY);
        setBox(x, y, w, h);
      };
      const onUp = (ev) => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        endX = ev.clientX;
        endY = ev.clientY;
        const x = Math.min(startX, endX);
        const y = Math.min(startY, endY);
        const w = Math.abs(endX - startX);
        const h = Math.abs(endY - startY);
        cleanup();
        if (w > 10 && h > 10) {
          // Take screenshot of area
          loadHtml2Canvas(() => {
            html2canvas(document.body).then((canvas) => {
              const cropped = document.createElement("canvas");
              cropped.width = w;
              cropped.height = h;
              const ctx = cropped.getContext("2d");
              ctx.drawImage(
                canvas,
                x + window.scrollX,
                y + window.scrollY,
                w,
                h,
                0,
                0,
                w,
                h
              );
              const dataUrl = cropped.toDataURL("image/png");
              this.showPreview(dataUrl);
            });
          });
        }
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
    overlay.addEventListener(
      "click",
      (e) => {
        // Prevent accidental click-through
        e.stopPropagation();
        e.preventDefault();
      },
      true
    );
  }

  // --- Recording ---
  async startRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      alert("Screen recording is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      this.recordedChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size) this.recordedChunks.push(e.data);
      };
      this.mediaRecorder.onstop = () => {
        // remove cursor overlay now that recording stopped
        try {
          this.removeCursorOverlay();
        } catch (e) {}
        // stop tracks
        try {
          stream.getTracks().forEach((t) => t.stop());
        } catch (e) {}
        const blob = new Blob(this.recordedChunks, { type: "video/webm" });
        this.handleRecorded(blob);
      };
      this.mediaRecorder.start();
      this.recording = true;
      // show cursor highlight overlay during recording
      try {
        this.createCursorOverlay();
      } catch (e) {}
    } catch (err) {
      console.error("Recording failed", err);
      alert("Could not start recording: " + err.message);
    }
  }

  async stopRecording() {
    if (this.mediaRecorder && this.recording) {
      this.mediaRecorder.stop();
      this.recording = false;
    }
  }

  async handleRecorded(blob) {
    const url = URL.createObjectURL(blob);
    // keep track of created URLs so they can be revoked on unload
    try {
      this.recordedUrls.add(url);
    } catch (e) {}
    // Create a thumbnail image from the first frame
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    // seek to a short time to ensure frame is available
    const captureThumbnail = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(320, video.videoWidth || 320);
        canvas.height = Math.min(180, video.videoHeight || 180);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbData = canvas.toDataURL("image/png");
        // add preview but associate video URL so on expand we play it
        this.previewCount += 1;
        const wrapper = document.createElement("div");
        wrapper.className = "screenshot-preview position-relative";
        wrapper.setAttribute("data-preview-index", this.previewCount);
        wrapper.setAttribute("data-video-url", url);

        const img = document.createElement("img");
        img.src = thumbData;
        img.title = "Click to play video";
        img.className = "thumb-img";
        wrapper.appendChild(img);

        const play = document.createElement("span");
        play.className = "thumb-play";
        play.innerHTML = '<i class="fa-solid fa-play"></i>';
        wrapper.appendChild(play);

        // click opens modal and plays video via centralized method
        wrapper.addEventListener("click", () => {
          this.expandVideo(url);
        });

        this.previewContainer.appendChild(wrapper);
      } catch (err) {
        console.error("thumbnail capture failed", err);
        // fallback: show video icon
        this.showPreview(url);
      }
    };
    video.addEventListener("loadeddata", () => {
      // try capture at 0.1s
      try {
        video.currentTime = Math.min(0.1, video.duration / 2);
      } catch (e) {}
      setTimeout(captureThumbnail, 300);
    });
    // ensure metadata loads
    video.addEventListener("error", () => {
      // fallback to using video itself in preview
      this.showPreview(url);
    });
  }

  takeScreenshot() {
    loadHtml2Canvas(() => {
      html2canvas(document.body).then((canvas) => {
        const dataUrl = canvas.toDataURL("image/png");
        this.showPreview(dataUrl);
      });
    });
  }

  showPreview(dataUrl) {
    // Create preview wrapper with numbered overlay
    this.previewCount += 1;
    const wrapper = document.createElement("div");
    wrapper.className = "screenshot-preview position-relative";
    wrapper.setAttribute("data-preview-index", this.previewCount);

    const img = document.createElement("img");
    img.src = dataUrl;
    img.title = "Click to expand";
    img.className = "thumb-img";
    img.addEventListener("click", () => {
      this.expandScreenshot(dataUrl);
    });

    const number = document.createElement("span");
    number.className = "thumb-number";
    number.textContent = String(this.previewCount);

    wrapper.appendChild(img);
    wrapper.appendChild(number);
    this.previewContainer.appendChild(wrapper);
  }

  expandScreenshot(dataUrl) {
    // Ensure any playing video is stopped/cleaned before showing image
    this.closeFullscreen(false);
    const imgEl = document.getElementById("fullscreenScreenshotImg");
    if (imgEl && imgEl.tagName === "IMG") {
      imgEl.src = dataUrl;
    } else {
      // replace existing element with an img
      const newImg = document.createElement("img");
      newImg.id = "fullscreenScreenshotImg";
      newImg.style.maxWidth = "90vw";
      newImg.style.maxHeight = "90vh";
      newImg.src = dataUrl;
      if (imgEl) imgEl.replaceWith(newImg);
      else this.fullscreenModal.appendChild(newImg);
    }
    this.fullscreenModal.style.display = "flex";
  }

  // Open modal and play a video URL
  expandVideo(url) {
    // cleanup any previous
    this.closeFullscreen(false);
    const imgEl = document.getElementById("fullscreenScreenshotImg");
    // create video element
    const v = document.createElement("video");
    v.id = "fullscreenScreenshotImg";
    v.src = url;
    v.controls = true;
    v.autoplay = true;
    v.style.maxWidth = "90vw";
    v.style.maxHeight = "90vh";
    // replace img element
    if (imgEl) imgEl.replaceWith(v);
    else this.fullscreenModal.appendChild(v);
    this.currentPlayingVideoElement = v;
    this.currentPlayingVideoUrl = url;
    this.fullscreenModal.style.display = "flex";
  }

  // Close fullscreen modal and cleanup any playing video. If hideModal is true (default) hide the modal.
  closeFullscreen(hideModal = true) {
    // if a video is present, pause and revoke
    try {
      const el = document.getElementById("fullscreenScreenshotImg");
      if (el && el.tagName === "VIDEO") {
        try {
          el.pause();
        } catch (e) {}
        // remove src to stop streaming
        try {
          el.removeAttribute("src");
        } catch (e) {}
        try {
          el.load();
        } catch (e) {}
        // Do not revoke the object URL here so the user can re-open the
        // recorded video after closing the modal. Recorded URLs are revoked
        // on page unload to free resources.
        this.currentPlayingVideoUrl = null;
        this.currentPlayingVideoElement = null;
        // replace video with an img placeholder for future screenshots
        const newImg = document.createElement("img");
        newImg.id = "fullscreenScreenshotImg";
        newImg.style.maxWidth = "90vw";
        newImg.style.maxHeight = "90vh";
        if (el.parentNode) el.parentNode.replaceChild(newImg, el);
      }
    } catch (err) {
      console.error("Error cleaning up fullscreen video", err);
    }
    if (hideModal) this.fullscreenModal.style.display = "none";
  }
}

// Initialize on DOMContentLoaded
window.addEventListener("DOMContentLoaded", () => {
  new ScreenshotManager();
});
