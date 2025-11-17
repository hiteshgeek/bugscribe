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
    // --- Report Bug modal markup ---
    const reportModal = document.createElement("div");
    reportModal.className = "modal fade";
    reportModal.id = "reportBugModal";
    reportModal.tabIndex = -1;
    reportModal.innerHTML = `
        <div class="modal-dialog modal-lg modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Report Bug</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="mb-2"><label class="form-label">Page URL</label><input id="reportUrl" class="form-control" readonly></div>
              <div class="mb-2"><label class="form-label">Message</label><textarea id="reportMessage" class="form-control" rows="4" placeholder="Describe the bug..."></textarea></div>
              <div class="mb-2"><label class="form-label">Attached Media</label>
                <div id="reportMediaList" class="d-flex flex-wrap gap-2"></div>
              </div>
              <div id="reportStatus" class="text-muted small"></div>
              <div id="reportUploadProgress" class="mt-2" style="display:none">
                <div class="progress">
                  <div id="reportProgressBar" class="progress-bar" role="progressbar" style="width:0%" aria-valuemin="0" aria-valuemax="100">0%</div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" id="submitReportBtn" class="btn btn-primary">Submit Report</button>
            </div>
          </div>
        </div>`;
    document.body.appendChild(reportModal);
    this.reportModalEl = reportModal;
    // Basic carousel modal structure: close, prev, next, slides container
    this.fullscreenModal.innerHTML =
      '<div id="screenshotModalInner" class="screenshot-modal-inner">' +
      '  <button id="closeScreenshotModal" class="screenshot-close" aria-label="Close">&times;</button>' +
      '  <div class="carousel-main">' +
      '    <button id="carouselPrev" class="screenshot-nav prev" aria-label="Previous">&#9664;</button>' +
      '    <div id="screenshotSlides" class="screenshot-slides" role="region" aria-label="Preview carousel"></div>' +
      '    <button id="carouselNext" class="screenshot-nav next" aria-label="Next">&#9654;</button>' +
      "  </div>" +
      '  <div id="screenshotThumbnailStrip" class="screenshot-thumbs" aria-label="Thumbnails"></div>' +
      "</div>";
    document.body.appendChild(this.fullscreenModal);
    // Modal/carousel CSS moved to `src/css/screenshot.css` for maintainability.
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
    // Add a 'Clear All' button to the preview area for quick cleanup
    try {
      if (this.previewContainer) {
        const clearBtn = document.createElement("button");
        clearBtn.id = "clearAllPreviewsBtn";
        clearBtn.className = "btn btn-sm btn-outline-secondary ms-2";
        clearBtn.title = "Remove all previews";
        clearBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Clear All';
        clearBtn.addEventListener("click", (e) => {
          e.preventDefault();
          this._clearAllPreviews();
        });
        // content block: media + delete button (horizontal)
        this.previewContainer.appendChild(clearBtn);
      }
    } catch (e) {}
  }

  registerEvents() {
    // Default screenshot (full page)
    const screenshotBtn = document.getElementById("takeScreenshotBtn");
    if (screenshotBtn) {
      screenshotBtn.addEventListener("click", () => {
        this.takeScreenshot();
      });
    }

    // Report Bug button
    try {
      const reportBtn = document.querySelector(".report-btn");
      if (reportBtn) {
        reportBtn.addEventListener("click", (ev) => {
          ev.preventDefault();
          this._openReportModal();
        });
      }
      const submitBtn = document.getElementById("submitReportBtn");
      if (submitBtn) {
        submitBtn.addEventListener("click", (ev) => {
          ev.preventDefault();
          this._submitReport();
        });
      }
    } catch (e) {}
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
        // sizing handled by CSS (.carousel-slide video)
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
    // show modal by toggling CSS class
    this.fullscreenModal.classList.add("open");
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
    // Use CSS classes defined in `src/css/screenshot.css` for cursor overlay
    const overlay = document.createElement("div");
    overlay.className = "screenshot-cursor-overlay";

    const circle = document.createElement("div");
    circle.className = "screenshot-cursor-circle";

    overlay.appendChild(circle);
    document.body.appendChild(overlay);

    // mousemove / pointer listener
    const onMove = (e) => {
      const rect = circle.getBoundingClientRect();
      const size = rect.width || 48;
      const x = e.clientX - size / 2;
      const y = e.clientY - size / 2;
      // position via CSS variables for maximum compatibility
      circle.style.setProperty("--cursor-left", x + "px");
      circle.style.setProperty("--cursor-top", y + "px");
      // make highlight darker while moving
      try {
        if (typeof setActive === "function") setActive();
      } catch (e) {}
    };
    // touch support
    const onTouch = (e) => {
      const t = e.touches && e.touches[0];
      if (!t) return;
      const rect = circle.getBoundingClientRect();
      const size = rect.width || 48;
      const x = t.clientX - size / 2;
      const y = t.clientY - size / 2;
      circle.style.setProperty("--cursor-left", x + "px");
      circle.style.setProperty("--cursor-top", y + "px");
      try {
        if (typeof setActive === "function") setActive();
      } catch (e) {}
    };

    // make it darker while moving, and revert after idle
    let idleTimer = null;
    const setActive = () => {
      // toggle active appearance via CSS class
      circle.classList.add("active");
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        // revert to lighter appearance
        circle.classList.remove("active");
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

  // Remove a single preview element and clean up any associated resources
  _removePreviewElement(wrapper) {
    if (!wrapper || !wrapper.parentNode) return;
    try {
      // if it's a video preview, revoke its object URL
      const videoUrl = wrapper.getAttribute("data-video-url");
      if (videoUrl) {
        try {
          // stop any playing video elements that reference this URL
          const vids = wrapper.querySelectorAll("video");
          vids.forEach((v) => {
            try {
              v.pause();
              v.removeAttribute("src");
              v.load();
            } catch (e) {}
          });
        } catch (e) {}
        try {
          URL.revokeObjectURL(videoUrl);
        } catch (e) {}
        try {
          this.recordedUrls.delete(videoUrl);
        } catch (e) {}
      }
      // remove the element from DOM
      wrapper.remove();
    } catch (e) {
      console.error("Failed to remove preview", e);
    }
    // renumber remaining previews so numbering stays contiguous
    try {
      const previews = Array.from(
        this.previewContainer.querySelectorAll(".screenshot-preview")
      );
      previews.forEach((p, idx) => {
        const newIndex = idx + 1;
        p.setAttribute("data-preview-index", String(newIndex));
        const num = p.querySelector(".thumb-number");
        if (num) num.textContent = String(newIndex);
        // also update any thumb-img data-thumb-index if present
        const thumbImg = p.querySelector(".screenshot-thumb");
        if (thumbImg)
          thumbImg.setAttribute("data-thumb-index", String(newIndex));
      });
      // keep previewCount in sync with current number
      this.previewCount = previews.length;
    } catch (e) {
      // ignore renumber errors
    }
    // if modal is open, close it to avoid stale slides
    try {
      if (
        this.fullscreenModal &&
        this.fullscreenModal.classList &&
        this.fullscreenModal.classList.contains("open")
      ) {
        this.closeFullscreen(true);
      }
    } catch (e) {}
  }

  // Remove all previews and revoke created blob URLs
  _clearAllPreviews() {
    try {
      // revoke tracked recorded URLs
      try {
        this.recordedUrls.forEach((u) => {
          try {
            URL.revokeObjectURL(u);
          } catch (e) {}
        });
      } catch (e) {}
      this.recordedUrls.clear();
      // remove preview elements
      const items = Array.from(
        this.previewContainer.querySelectorAll(".screenshot-preview")
      );
      items.forEach((it) => {
        try {
          it.remove();
        } catch (e) {}
      });
      // reset preview counter so new screenshots start from 1
      try {
        this.previewCount = 0;
      } catch (e) {}
    } catch (e) {
      console.error("Failed clearing previews", e);
    }
    // close any open modal/carousel
    try {
      this.closeFullscreen(true);
    } catch (e) {}
  }

  // ---------------- Report modal helpers ----------------
  _openReportModal() {
    if (!this.reportModalEl) return;
    const bsModal = new bootstrap.Modal(this.reportModalEl);
    const urlInput = this.reportModalEl.querySelector("#reportUrl");
    const msgInput = this.reportModalEl.querySelector("#reportMessage");
    const mediaList = this.reportModalEl.querySelector("#reportMediaList");
    urlInput.value = window.location.href;
    msgInput.value = "";
    mediaList.innerHTML = "";
    // populate current previews
    const previews = Array.from(
      this.previewContainer.querySelectorAll(".screenshot-preview")
    );
    previews.forEach((p, idx) => {
      const item = document.createElement("div");
      item.className = "card p-1 report-media-item";
      item.dataset.previewIndex = idx;
      const thumb = p.querySelector("img, video");
      // If this preview is a video, show a small video element (with poster if available)
      let mediaEl;
      const isVideo =
        p.getAttribute("data-type") === "video" ||
        p.getAttribute("data-video-url");
      if (isVideo) {
        const videoEl = document.createElement("video");
        videoEl.className = "report-media-thumb";
        videoEl.controls = true;
        // prefer original blob attached to wrapper, else use data-video-url
        const origBlob = p.__originalBlob || p.__origBlob || null;
        if (origBlob) {
          try {
            videoEl.src = URL.createObjectURL(origBlob);
          } catch (e) {}
        } else if (p.getAttribute("data-video-url")) {
          videoEl.src = p.getAttribute("data-video-url");
        }
        // set poster from preview img if present
        const previewImg = p.querySelector("img");
        if (previewImg && previewImg.src)
          videoEl.setAttribute("poster", previewImg.src);
        mediaEl = videoEl;
      } else {
        const img = document.createElement("img");
        img.className = "report-media-thumb";
        if (thumb && thumb.tagName === "IMG") img.src = thumb.src || "";
        else if (thumb && thumb.tagName === "VIDEO")
          img.src = thumb.dataset.thumb || "";
        mediaEl = img;
      }
      const btnRow = document.createElement("div");
      btnRow.className = "report-media-btnrow";
      const viewBtn = document.createElement("button");
      viewBtn.className = "btn btn-sm btn-outline-primary";
      viewBtn.textContent = "View";
      viewBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.openCarouselAt(idx + 1);
      });
      const delBtn = document.createElement("button");
      delBtn.className = "btn btn-sm btn-outline-danger";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const wrapper = this.previewContainer.querySelectorAll(
          ".screenshot-preview"
        )[idx];
        if (wrapper) this._removePreviewElement(wrapper);
        item.remove();
      });
      btnRow.appendChild(viewBtn);
      btnRow.appendChild(delBtn);
      item.appendChild(mediaEl);
      item.appendChild(btnRow);
      mediaList.appendChild(item);
    });
    bsModal.show();
  }

  _closeReportModal() {
    if (!this.reportModalEl) return;
    const bsModal = bootstrap.Modal.getInstance(this.reportModalEl);
    if (bsModal) bsModal.hide();
  }

  // helper: convert data URL to Blob
  _dataURLToBlob(dataurl) {
    const parts = dataurl.split(",");
    const matches = parts[0].match(/:(.*?);/);
    const mime = matches ? matches[1] : "application/octet-stream";
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  }

  _gatherMediaForReport() {
    // For each preview return { blob, filename, mime, thumbBlob, thumbName }
    const previews = Array.from(
      this.previewContainer.querySelectorAll(".screenshot-preview")
    );
    const promises = previews.map((p, idx) => {
      const img = p.querySelector("img");
      const vid = p.querySelector("video");
      const wrapperVideoUrl = p.getAttribute("data-video-url");

      // helper to create resized thumbnail for an image blob
      const createImageThumb = (blob, maxW = 320) => {
        return new Promise((resolve) => {
          try {
            const url = URL.createObjectURL(blob);
            const i = new Image();
            i.onload = function () {
              const ratio = i.width ? Math.min(1, maxW / i.width) : 1;
              const w = Math.round(i.width * ratio);
              const h = Math.round(i.height * ratio);
              const c = document.createElement("canvas");
              c.width = w;
              c.height = h;
              const ctx = c.getContext("2d");
              ctx.drawImage(i, 0, 0, w, h);
              c.toBlob(
                (thumbBlob) => {
                  URL.revokeObjectURL(url);
                  resolve(thumbBlob);
                },
                "image/jpeg",
                0.8
              );
            };
            i.onerror = function () {
              URL.revokeObjectURL(url);
              resolve(null);
            };
            i.src = url;
          } catch (e) {
            resolve(null);
          }
        });
      };

      const srcUrl =
        wrapperVideoUrl ||
        (vid ? vid.getAttribute("data-video-url") || vid.src || "" : "");

      // If preview is a video (has srcUrl or data-type=video), handle video first
      if (srcUrl || p.getAttribute("data-type") === "video") {
        // find the thumbnail image inside the preview (we created it earlier in UI)
        const previewImg = p.querySelector(".thumb-img");
        let thumbPromise = Promise.resolve(null);
        if (
          previewImg &&
          previewImg.src &&
          previewImg.src.indexOf("data:") === 0
        ) {
          thumbPromise = Promise.resolve(this._dataURLToBlob(previewImg.src));
        } else if (previewImg && previewImg.src) {
          thumbPromise = fetch(previewImg.src)
            .then((r) => r.blob())
            .catch(() => null);
        }
        // prefer using the original blob stored on the wrapper (set in handleRecorded)
        const origBlob = p.__originalBlob || p.__origBlob || null;
        if (origBlob) {
          return Promise.resolve({
            blob: origBlob,
            filename: `recording_${idx + 1}.webm`,
            mime: origBlob.type || "video/webm",
            thumbBlob: null,
            thumbName: `recording_${idx + 1}_thumb.jpg`,
          }).then((obj) => {
            // attach thumbnail if available
            return thumbPromise.then((thumbBlob) => {
              obj.thumbBlob = thumbBlob;
              return obj;
            });
          });
        }
        // fallback: fetch the original video blob
        if (srcUrl) {
          return fetch(srcUrl)
            .then((r) => r.blob())
            .then((blob) => {
              return thumbPromise.then((thumbBlob) => ({
                blob: blob,
                filename: `recording_${idx + 1}.webm`,
                mime: blob.type || "video/webm",
                thumbBlob: thumbBlob,
                thumbName: `recording_${idx + 1}_thumb.jpg`,
              }));
            })
            .catch(() => null);
        }
      }

      // IMAGE branch
      if (img) {
        const src = img.src || "";
        if (src.indexOf("data:") === 0) {
          const blob = this._dataURLToBlob(src);
          return createImageThumb(blob).then((thumbBlob) => ({
            blob: blob,
            filename: `screenshot_${idx + 1}.png`,
            mime: blob.type || "image/png",
            thumbBlob: thumbBlob,
            thumbName: `screenshot_${idx + 1}_thumb.jpg`,
          }));
        }
        // fetch original
        return fetch(src)
          .then((r) => r.blob())
          .then((blob) => {
            return createImageThumb(blob).then((thumbBlob) => ({
              blob: blob,
              filename: `screenshot_${idx + 1}.png`,
              mime: blob.type || "image/png",
              thumbBlob: thumbBlob,
              thumbName: `screenshot_${idx + 1}_thumb.jpg`,
            }));
          })
          .catch(() => null);
      }
      return Promise.resolve(null);
    });
    return Promise.all(promises).then((arr) => arr.filter((a) => a));
  }

  async _submitReport() {
    const statusEl = this.reportModalEl.querySelector("#reportStatus");
    statusEl.textContent = "Preparing report...";
    const url = this.reportModalEl.querySelector("#reportUrl").value;
    const message = this.reportModalEl.querySelector("#reportMessage").value;
    try {
      const mediaItems = await this._gatherMediaForReport();
      statusEl.textContent = "Uploading report...";
      const form = new FormData();
      form.append("page_url", url);
      form.append("message", message);
      mediaItems.forEach((it, i) => {
        try {
          // append original
          form.append("attachments[]", it.blob, it.filename || `file_${i}`);
          // append thumbnail if present
          if (it.thumbBlob) {
            // append thumbnail with explicit index so server can map thumbs to originals
            form.append(
              `attachments_thumb[${i}]`,
              it.thumbBlob,
              it.thumbName || `thumb_${i}.jpg`
            );
          }
        } catch (e) {}
      });
      // Use XMLHttpRequest to track upload progress
      const progressWrap = this.reportModalEl.querySelector(
        "#reportUploadProgress"
      );
      const progressBar =
        this.reportModalEl.querySelector("#reportProgressBar");
      const submitBtn = this.reportModalEl.querySelector("#submitReportBtn");
      if (progressWrap && progressBar) {
        progressWrap.classList.add("visible");
        // initialize via CSS variable
        progressBar.style.setProperty("--progress", "0%");
        progressBar.textContent = "0%";
      }
      if (submitBtn) submitBtn.disabled = true;

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "report.php");
        xhr.upload.onprogress = function (e) {
          if (!e.lengthComputable) return;
          const pct = Math.round((e.loaded / e.total) * 100);
          try {
            if (progressBar) {
              // drive width via CSS variable for separation of concerns
              progressBar.style.setProperty("--progress", pct + "%");
              progressBar.textContent = pct + "%";
            }
          } catch (e) {}
        };
        xhr.onreadystatechange = () => {
          if (xhr.readyState !== 4) return;
          try {
            const j =
              xhr.status === 200
                ? JSON.parse(xhr.responseText || "{}")
                : { ok: false, error: "HTTP " + xhr.status };
            if (j && j.ok) {
              try {
                if (progressBar) {
                  progressBar.style.setProperty("--progress", "100%");
                  progressBar.textContent = "100%";
                }
              } catch (e) {}
              statusEl.textContent = "Report submitted. ID: " + (j.id || "");
              // clear previews and modal media list
              try {
                this._clearAllPreviews();
              } catch (e) {}
              try {
                const mediaList =
                  this.reportModalEl.querySelector("#reportMediaList");
                if (mediaList) mediaList.innerHTML = "";
              } catch (e) {}
              setTimeout(() => {
                if (submitBtn) submitBtn.disabled = false;
                this._closeReportModal();
                statusEl.textContent = "";
                if (progressWrap) progressWrap.classList.remove("visible");
                resolve();
              }, 900);
            } else {
              statusEl.textContent =
                "Error submitting: " + (j.error || "unknown");
              if (submitBtn) submitBtn.disabled = false;
              if (progressWrap) progressWrap.classList.remove("visible");
              reject(new Error(j.error || "upload failed"));
            }
          } catch (err) {
            statusEl.textContent = "Error parsing server response";
            if (submitBtn) submitBtn.disabled = false;
            if (progressWrap) progressWrap.classList.remove("visible");
            reject(err);
          }
        };
        xhr.onerror = function () {
          statusEl.textContent = "Upload error";
          if (submitBtn) submitBtn.disabled = false;
          if (progressWrap) progressWrap.classList.remove("visible");
          reject(new Error("XHR error"));
        };
        xhr.send(form);
      });
    } catch (err) {
      statusEl.textContent = "Error: " + err.message;
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
    // class-based styles live in `src/css/screenshot.css` as .screenshot-selection-overlay
    overlay.className = "screenshot-selection-overlay";
    document.body.appendChild(overlay);

    let startX, startY, endX, endY, rect;
    const selectionBox = document.createElement("div");
    selectionBox.className = "screenshot-selection-box";
    overlay.appendChild(selectionBox);

    function setBox(x, y, w, h) {
      // use CSS variables to avoid inline geometry writes
      selectionBox.style.setProperty("--sel-left", x + "px");
      selectionBox.style.setProperty("--sel-top", y + "px");
      selectionBox.style.setProperty("--sel-width", w + "px");
      selectionBox.style.setProperty("--sel-height", h + "px");
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
        // attach original blob so we can upload it later without fetching the object URL
        try {
          wrapper.__originalBlob = blob;
        } catch (e) {}

        const img = document.createElement("img");
        img.src = thumbData;
        img.title = "Click to play video";
        img.className = "thumb-img";

        const play = document.createElement("span");
        play.className = "thumb-play";
        play.innerHTML = '<i class="fa-solid fa-play"></i>';

        // click opens carousel modal at this preview index
        wrapper.addEventListener("click", () => {
          this.openCarouselAt(this.previewCount);
        });

        const number = document.createElement("span");
        number.className = "thumb-number";
        number.textContent = String(this.previewCount);

        // content block: media + delete button (horizontal)
        const content = document.createElement("div");
        content.className = "preview-content";
        // add media
        content.appendChild(img);
        // delete button to the right of media
        const del = document.createElement("button");
        del.className = "btn btn-sm btn-outline-danger thumb-delete";
        del.title = "Delete preview";
        del.innerHTML = '<i class="fa-solid fa-trash"></i>';
        del.addEventListener("click", (ev) => {
          ev.stopPropagation();
          this._removePreviewElement(wrapper);
        });
        content.appendChild(del);
        // assemble wrapper: content (media+delete), play overlay, number overlay
        wrapper.appendChild(content);
        wrapper.appendChild(play);
        wrapper.appendChild(number);
        // add to preview strip
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

    // content block: media + delete button (horizontal)
    const content = document.createElement("div");
    content.className = "preview-content";
    content.appendChild(img);
    // delete button to the right of media
    const del = document.createElement("button");
    del.className = "btn btn-sm btn-outline-danger thumb-delete";
    del.title = "Delete preview";
    del.innerHTML = '<i class="fa-solid fa-trash"></i>';
    del.addEventListener("click", (ev) => {
      ev.stopPropagation();
      this._removePreviewElement(wrapper);
    });
    content.appendChild(del);

    wrapper.appendChild(content);
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
      newImg.src = dataUrl;
      if (imgEl) imgEl.replaceWith(newImg);
      else this.fullscreenModal.appendChild(newImg);
    }
    this.fullscreenModal.classList.add("open");
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
    // replace img element
    if (imgEl) imgEl.replaceWith(v);
    else this.fullscreenModal.appendChild(v);
    this.currentPlayingVideoElement = v;
    this.currentPlayingVideoUrl = url;
    this.fullscreenModal.classList.add("open");
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
        if (el.parentNode) el.parentNode.replaceChild(newImg, el);
      }
    } catch (err) {
      console.error("Error cleaning up fullscreen video", err);
    }
    if (hideModal) {
      try {
        this.fullscreenModal.classList.remove("open");
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
