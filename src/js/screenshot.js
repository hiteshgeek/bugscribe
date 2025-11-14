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
    // Recording limits and timer state
    this.MAX_RECORD_SECONDS = 10; // default maximum recording length in seconds
    this._recordSeconds = 0;
    this._recordTimerInterval = null;
    this.recordBtn = null; // DOM reference to the record button (set in registerEvents)
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
    // Basic carousel modal structure: close, prev, next, slides container
    this.fullscreenModal.innerHTML =
      '<div id="screenshotModalInner" class="screenshot-modal-inner">' +
      '  <button id="closeScreenshotModal" class="screenshot-close" aria-label="Close">&times;</button>' +
      '  <div class="carousel-main" style="display:flex;align-items:center;gap:12px;">' +
      '    <button id="carouselPrev" class="screenshot-nav prev" aria-label="Previous">&#9664;</button>' +
      '    <div id="screenshotSlides" class="screenshot-slides" role="region" aria-label="Preview carousel"></div>' +
      '    <button id="carouselNext" class="screenshot-nav next" aria-label="Next">&#9654;</button>' +
      "  </div>" +
      '  <div id="screenshotThumbnailStrip" class="screenshot-thumbs" aria-label="Thumbnails"></div>' +
      "</div>";
    document.body.appendChild(this.fullscreenModal);
    // Minimal styles for the modal/carousel (scoped here for simplicity)
    if (!document.getElementById("screenshot-carousel-style")) {
      const style = document.createElement("style");
      style.id = "screenshot-carousel-style";
      style.textContent =
        "\n" +
        "#screenshotModal{display:none;position:fixed;inset:0;align-items:center;justify-content:center;background:rgba(0,0,0,0.78);z-index:2147483646} " +
        "#screenshotModal .screenshot-modal-inner{position:relative;display:flex;flex-direction:column;align-items:center;gap:12px;max-width:94vw;max-height:94vh;padding:12px;border-radius:8px} " +
        ".carousel-main{width:100%;display:flex;align-items:center;justify-content:center} " +
        "#screenshotSlides{flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;min-width:360px;min-height:200px} " +
        ".carousel-slide{display:none;align-items:center;justify-content:center;width:100%;height:100%} " +
        ".carousel-slide.active{display:flex} " +
        ".carousel-slide img,.carousel-slide video{max-width:86vw;max-height:68vh;border-radius:8px;box-shadow:0 12px 40px rgba(0,0,0,0.6);background:#111} " +
        ".screenshot-close{position:absolute;top:8px;right:8px;background:transparent;border:none;color:#fff;font-size:30px;cursor:pointer;z-index:3} " +
        ".screenshot-nav{background:rgba(0,0,0,0.45);border:none;color:#fff;padding:8px 12px;border-radius:8px;cursor:pointer;margin:0 6px} " +
        ".screenshot-nav:hover{background:rgba(0,0,0,0.65)} " +
        "#screenshotThumbnailStrip{display:flex;gap:8px;overflow-x:auto;padding:8px 6px;margin-top:8px;justify-content:center;width:100%;box-sizing:border-box} " +
        ".screenshot-thumb{width:96px;height:64px;object-fit:cover;border-radius:6px;opacity:0.75;cursor:pointer;border:2px solid transparent;transition:transform .12s,opacity .12s,box-shadow .12s} " +
        ".screenshot-thumb:hover{opacity:1;transform:translateY(-4px)} " +
        ".screenshot-thumb.active{opacity:1;border-color:#fff;box-shadow:0 8px 24px rgba(0,0,0,0.6);transform:translateY(-6px)}\n";
      document.head.appendChild(style);
    }
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
      // keep reference for timer/UI updates
      this.recordBtn = recordBtn;
      recordBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        if (!this.recording) {
          // attempt to start recording; startRecording handles errors and UI
          await this.startRecording();
        } else {
          // stopRecording handles UI cleanup
          await this.stopRecording();
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
    const closeBtn = document.getElementById("closeScreenshotModal");
    if (closeBtn)
      closeBtn.addEventListener("click", () => this.closeFullscreen());
    // Click outside image closes modal
    this.fullscreenModal.addEventListener("click", (e) => {
      if (e.target === this.fullscreenModal) {
        this.closeFullscreen(true);
      }
    });
    // Prev/Next nav
    const prev = document.getElementById("carouselPrev");
    const next = document.getElementById("carouselNext");
    if (prev)
      prev.addEventListener("click", (e) => {
        e.stopPropagation();
        this._showCarouselSlide(this._carouselIndex - 1);
      });
    if (next)
      next.addEventListener("click", (e) => {
        e.stopPropagation();
        this._showCarouselSlide(this._carouselIndex + 1);
      });
  }

  // Build slides and open at given 1-based preview index
  openCarouselAt(index) {
    // normalize
    const idx = Number(index) || 1;
    // build slides container
    const slidesContainer = document.getElementById("screenshotSlides");
    if (!slidesContainer) return;
    // clear existing slides
    slidesContainer.innerHTML = "";
    const previews = Array.from(
      this.previewContainer.querySelectorAll(".screenshot-preview")
    );
    previews.forEach((p, i) => {
      const slide = document.createElement("div");
      slide.className = "carousel-slide";
      slide.setAttribute("data-slide-index", i + 1);
      const type =
        p.getAttribute("data-type") ||
        (p.getAttribute("data-video-url") ? "video" : "image");
      if (type === "video") {
        const url = p.getAttribute("data-video-url");
        const v = document.createElement("video");
        v.src = url;
        v.controls = true;
        v.style.maxWidth = "90vw";
        v.style.maxHeight = "82vh";
        slide.appendChild(v);
      } else {
        const img = document.createElement("img");
        // for image previews, the <img> inside preview holds the src
        const srcImg = p.querySelector("img");
        if (srcImg) img.src = srcImg.src;
        img.alt = "Screenshot preview";
        slide.appendChild(img);
      }
      slidesContainer.appendChild(slide);
    });
    // set carousel index tracking (1-based)
    this._carouselTotal = Math.max(1, slidesContainer.children.length);
    this._carouselIndex = Math.min(Math.max(1, idx), this._carouselTotal);
    // build thumbnail strip
    const thumbs = document.getElementById("screenshotThumbnailStrip");
    if (thumbs) {
      thumbs.innerHTML = "";
      const previewsEls = Array.from(
        this.previewContainer.querySelectorAll(".screenshot-preview")
      );
      previewsEls.forEach((p, i) => {
        const thumbImg = document.createElement("img");
        thumbImg.className = "screenshot-thumb";
        const previewImg = p.querySelector("img");
        if (previewImg) thumbImg.src = previewImg.src;
        thumbImg.setAttribute("data-thumb-index", i + 1);
        thumbImg.addEventListener("click", (e) => {
          e.stopPropagation();
          this._showCarouselSlide(i + 1);
        });
        thumbs.appendChild(thumbImg);
      });
    }
    this.fullscreenModal.style.display = "flex";
    this._showCarouselSlide(this._carouselIndex);
  }

  // internal: show slide by 1-based index and pause/stop others
  _showCarouselSlide(index) {
    const slidesContainer = document.getElementById("screenshotSlides");
    if (!slidesContainer) return;
    const slides = Array.from(slidesContainer.children);
    if (!slides.length) return;
    // wrap index
    let idx = Number(index) || 1;
    if (idx < 1) idx = slides.length;
    if (idx > slides.length) idx = 1;
    // pause other videos
    slides.forEach((s, i) => {
      if (i + 1 === idx) {
        s.classList.add("active");
        const v = s.querySelector("video");
        if (v) {
          try {
            v.play();
          } catch (e) {}
        }
      } else {
        s.classList.remove("active");
        const v = s.querySelector("video");
        if (v) {
          try {
            v.pause();
            v.currentTime = 0;
          } catch (e) {}
        }
      }
    });
    // update thumbnail active state
    try {
      const thumbs = document.getElementById("screenshotThumbnailStrip");
      if (thumbs) {
        const items = Array.from(thumbs.querySelectorAll(".screenshot-thumb"));
        items.forEach((it, j) => {
          if (j + 1 === idx) it.classList.add("active");
          else it.classList.remove("active");
        });
        // ensure active thumb is visible
        const active = thumbs.querySelector(".screenshot-thumb.active");
        if (active)
          active.scrollIntoView({ behavior: "smooth", inline: "center" });
      }
    } catch (e) {}

    this._carouselIndex = idx;
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

  // --- Recording timer helpers ---
  _formatSeconds(sec) {
    const s = Math.max(0, Math.floor(sec));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  _startRecordTimer() {
    this._recordSeconds = 0;
    if (this._recordTimerInterval) clearInterval(this._recordTimerInterval);
    // update UI immediately
    if (this.recordBtn) {
      // append timer span if not present
      let span = this.recordBtn.querySelector(".record-timer");
      if (!span) {
        span = document.createElement("span");
        span.className = "record-timer ms-2";
        this.recordBtn.appendChild(span);
      }
      span.textContent = this._formatSeconds(this._recordSeconds);
    }
    this._recordTimerInterval = setInterval(() => {
      this._recordSeconds += 1;
      if (this.recordBtn) {
        const span = this.recordBtn.querySelector(".record-timer");
        if (span) span.textContent = this._formatSeconds(this._recordSeconds);
      }
      // stop if reached maximum
      if (this._recordSeconds >= this.MAX_RECORD_SECONDS) {
        try {
          this.stopRecording();
        } catch (e) {}
      }
    }, 1000);
  }

  _stopRecordTimer() {
    if (this._recordTimerInterval) {
      clearInterval(this._recordTimerInterval);
      this._recordTimerInterval = null;
    }
    this._recordSeconds = 0;
    if (this.recordBtn) {
      const span = this.recordBtn.querySelector(".record-timer");
      if (span) span.remove();
    }
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
      // update record button UI and start timer UI and auto-stop guard
      try {
        if (this.recordBtn) {
          this.recordBtn.classList.add("btn-danger");
          this.recordBtn.classList.remove("btn-outline-danger");
          // set base label (icon + text) but preserve timer span which _startRecordTimer will add
          // create an icon node and text node rather than using innerHTML to avoid wiping spans
          this.recordBtn.innerHTML = "";
          const icon = document.createElement("i");
          icon.className = "fa-solid fa-stop";
          this.recordBtn.appendChild(icon);
          const text = document.createTextNode(" Stop");
          this.recordBtn.appendChild(text);
        }
        this._startRecordTimer();
      } catch (e) {}
    } catch (err) {
      console.error("Recording failed", err);
      alert("Could not start recording: " + err.message);
    }
  }

  async stopRecording() {
    if (this.mediaRecorder && this.recording) {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
      this.recording = false;
    }
    // stop timer UI
    try {
      this._stopRecordTimer();
    } catch (e) {}
    // ensure record button UI resets if present
    try {
      if (this.recordBtn) {
        this.recordBtn.classList.remove("btn-danger");
        this.recordBtn.classList.add("btn-outline-danger");
        this.recordBtn.innerHTML =
          '<i class="fa-solid fa-circle-record"></i> Record';
      }
    } catch (e) {}
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
        wrapper.setAttribute("data-type", "video");

        const img = document.createElement("img");
        img.src = thumbData;
        img.title = "Click to play video";
        img.className = "thumb-img";
        wrapper.appendChild(img);

        const play = document.createElement("span");
        play.className = "thumb-play";
        play.innerHTML = '<i class="fa-solid fa-play"></i>';
        wrapper.appendChild(play);

        // click opens carousel modal at this preview index
        wrapper.addEventListener("click", () => {
          this.openCarouselAt(this.previewCount);
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
    wrapper.setAttribute("data-type", "image");
    const img = document.createElement("img");
    img.src = dataUrl;
    img.title = "Click to expand";
    img.className = "thumb-img";
    // clicking thumbnail opens the carousel at this preview
    // prefer attaching click to the wrapper so play overlay is included
    wrapper.addEventListener("click", () => {
      this.openCarouselAt(this.previewCount);
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
      // Pause and cleanup any videos inside the carousel slides
      const slidesContainer = document.getElementById("screenshotSlides");
      if (slidesContainer) {
        const vids = slidesContainer.querySelectorAll("video");
        vids.forEach((v) => {
          try {
            v.pause();
            v.removeAttribute("src");
            v.load();
          } catch (e) {}
        });
      }
      // Also handle legacy fullscreen element if present
      const el = document.getElementById("fullscreenScreenshotImg");
      if (el && el.tagName === "VIDEO") {
        try {
          el.pause();
        } catch (e) {}
        try {
          el.removeAttribute("src");
          el.load();
        } catch (e) {}
        this.currentPlayingVideoUrl = null;
        this.currentPlayingVideoElement = null;
        const newImg = document.createElement("img");
        newImg.id = "fullscreenScreenshotImg";
        newImg.style.maxWidth = "90vw";
        newImg.style.maxHeight = "90vh";
        if (el.parentNode) el.parentNode.replaceChild(newImg, el);
      }
    } catch (err) {
      console.error("Error cleaning up fullscreen video", err);
    }
    if (hideModal) {
      try {
        this.fullscreenModal.style.display = "none";
      } catch (e) {}
      // clear slides to free memory
      try {
        const slides = document.getElementById("screenshotSlides");
        if (slides) slides.innerHTML = "";
      } catch (e) {}
    }
  }
}

// Initialize on DOMContentLoaded
window.addEventListener("DOMContentLoaded", () => {
  new ScreenshotManager();
});
