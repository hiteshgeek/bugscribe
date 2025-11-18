export default class CaptureMedia {
  constructor(opts = {}) {
    this.opts = Object.assign({ max: 6 }, opts);
    // Keydown handler for hotkeys
    this.hotkeys = {
      full_page: {
        combo: "Control+Alt+1",
        key: "1",
        ctrl: true,
        alt: true,
        shift: false,
        handler: this.captureFullPage.bind(this),
      },
      visible_area: {
        combo: "Control+Alt+2",
        key: "2",
        ctrl: true,
        alt: true,
        shift: false,
        handler: this.captureVisible
          ? this.captureVisible.bind(this)
          : () => {},
      },
      selected_area: {
        combo: "Control+Alt+3",
        key: "3",
        ctrl: true,
        alt: true,
        shift: false,
        handler: this.captureSelectedArea
          ? this.captureSelectedArea.bind(this)
          : () => {},
      },
    };

    // Keydown handler for hotkeys - checks all configured hotkeys
    this._onHotkey = (e) => {
      try {
        if (e.repeat) return;
        for (const name of Object.keys(this.hotkeys || {})) {
          const hp = this.hotkeys[name];
          if (!hp) continue;
          if (
            e.key === hp.key &&
            !!e.ctrlKey === !!hp.ctrl &&
            !!e.altKey === !!hp.alt &&
            !!e.shiftKey === !!hp.shift
          ) {
            e.preventDefault();
            Promise.resolve().then(() => {
              try {
                hp.handler();
              } catch (err) {
                console.error("Hotkey handler error", err);
              }
            });
            break;
          }
        }
      } catch (err) {
        // swallow
      }
    };

    if (typeof window !== "undefined" && window.addEventListener) {
      window.addEventListener("keydown", this._onHotkey, { passive: false });
    }
  }

  getPreviewContainer() {
    let preview = document.querySelector(".bugscribe-preview");
    if (!preview) {
      preview = document.createElement("div");
      preview.className = "bugscribe-preview";
      preview.setAttribute("role", "region");
      preview.setAttribute("aria-label", "Screenshots preview");
      document.body.appendChild(preview);
    }
    return preview;
  }

  async captureAny() {
    const preview = this.getPreviewContainer();
    try {
      // Prefer html2canvas if the host page provides it
      if (
        typeof window !== "undefined" &&
        (typeof window.html2canvas === "function" ||
          typeof window.html2canvas === "object")
      ) {
        const fn = window.html2canvas || window.html2canvas;
        let restoreHidden = null;
        try {
          restoreHidden = this._hideElementsForCapture();
          const canvas = await fn(document.documentElement, { useCORS: true });
          const dataUrl = canvas.toDataURL("image/png");
          this._appendThumbnail(preview, dataUrl);
          return;
        } finally {
          try {
            if (typeof restoreHidden === "function") restoreHidden();
          } catch (e) {}
        }
      }

      if (typeof html2canvas === "function") {
        let restoreHidden = null;
        try {
          restoreHidden = this._hideElementsForCapture();
          const canvas = await html2canvas(document.documentElement, {
            useCORS: true,
          });
          const dataUrl = canvas.toDataURL("image/png");
          this._appendThumbnail(preview, dataUrl);
          return;
        } finally {
          try {
            if (typeof restoreHidden === "function") restoreHidden();
          } catch (e) {}
        }
      }

      // Fallback: ask the user to share their screen (prompts for permission)
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        const image = await new Promise((resolve, reject) => {
          const video = document.createElement("video");
          video.autoplay = true;
          video.muted = true;
          video.playsInline = true;
          video.srcObject = stream;
          video.addEventListener("loadedmetadata", () => {
            video.play().catch(() => {});
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth || 1280;
            canvas.height = video.videoHeight || 720;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/png");
            try {
              stream.getTracks().forEach((t) => t.stop());
            } catch (e) {}
            resolve(dataUrl);
          });
          video.addEventListener("error", (err) => reject(err));
        });
        this._appendThumbnail(preview, image);
        return;
      }

      throw new Error(
        "No supported screenshot method available (html2canvas or getDisplayMedia)"
      );
    } catch (err) {
      try {
        const msg = String(
          (err && (err.name || err.message)) || err || ""
        ).toLowerCase();
        if (
          msg.indexOf("notallowed") !== -1 ||
          msg.indexOf("permission") !== -1 ||
          msg.indexOf("denied") !== -1 ||
          msg.indexOf("cancel") !== -1 ||
          msg.indexOf("abort") !== -1
        ) {
          return;
        }
      } catch (e) {
        // fall through
      }
      console.error("Screenshot capture failed", err);
      const tile = document.createElement("div");
      tile.className = "bugscribe-preview__item bugscribe-preview__error";
      tile.textContent = "Unable to capture screenshot";
      preview.appendChild(tile);
    }
  }

  async ensureHtml2Canvas() {
    if (typeof window !== "undefined" && window.html2canvas)
      return window.html2canvas;
    // Attempt to dynamically load html2canvas from CDN
    return new Promise((resolve, reject) => {
      try {
        const script = document.createElement("script");
        script.src =
          "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
        script.async = true;
        script.onload = () => {
          if (window.html2canvas) resolve(window.html2canvas);
          else resolve(window.html2canvas || window.html2canvas);
        };
        script.onerror = (err) => reject(err);
        document.head.appendChild(script);
      } catch (e) {
        reject(e);
      }
    });
  }

  // Capture a full-page screenshot using html2canvas. If html2canvas is
  // not available it will be loaded dynamically. Falls back to
  // `captureAny()` if loading/capture fails.
  async captureFullPage() {
    const preview = this.getPreviewContainer();
    try {
      let h2c = null;
      if (typeof window !== "undefined" && window.html2canvas) {
        h2c = window.html2canvas;
      } else {
        h2c = await this.ensureHtml2Canvas();
      }

      if (!h2c && typeof html2canvas === "function") h2c = html2canvas;
      if (!h2c) throw new Error("html2canvas not available");

      let restoreHidden = null;
      try {
        restoreHidden = this._hideElementsForCapture();
        const canvas = await h2c(document.documentElement, {
          useCORS: true,
          scale: window.devicePixelRatio || 1,
        });
        const dataUrl = canvas.toDataURL("image/png");
        this._appendThumbnail(preview, dataUrl);
        return;
      } finally {
        try {
          if (typeof restoreHidden === "function") restoreHidden();
        } catch (e) {}
      }
    } catch (err) {
      // If html2canvas choked on unsupported CSS functions (e.g. color-mix),
      // try a targeted fallback: inline computed colors on our library
      // elements so html2canvas doesn't need to parse those functions.
      const msg = String(
        (err && (err.message || err.name)) || err || ""
      ).toLowerCase();
      if (
        msg.indexOf("unsupported color function") !== -1 ||
        msg.indexOf("color-mix") !== -1
      ) {
        try {
          // First, try disabling stylesheets that contain unsupported color functions
          const restoreSheets = this._disableProblematicStylesheets();
          const cleanup = this._patchInlineColorsForHtml2Canvas();
          try {
            const h2c2 =
              typeof window !== "undefined" && window.html2canvas
                ? window.html2canvas
                : typeof html2canvas === "function"
                ? html2canvas
                : null;
            if (!h2c2) {
              // try loading again
              await this.ensureHtml2Canvas();
            }
            const runner =
              window.html2canvas ||
              (typeof html2canvas === "function" ? html2canvas : null);
            if (!runner)
              throw new Error(
                "html2canvas not available after attempted restore"
              );
            let restoreHidden2 = null;
            try {
              restoreHidden2 = this._hideElementsForCapture();
              const canvas2 = await runner(document.documentElement, {
                useCORS: true,
                scale: window.devicePixelRatio || 1,
              });
              const dataUrl2 = canvas2.toDataURL("image/png");
              this._appendThumbnail(preview, dataUrl2);
            } finally {
              try {
                if (typeof restoreHidden2 === "function") restoreHidden2();
              } catch (e) {}
            }
            return;
          } finally {
            try {
              if (typeof restoreSheets === "function") restoreSheets();
            } catch (e) {}
            try {
              if (typeof cleanup === "function") cleanup();
            } catch (e) {}
          }
        } catch (e2) {
          // last resort: fall back to interactive capture flow
          try {
            await this.captureAny();
            return;
          } catch (e3) {
            throw err;
          }
        }
      }
      // fallback to generic capture which may ask user to share screen
      try {
        await this.captureAny();
        return;
      } catch (e) {
        throw err;
      }
    }
  }

  // Capture only the currently visible viewport area (not the full document)
  async captureVisible() {
    const preview = this.getPreviewContainer();
    try {
      let h2c = null;
      if (typeof window !== "undefined" && window.html2canvas) {
        h2c = window.html2canvas;
      } else {
        h2c = await this.ensureHtml2Canvas();
      }
      if (!h2c && typeof html2canvas === "function") h2c = html2canvas;
      if (!h2c) throw new Error("html2canvas not available");

      // Hide UI elements that shouldn't appear in the capture
      const restoreHidden = this._hideElementsForCapture();
      try {
        // Capture a canvas of the full page, then crop to the viewport region.
        const fullCanvas = await h2c(document.documentElement, {
          useCORS: true,
          scale: window.devicePixelRatio || 1,
        });
        const vw = Math.max(
          document.documentElement.clientWidth,
          window.innerWidth || 0
        );
        const vh = Math.max(
          document.documentElement.clientHeight,
          window.innerHeight || 0
        );
        const sx = window.scrollX || window.pageXOffset || 0;
        const sy = window.scrollY || window.pageYOffset || 0;

        // Create a temporary canvas for the visible-area crop
        const out = document.createElement("canvas");
        out.width = vw * (window.devicePixelRatio || 1);
        out.height = vh * (window.devicePixelRatio || 1);
        const ctx = out.getContext("2d");
        // draw the portion of the full canvas that corresponds to the viewport
        ctx.drawImage(
          fullCanvas,
          sx * (window.devicePixelRatio || 1),
          sy * (window.devicePixelRatio || 1),
          out.width,
          out.height,
          0,
          0,
          out.width,
          out.height
        );
        const dataUrl = out.toDataURL("image/png");
        this._appendThumbnail(preview, dataUrl);
        return;
      } finally {
        try {
          if (typeof restoreHidden === "function") restoreHidden();
        } catch (e) {}
      }
    } catch (err) {
      // If html2canvas fails due to color functions, attempt the same fallback used in captureFullPage
      try {
        const msg = String(
          (err && (err.message || err.name)) || err || ""
        ).toLowerCase();
        if (
          msg.indexOf("unsupported color function") !== -1 ||
          msg.indexOf("color-mix") !== -1
        ) {
          const restoreSheets = this._disableProblematicStylesheets();
          const cleanup = this._patchInlineColorsForHtml2Canvas();
          let restoreHidden2 = null;
          try {
            restoreHidden2 = this._hideElementsForCapture();
            const h2c2 =
              typeof window !== "undefined" && window.html2canvas
                ? window.html2canvas
                : typeof html2canvas === "function"
                ? html2canvas
                : null;
            if (!h2c2) await this.ensureHtml2Canvas();
            const fullCanvas2 = await (
              window.html2canvas ||
              (typeof html2canvas === "function" ? html2canvas : null)
            )(document.documentElement, {
              useCORS: true,
              scale: window.devicePixelRatio || 1,
            });
            const vw = Math.max(
              document.documentElement.clientWidth,
              window.innerWidth || 0
            );
            const vh = Math.max(
              document.documentElement.clientHeight,
              window.innerHeight || 0
            );
            const sx = window.scrollX || window.pageXOffset || 0;
            const sy = window.scrollY || window.pageYOffset || 0;
            const out = document.createElement("canvas");
            out.width = vw * (window.devicePixelRatio || 1);
            out.height = vh * (window.devicePixelRatio || 1);
            const ctx = out.getContext("2d");
            ctx.drawImage(
              fullCanvas2,
              sx * (window.devicePixelRatio || 1),
              sy * (window.devicePixelRatio || 1),
              out.width,
              out.height,
              0,
              0,
              out.width,
              out.height
            );
            const dataUrl2 = out.toDataURL("image/png");
            this._appendThumbnail(preview, dataUrl2);
            return;
          } finally {
            try {
              if (typeof restoreHidden2 === "function") restoreHidden2();
            } catch (e) {}
            try {
              if (typeof restoreSheets === "function") restoreSheets();
            } catch (e) {}
            try {
              if (typeof cleanup === "function") cleanup();
            } catch (e) {}
          }
        }
      } catch (e) {}
      // fallback to interactive capture
      try {
        await this.captureAny();
        return;
      } catch (e) {
        console.error("Visible capture failed", err);
        const tile = document.createElement("div");
        tile.className = "bugscribe-preview__item bugscribe-preview__error";
        tile.textContent = "Unable to capture visible area";
        this.getPreviewContainer().appendChild(tile);
      }
    }
  }

  // Allow the user to draw a rectangle on screen and capture only that area.
  async captureSelectedArea() {
    const preview = this.getPreviewContainer();
    // Create selection overlay that covers the entire document (backdrop)
    const overlay = document.createElement("div");
    const docW = Math.max(
      document.documentElement.scrollWidth || 0,
      window.innerWidth || 0
    );
    const docH = Math.max(
      document.documentElement.scrollHeight || 0,
      window.innerHeight || 0
    );
    overlay.style.position = "absolute";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = docW + "px";
    overlay.style.height = docH + "px";
    overlay.style.zIndex = "2147483646";
    overlay.style.cursor = "crosshair";
    // overlay stays transparent; the selection `box` uses a large outer
    // shadow to dim the rest of the page while keeping the selected area
    // fully transparent so captures don't include any fill behind it.
    overlay.style.background = "transparent";
    overlay.setAttribute("role", "application");
    overlay.setAttribute("aria-hidden", "false");
    document.body.appendChild(overlay);

    const box = document.createElement("div");
    box.style.position = "absolute";
    // compute a very light version of the bug button bg color for selection fill
    try {
      const btn = document.querySelector(".bug-btn-wrapper");
      const cs = btn
        ? window.getComputedStyle(btn)
        : window.getComputedStyle(document.documentElement);
      let bg =
        (cs && (cs.getPropertyValue("--bs-btn-bg") || cs.backgroundColor)) ||
        "#ff4757";
      let r = 255,
        g = 71,
        b = 87;
      const m = String(bg).match(/rgba?\(([^)]+)\)/);
      if (m) {
        const parts = m[1].split(",").map((p) => parseFloat(p));
        r = parts[0] || r;
        g = parts[1] || g;
        b = parts[2] || b;
      } else if (bg && bg[0] === "#") {
        const hex = bg.replace("#", "");
        if (hex.length === 3) {
          r = parseInt(hex[0] + hex[0], 16);
          g = parseInt(hex[1] + hex[1], 16);
          b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length >= 6) {
          r = parseInt(hex.substring(0, 2), 16);
          g = parseInt(hex.substring(2, 4), 16);
          b = parseInt(hex.substring(4, 6), 16);
        }
      }
      const mix = (v, amount = 0.9) => Math.round(v + (255 - v) * amount);
      const lr = mix(r, 0.9),
        lg = mix(g, 0.9),
        lb = mix(b, 0.9);
      const borderColor = `rgba(${Math.max(0, lr - 40)}, ${Math.max(
        0,
        lg - 40
      )}, ${Math.max(0, lb - 40)}, 0.95)`;
      // Use a transparent box with a large outer shadow to dim the rest
      // of the page so the selected area remains clearly visible.
      box.style.background = "transparent";
      box.style.boxShadow = "0 0 0 9999px rgba(0,0,0,0.35)";
      box.style.border = `2px dashed ${borderColor}`;
      box.style.pointerEvents = "none";
    } catch (e) {
      box.style.background = "transparent";
      box.style.boxShadow = "0 0 0 9999px rgba(0,0,0,0.35)";
      box.style.border = "2px dashed rgba(255,255,255,0.9)";
      box.style.pointerEvents = "none";
    }
    overlay.appendChild(box);

    let startX = 0,
      startY = 0,
      curX = 0,
      curY = 0,
      dragging = false;

    const onDown = (ev) => {
      ev.preventDefault();
      dragging = true;
      const scrollX = window.scrollX || window.pageXOffset || 0;
      const scrollY = window.scrollY || window.pageYOffset || 0;
      startX = ev.pageX !== undefined ? ev.pageX : ev.clientX + scrollX;
      startY = ev.pageY !== undefined ? ev.pageY : ev.clientY + scrollY;
      box.style.left = `${startX}px`;
      box.style.top = `${startY}px`;
      box.style.width = "0px";
      box.style.height = "0px";
    };
    const onMove = (ev) => {
      if (!dragging) return;
      const scrollX = window.scrollX || window.pageXOffset || 0;
      const scrollY = window.scrollY || window.pageYOffset || 0;
      curX = ev.pageX !== undefined ? ev.pageX : ev.clientX + scrollX;
      curY = ev.pageY !== undefined ? ev.pageY : ev.clientY + scrollY;
      const left = Math.min(startX, curX);
      const top = Math.min(startY, curY);
      const w = Math.abs(curX - startX);
      const h = Math.abs(curY - startY);
      box.style.left = `${left}px`;
      box.style.top = `${top}px`;
      box.style.width = `${w}px`;
      box.style.height = `${h}px`;
    };
    const onUp = async (ev) => {
      try {
        ev.preventDefault();
        dragging = false;
        const scrollX = window.scrollX || window.pageXOffset || 0;
        const scrollY = window.scrollY || window.pageYOffset || 0;
        curX = ev.pageX !== undefined ? ev.pageX : ev.clientX + scrollX;
        curY = ev.pageY !== undefined ? ev.pageY : ev.clientY + scrollY;
        const left = Math.min(startX, curX);
        const top = Math.min(startY, curY);
        const w = Math.abs(curX - startX);
        const h = Math.abs(curY - startY);

        // remove overlay early so it doesn't interfere with capture
        cleanupListeners();
        if (overlay && overlay.parentNode)
          overlay.parentNode.removeChild(overlay);

        // small selections are ignored
        if (w < 6 || h < 6) {
          return;
        }

        // proceed to capture the selected region
        try {
          const h2c =
            typeof window !== "undefined" && window.html2canvas
              ? window.html2canvas
              : typeof html2canvas === "function"
              ? html2canvas
              : null;
          if (!h2c) await this.ensureHtml2Canvas();
          const runner =
            window.html2canvas ||
            (typeof html2canvas === "function" ? html2canvas : null);
          if (!runner) throw new Error("html2canvas not available");

          // Hide the preview and toolbar before capture
          const restoreHidden = this._hideElementsForCapture();
          try {
            const fullCanvas = await runner(document.documentElement, {
              useCORS: true,
              scale: window.devicePixelRatio || 1,
            });
            // `left` and `top` are page coordinates (include scroll),
            // so do not add `scrollX/scrollY` again here — just apply DPR.
            const sx = left * (window.devicePixelRatio || 1);
            const sy = top * (window.devicePixelRatio || 1);
            const sw = w * (window.devicePixelRatio || 1);
            const sh = h * (window.devicePixelRatio || 1);
            const out = document.createElement("canvas");
            out.width = sw;
            out.height = sh;
            const ctx = out.getContext("2d");
            ctx.drawImage(fullCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
            const dataUrl = out.toDataURL("image/png");
            this._appendThumbnail(preview, dataUrl);
          } finally {
            try {
              if (typeof restoreHidden === "function") restoreHidden();
            } catch (e) {}
          }
        } catch (err) {
          // attempt fallback path similar to other methods
          try {
            const msg = String(
              (err && (err.message || err.name)) || err || ""
            ).toLowerCase();
            if (
              msg.indexOf("unsupported color function") !== -1 ||
              msg.indexOf("color-mix") !== -1
            ) {
              const restoreSheets = this._disableProblematicStylesheets();
              const cleanupInline = this._patchInlineColorsForHtml2Canvas();
              try {
                const runner2 =
                  window.html2canvas ||
                  (typeof html2canvas === "function" ? html2canvas : null);
                if (!runner2) await this.ensureHtml2Canvas();
                const restoredRunner =
                  window.html2canvas ||
                  (typeof html2canvas === "function" ? html2canvas : null);
                if (!restoredRunner) throw err;
                const fullCanvas2 = await restoredRunner(
                  document.documentElement,
                  { useCORS: true, scale: window.devicePixelRatio || 1 }
                );
                // `left` and `top` are page coordinates (include scroll),
                // so do not add `scrollX/scrollY` again here — just apply DPR.
                const sx = left * (window.devicePixelRatio || 1);
                const sy = top * (window.devicePixelRatio || 1);
                const sw = w * (window.devicePixelRatio || 1);
                const sh = h * (window.devicePixelRatio || 1);
                const out2 = document.createElement("canvas");
                out2.width = sw;
                out2.height = sh;
                const ctx2 = out2.getContext("2d");
                ctx2.drawImage(fullCanvas2, sx, sy, sw, sh, 0, 0, sw, sh);
                const dataUrl2 = out2.toDataURL("image/png");
                this._appendThumbnail(preview, dataUrl2);
              } finally {
                try {
                  if (typeof cleanupInline === "function") cleanupInline();
                } catch (e) {}
                try {
                  if (typeof restoreSheets === "function") restoreSheets();
                } catch (e) {}
              }
            } else {
              // fallback to interactive capture
              await this.captureAny();
            }
          } catch (e2) {
            console.error("Selected area capture failed", e2);
            const tile = document.createElement("div");
            tile.className = "bugscribe-preview__item bugscribe-preview__error";
            tile.textContent = "Unable to capture selection";
            this.getPreviewContainer().appendChild(tile);
          }
        }
      } finally {
        // ensure listeners cleaned up and overlay removed
        cleanupListeners();
        if (overlay && overlay.parentNode)
          overlay.parentNode.removeChild(overlay);
      }
    };

    const onKeyDown = (ev) => {
      if (
        ev &&
        (ev.key === "Escape" || ev.key === "Esc" || ev.keyCode === 27)
      ) {
        // cancel selection
        try {
          dragging = false;
          cleanupListeners();
          if (overlay && overlay.parentNode)
            overlay.parentNode.removeChild(overlay);
        } catch (e) {}
      }
    };

    const cleanupListeners = () => {
      overlay.removeEventListener("mousedown", onDown);
      overlay.removeEventListener("mousemove", onMove);
      overlay.removeEventListener("mouseup", onUp);
      overlay.removeEventListener("mouseleave", onUp);
      overlay.removeEventListener("touchstart", onTouchStart);
      overlay.removeEventListener("touchmove", onTouchMove);
      overlay.removeEventListener("touchend", onUp);
      try {
        window.removeEventListener("keydown", onKeyDown);
      } catch (e) {}
    };

    // touch support
    const onTouchStart = (ev) => {
      ev.preventDefault();
      const t = ev.touches && ev.touches[0];
      if (!t) return;
      const scrollX = window.scrollX || window.pageXOffset || 0;
      const scrollY = window.scrollY || window.pageYOffset || 0;
      onDown({
        pageX: t.pageX !== undefined ? t.pageX : t.clientX + scrollX,
        pageY: t.pageY !== undefined ? t.pageY : t.clientY + scrollY,
        preventDefault: () => {},
      });
    };
    const onTouchMove = (ev) => {
      const t = ev.touches && ev.touches[0];
      if (!t) return;
      const scrollX = window.scrollX || window.pageXOffset || 0;
      const pageX = t.pageX !== undefined ? t.pageX : t.clientX + scrollX;
      const pageY =
        t.pageY !== undefined
          ? t.pageY
          : t.clientY + (window.scrollY || window.pageYOffset || 0);
      onMove({ pageX, pageY });
    };

    // listen for Escape to cancel selection
    window.addEventListener("keydown", onKeyDown);

    overlay.addEventListener("mousedown", onDown);
    overlay.addEventListener("mousemove", onMove);
    overlay.addEventListener("mouseup", onUp);
    overlay.addEventListener("mouseleave", onUp);
    overlay.addEventListener("touchstart", onTouchStart, { passive: false });
    overlay.addEventListener("touchmove", onTouchMove, { passive: false });
    overlay.addEventListener("touchend", onUp);
  }

  _patchInlineColorsForHtml2Canvas() {
    // Find library wrapper(s) and capture computed color values, then
    // apply them as inline styles so html2canvas doesn't parse CSS funcs.
    const wrappers = Array.from(document.querySelectorAll(".bug-btn-wrapper"));
    if (!wrappers.length) return null;
    const originals = [];

    const parseColor = (str) => {
      if (!str) return null;
      str = str.trim();
      // rgb(a)
      const m = str.match(/rgba?\(([^)]+)\)/);
      if (m) return str;
      // hex
      const mh = str.match(/^#([0-9a-f]{3,8})$/i);
      if (mh) return str;
      // named or other -- return as-is
      return str;
    };

    const darkenRgb = (rgbStr, amt = 0.18) => {
      try {
        const m = rgbStr.match(/rgba?\(([^)]+)\)/);
        if (!m) return rgbStr;
        const parts = m[1].split(",").map((p) => parseFloat(p.trim()));
        const r = Math.max(0, Math.round(parts[0] * (1 - amt)));
        const g = Math.max(0, Math.round(parts[1] * (1 - amt)));
        const b = Math.max(0, Math.round(parts[2] * (1 - amt)));
        return `rgb(${r}, ${g}, ${b})`;
      } catch (e) {
        return rgbStr;
      }
    };

    wrappers.forEach((w) => {
      const prev = {
        el: w,
        style: w.getAttribute("style") || null,
        ariaHidden: w.getAttribute("aria-hidden") || null,
      };
      originals.push(prev);
      const cs = window.getComputedStyle(w);
      const bg =
        parseColor(cs.backgroundColor || cs.getPropertyValue("--bs-btn-bg")) ||
        "#ff4757";
      const color =
        parseColor(cs.color || cs.getPropertyValue("--bs-btn-color")) || "#fff";
      const actionBg =
        parseColor(cs.getPropertyValue("--bs-btn-action-bg")) ||
        "rgba(255,255,255,0.92)";
      const actionColor =
        parseColor(cs.getPropertyValue("--bs-btn-action-color")) || "#333";
      const border =
        parseColor(cs.getPropertyValue("--bs-btn-border")) ||
        darkenRgb(bg || "rgb(0,0,0)");

      // apply inline styles to wrapper and to its action buttons and main
      w.style.setProperty("background-color", bg);
      w.style.setProperty("color", color);
      const main = w.querySelector(".bug-btn__main");
      if (main) {
        main.style.setProperty("background-color", bg);
        // set right/left border color depending on side
        main.style.setProperty("border-color", border);
      }
      const actions = w.querySelectorAll(".bug-btn__action");
      actions.forEach((a) => {
        a.style.setProperty("background-color", actionBg);
        a.style.setProperty("color", actionColor);
      });
    });

    return () => {
      // restore originals
      originals.forEach((o) => {
        if (o.style === null) o.el.removeAttribute("style");
        else o.el.setAttribute("style", o.style);
        if (o.ariaHidden === null) o.el.removeAttribute("aria-hidden");
        else o.el.setAttribute("aria-hidden", o.ariaHidden);
      });
    };
  }

  _hideElementsForCapture() {
    // Temporarily hide preview and button wrappers so they don't appear in screenshots.
    const selectors = [".bugscribe-preview", ".bug-btn-wrapper"];
    const originals = [];
    selectors.forEach((sel) => {
      try {
        document.querySelectorAll(sel).forEach((el) => {
          originals.push({
            el,
            style: el.getAttribute("style") || null,
            ariaHidden: el.getAttribute("aria-hidden") || null,
          });
          try {
            el.style.setProperty("display", "none", "important");
            el.setAttribute("aria-hidden", "true");
          } catch (e) {
            // ignore
          }
        });
      } catch (e) {
        // selector query may fail in rare cases
      }
    });
    return () => {
      originals.forEach((o) => {
        try {
          if (o.style === null) o.el.removeAttribute("style");
          else o.el.setAttribute("style", o.style);
        } catch (e) {}
        try {
          if (o.ariaHidden === null) o.el.removeAttribute("aria-hidden");
          else o.el.setAttribute("aria-hidden", o.ariaHidden);
        } catch (e) {}
      });
    };
  }

  _disableProblematicStylesheets() {
    // Scan document.styleSheets and temporarily disable any same-origin
    // stylesheet that contains CSS functions html2canvas can't parse
    // (e.g. color(...) or color-mix(...)). Returns a cleanup function.
    if (!document || !document.styleSheets) return null;
    const disabled = [];
    const pattern = /\bcolor-mix\b|\bcolor\s*\(/i;
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const rules = sheet.cssRules;
        if (!rules) continue;
        let found = false;
        for (const r of Array.from(rules)) {
          try {
            if (r.cssText && pattern.test(r.cssText)) {
              found = true;
              break;
            }
          } catch (e) {
            // skip rule
          }
        }
        if (found && !sheet.disabled) {
          sheet.disabled = true;
          disabled.push(sheet);
        }
      } catch (e) {
        // Accessing cssRules for cross-origin sheets throws; ignore those
      }
    }
    return () => {
      disabled.forEach((s) => {
        try {
          s.disabled = false;
        } catch (e) {}
      });
    };
  }

  _appendThumbnail(preview, dataUrl) {
    const tile = document.createElement("div");
    tile.className = "bugscribe-preview__item";
    const img = document.createElement("img");
    img.src = dataUrl;
    img.alt = "Screenshot thumbnail";
    tile.appendChild(img);
    preview.appendChild(tile);
    while (preview.children.length > (this.opts.max || 6))
      preview.removeChild(preview.firstChild);
  }

  // Cleanup resources (hotkeys, listeners) when the CaptureMedia instance is no longer needed
  dispose() {
    try {
      if (
        typeof window !== "undefined" &&
        window.removeEventListener &&
        this._onHotkey
      ) {
        window.removeEventListener("keydown", this._onHotkey, {
          passive: false,
        });
      }
    } catch (e) {}
  }
}
