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
      inbuilt_capture: {
        combo: "Control+Alt+4",
        key: "4",
        ctrl: true,
        alt: true,
        shift: false,
        handler: this.captureAny ? this.captureAny.bind(this) : () => {},
      },
    };

    // Keydown handler for hotkeys - checks all configured hotkeys
    this._onHotkey = (e) => {
      try {
        // Debug: log key events to help diagnose hotkey issues
        try {
          console.debug &&
            console.debug("[Bugscribe hotkey]", {
              key: e.key,
              code: e.code,
              ctrlKey: e.ctrlKey,
              altKey: e.altKey,
              shiftKey: e.shiftKey,
              metaKey: e.metaKey,
              repeat: e.repeat,
              target: e.target && e.target.tagName,
              active:
                document &&
                document.activeElement &&
                document.activeElement.tagName,
            });
        } catch (logErr) {}
        if (e.repeat) return;
        for (const name of Object.keys(this.hotkeys || {})) {
          const hp = this.hotkeys[name];
          if (!hp) continue;
          const pressedKey = String(e.key || "");
          const code = String(e.code || "").toLowerCase();
          const wantKey = String(hp.key || "");
          const codeMatchesDigit =
            code === `digit${wantKey}` || code === `numpad${wantKey}`;

          // Consider tracked modifier state because some keyboard layouts
          // produce a composed final key event that lacks ctrl/alt flags
          // (e.g. AltGr). Use either the event flags or the stored mod state.
          const mod = this._modState || {};
          const ctrlNow = !!e.ctrlKey || !!mod.ctrl;
          const altNow = !!e.altKey || !!mod.alt;
          const shiftNow = !!e.shiftKey || !!mod.shift;
          const metaNow = !!e.metaKey || !!mod.meta;

          if (
            (pressedKey === wantKey || codeMatchesDigit) &&
            ctrlNow === !!hp.ctrl &&
            altNow === !!hp.alt &&
            shiftNow === !!hp.shift &&
            metaNow === !!hp.meta
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
      // Track modifier state separately because some layouts produce a
      // composed character key event (e.g. AltGr) where the final key
      // event does not include ctrl/alt flags. We keep a small modifier
      // state updated on keydown/keyup so hotkeys still match.
      this._modState = { ctrl: false, alt: false, shift: false, meta: false };
      this._modKeyDown = (ev) => {
        try {
          const k = String(ev.key || "").toLowerCase();
          if (k.indexOf("control") !== -1) this._modState.ctrl = true;
          if (k.indexOf("alt") !== -1) this._modState.alt = true;
          if (k.indexOf("shift") !== -1) this._modState.shift = true;
          if (k.indexOf("meta") !== -1) this._modState.meta = true;
        } catch (e) {}
      };
      this._modKeyUp = (ev) => {
        try {
          const k = String(ev.key || "").toLowerCase();
          if (k.indexOf("control") !== -1) this._modState.ctrl = false;
          if (k.indexOf("alt") !== -1) this._modState.alt = false;
          if (k.indexOf("shift") !== -1) this._modState.shift = false;
          if (k.indexOf("meta") !== -1) this._modState.meta = false;
        } catch (e) {}
      };
      window.addEventListener("keydown", this._modKeyDown, { capture: true });
      window.addEventListener("keyup", this._modKeyUp, { capture: true });
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
      let restoreVideos = null;
      try {
        restoreHidden = this._hideElementsForCapture();
        restoreVideos = await this._snapshotVideosForCapture(preview);
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
        try {
          if (typeof restoreVideos === "function") restoreVideos();
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
            let restoreVideos2 = null;
            try {
              restoreHidden2 = this._hideElementsForCapture();
              restoreVideos2 = await this._snapshotVideosForCapture(preview);
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
              try {
                if (typeof restoreVideos2 === "function") restoreVideos2();
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
      let restoreHidden = null;
      let restoreVideos = null;
      try {
        restoreHidden = this._hideElementsForCapture();
        restoreVideos = await this._snapshotVideosForCapture(preview);
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
        const ctx = out.getContext("2d", { willReadFrequently: true });
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
        try {
          if (typeof restoreVideos === "function") restoreVideos();
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
            const restoreVideos2 = await this._snapshotVideosForCapture(
              preview
            );
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
            const ctx = out.getContext("2d", { willReadFrequently: true });
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
              if (typeof restoreVideos2 === "function") restoreVideos2();
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
          let restoreHidden = null;
          let restoreVideos = null;
          try {
            restoreHidden = this._hideElementsForCapture();
            restoreVideos = await this._snapshotVideosForCapture(preview);
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
            const ctx = out.getContext("2d", { willReadFrequently: true });
            ctx.drawImage(fullCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
            const dataUrl = out.toDataURL("image/png");
            this._appendThumbnail(preview, dataUrl);
          } finally {
            try {
              if (typeof restoreHidden === "function") restoreHidden();
            } catch (e) {}
            try {
              if (typeof restoreVideos === "function") restoreVideos();
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
                let restoreHidden3 = null;
                let restoreVideos3 = null;
                try {
                  restoreHidden3 = this._hideElementsForCapture();
                  restoreVideos3 = await this._snapshotVideosForCapture(
                    preview
                  );
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
                  const ctx2 = out2.getContext("2d", {
                    willReadFrequently: true,
                  });
                  ctx2.drawImage(fullCanvas2, sx, sy, sw, sh, 0, 0, sw, sh);
                  const dataUrl2 = out2.toDataURL("image/png");
                  this._appendThumbnail(preview, dataUrl2);
                } finally {
                  try {
                    if (typeof restoreHidden3 === "function") restoreHidden3();
                  } catch (e) {}
                  try {
                    if (typeof restoreVideos3 === "function") restoreVideos3();
                  } catch (e) {}
                }
                // `left` and `top` are page coordinates (include scroll),
                // so do not add `scrollX/scrollY` again here — just apply DPR.
                const sx = left * (window.devicePixelRatio || 1);
                const sy = top * (window.devicePixelRatio || 1);
                const sw = w * (window.devicePixelRatio || 1);
                const sh = h * (window.devicePixelRatio || 1);
                const out2 = document.createElement("canvas");
                out2.width = sw;
                out2.height = sh;
                const ctx2 = out2.getContext("2d", {
                  willReadFrequently: true,
                });
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

  // Interactive screen-share fallback: ask user to share a screen/window/tab
  // and capture a single frame as a thumbnail. This method is used as the
  // "inbuilt" capture fallback when html2canvas is not available or fails.
  async captureAny() {
    const preview = this.getPreviewContainer();
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      const tile = document.createElement("div");
      tile.className = "bugscribe-preview__item bugscribe-preview__error";
      tile.textContent = "Screen capture not supported";
      preview.appendChild(tile);
      return;
    }

    let stream = null;
    let tmp = null;
    let restoreHidden = null;
    let displaySurface = null;
    try {
      // First ask user to share; some browsers produce a black frame until
      // the capture stabilizes. Acquire the stream first, then hide our UI
      // and wait a short moment before grabbing a frame.
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      if (!stream) throw new Error("No stream returned");

      // If the selected displaySurface is the browser/tab itself, many
      // browsers will yield a black frame when capturing the same tab via
      // getDisplayMedia. In that case prefer html2canvas (same-tab capture).
      try {
        const track = stream.getVideoTracks && stream.getVideoTracks()[0];
        const settings =
          track && typeof track.getSettings === "function"
            ? track.getSettings()
            : {};
        const ds = settings && settings.displaySurface;
        displaySurface = ds || null;
        try {
          console.debug &&
            console.debug("captureAny: stream settings", {
              trackSettings: settings,
              displaySurface: ds,
            });
        } catch (e) {}
        if (ds === "browser") {
          // Attempt same-tab capture via html2canvas
          try {
            if (typeof window !== "undefined" && window.html2canvas) {
              const h2c = window.html2canvas;
              const canvas = await h2c(document.documentElement, {
                useCORS: true,
                scale: window.devicePixelRatio || 1,
              });
              const dataUrl = canvas.toDataURL("image/png");
              this._appendThumbnail(preview, dataUrl);
              try {
                stream.getTracks().forEach((t) => t.stop());
              } catch (e) {}
              return;
            } else {
              await this.ensureHtml2Canvas();
              const runner =
                window.html2canvas ||
                (typeof html2canvas === "function" ? html2canvas : null);
              if (runner) {
                const canvas = await runner(document.documentElement, {
                  useCORS: true,
                  scale: window.devicePixelRatio || 1,
                });
                const dataUrl = canvas.toDataURL("image/png");
                this._appendThumbnail(preview, dataUrl);
                try {
                  stream.getTracks().forEach((t) => t.stop());
                } catch (e) {}
                return;
              }
            }
          } catch (e) {
            // fallback to regular getDisplayMedia flow below
          }
        }
      } catch (e) {}

      tmp = document.createElement("video");
      tmp.style.position = "fixed";
      tmp.style.left = "-9999px";
      tmp.muted = true;
      tmp.playsInline = true;
      tmp.autoplay = true;
      tmp.srcObject = stream;
      // playback/error logging to diagnose invalid-frame issues
      try {
        tmp.addEventListener("playing", () => {
          try {
            console.debug && console.debug("captureAny: tmp playing");
          } catch (e) {}
        });
        tmp.addEventListener("loadeddata", () => {
          try {
            console.debug && console.debug("captureAny: tmp loadeddata");
          } catch (e) {}
        });
        tmp.addEventListener("error", (ev) => {
          try {
            console.warn && console.warn("captureAny: tmp error", ev);
          } catch (e) {}
        });
      } catch (e) {}
      document.body.appendChild(tmp);

      // Wait for the video to have data/playing
      await new Promise((resolve, reject) => {
        let settled = false;
        const to = setTimeout(() => {
          if (!settled) {
            settled = true;
            reject(new Error("Timed out waiting for screen stream"));
          }
        }, 4000);
        const onPlayable = () => {
          if (settled) return;
          settled = true;
          clearTimeout(to);
          resolve();
        };
        tmp.addEventListener("playing", onPlayable, { once: true });
        tmp.addEventListener("loadeddata", onPlayable, { once: true });
      });

      // Now hide our UI so it doesn't appear in the captured frame
      try {
        restoreHidden = this._hideElementsForCapture();
      } catch (e) {}

      // Allow the captured stream a short moment to stabilize (some setups
      // show a black frame immediately after share selection)
      await new Promise((r) => setTimeout(r, 300));

      let _grabAttempt = 0;
      const grabFrame = () => {
        _grabAttempt++;
        const vidW = tmp.videoWidth || tmp.clientWidth || 1280;
        const vidH = tmp.videoHeight || tmp.clientHeight || 720;
        const dpr = window.devicePixelRatio || 1;
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(vidW * dpr));
        c.height = Math.max(1, Math.round(vidH * dpr));
        const ctx = c.getContext("2d", { willReadFrequently: true });
        try {
          ctx.drawImage(tmp, 0, 0, c.width, c.height);
        } catch (e) {
          return { dataUrl: null, canvas: c };
        }
        let dataUrl = null;
        try {
          dataUrl = c.toDataURL("image/png");
        } catch (e) {
          dataUrl = null;
        }
        try {
          // log a tiny brightness sample to help diagnose black frames
          try {
            const sctx = c.getContext("2d", { willReadFrequently: true });
            const px = sctx.getImageData(0, 0, 1, 1).data;
            console.debug &&
              console.debug("captureAny: grabFrame sample", {
                attempt: _grabAttempt,
                sample: [px[0], px[1], px[2]],
                hasDataUrl: !!dataUrl,
              });
          } catch (e) {}
        } catch (e) {}
        return { dataUrl, canvas: c };
      };

      let result = grabFrame();
      // If the frame looks nearly black, retry a few times after short delays
      const looksBlack = (canvas) => {
        try {
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          const px = ctx.getImageData(0, 0, 1, 1).data;
          const brightness = px[0] + px[1] + px[2];
          return brightness < 10; // very dark
        } catch (e) {
          return false;
        }
      };
      // If the first frame is black, try a few retries before deciding.
      if ((!result.dataUrl || looksBlack(result.canvas)) && tmp) {
        const delays = [300, 500, 800];
        for (let i = 0; i < delays.length; i++) {
          await new Promise((r) => setTimeout(r, delays[i]));
          try {
            if (typeof tmp.requestVideoFrameCallback === "function") {
              await new Promise((r) =>
                tmp.requestVideoFrameCallback(() => r())
              );
            }
          } catch (e) {}
          result = grabFrame();
          if (result.dataUrl && !looksBlack(result.canvas)) break;
        }
      }

      if (!result.dataUrl || looksBlack(result.canvas)) {
        // Only fallback to html2canvas automatically when the user selected
        // the browser/tab (`displaySurface === 'browser'`). For other
        // selections prefer the stream (even if darker) and show an error
        // if we couldn't get a valid frame.
        if (displaySurface === "browser") {
          try {
            try {
              if (stream && stream.getTracks) {
                stream.getTracks().forEach((t) => {
                  try {
                    t.stop();
                  } catch (e) {}
                });
              }
            } catch (e) {}

            const runner =
              typeof window !== "undefined" && window.html2canvas
                ? window.html2canvas
                : typeof html2canvas === "function"
                ? html2canvas
                : null;
            if (!runner) await this.ensureHtml2Canvas();
            const h2c =
              typeof window !== "undefined" && window.html2canvas
                ? window.html2canvas
                : typeof html2canvas === "function"
                ? html2canvas
                : null;
            if (h2c) {
              const canvas = await h2c(document.documentElement, {
                useCORS: true,
                scale: window.devicePixelRatio || 1,
              });
              const dataUrl = canvas.toDataURL("image/png");
              this._appendThumbnail(preview, dataUrl);
            } else {
              const tile = document.createElement("div");
              tile.className =
                "bugscribe-preview__item bugscribe-preview__error";
              tile.textContent = "Unable to capture screen frame";
              preview.appendChild(tile);
            }
          } catch (e) {
            const tile = document.createElement("div");
            tile.className = "bugscribe-preview__item bugscribe-preview__error";
            tile.textContent = "Unable to capture screen frame";
            preview.appendChild(tile);
          }
        } else {
          try {
            console.warn &&
              console.warn(
                "captureAny: no valid frame, displaySurface=",
                displaySurface
              );
          } catch (e) {}
          const tile = document.createElement("div");
          tile.className = "bugscribe-preview__item bugscribe-preview__error";
          tile.textContent =
            "Unable to capture selected display (no valid frame). Try selecting 'Window' or 'Entire screen' instead of 'Tab', or allow more time for the source to update.";
          preview.appendChild(tile);
        }
      } else {
        this._appendThumbnail(preview, result.dataUrl);
      }
    } catch (err) {
      try {
        console.error && console.error("captureAny failed", err);
      } catch (e) {}
      const tile = document.createElement("div");
      tile.className = "bugscribe-preview__item bugscribe-preview__error";
      tile.textContent = "Screen capture cancelled or failed";
      this.getPreviewContainer().appendChild(tile);
    } finally {
      try {
        if (typeof restoreHidden === "function") restoreHidden();
      } catch (e) {}
      try {
        if (tmp && tmp.parentNode) tmp.parentNode.removeChild(tmp);
      } catch (e) {}
      try {
        if (stream && stream.getTracks) {
          stream.getTracks().forEach((t) => {
            try {
              t.stop();
            } catch (e) {}
          });
        }
      } catch (e) {}
    }
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

  async _snapshotVideosForCapture(preview) {
    // Try to replace <video> elements with static images (data-URL) of
    // their current frame or the video's poster so html2canvas can capture
    // them. If a video is cross-origin or not ready, fallback to poster or
    // add a diagnostic tile to `preview` when available. Returns a restore
    // function.
    try {
      const vids = Array.from(document.querySelectorAll("video"));
      if (!vids.length) return null;
      const replaced = [];

      // Instead of replacing the video node (which stops playback), insert an
      // absolutely-positioned overlay image above the video so the visual
      // appearance is captured while the original video continues playing.
      const insertImage = (v, src, layoutW, layoutH) => {
        try {
          const rect = v.getBoundingClientRect();
          const pageX = rect.left + (window.scrollX || window.pageXOffset || 0);
          const pageY = rect.top + (window.scrollY || window.pageYOffset || 0);
          const img = document.createElement("img");
          img.src = src;
          img.style.position = "absolute";
          img.style.left = pageX + "px";
          img.style.top = pageY + "px";
          img.style.width = layoutW + "px";
          img.style.height = layoutH + "px";
          img.style.objectFit = "cover";
          img.style.pointerEvents = "none";
          img.style.zIndex = "2147483647";
          img.setAttribute("data-bugscribe-snapshot", "1");
          // Preserve reference to overlay so we can remove it later
          document.body.appendChild(img);
          replaced.push({ video: v, overlay: img });
          return true;
        } catch (e) {
          return false;
        }
      };
      const captureFrame = (v, timeout = 1000) => {
        return new Promise((resolve) => {
          let finished = false;
          const done = (data) => {
            if (finished) return;
            finished = true;
            resolve(data || null);
          };

          const tryDrawFrom = (videoEl) => {
            try {
              const vidW = videoEl.videoWidth || 0;
              const vidH = videoEl.videoHeight || 0;
              if (vidW > 0 && vidH > 0) {
                const c = document.createElement("canvas");
                c.width = vidW;
                c.height = vidH;
                const ctx = c.getContext("2d", { willReadFrequently: true });
                ctx.drawImage(videoEl, 0, 0, vidW, vidH);
                try {
                  ctx.getImageData(0, 0, 1, 1);
                  done(c.toDataURL("image/png"));
                  return true;
                } catch (err) {
                  return false;
                }
              }
            } catch (e) {
              return false;
            }
            return false;
          };

          // 1) If requestVideoFrameCallback available on source, use it and draw directly
          if (typeof v.requestVideoFrameCallback === "function") {
            try {
              v.requestVideoFrameCallback(() => {
                tryDrawFrom(v) || done(null);
              });
            } catch (e) {
              // fallback
            }
            setTimeout(() => done(null), timeout + 200);
            return;
          }

          // 2) If source already has dimensions, attempt direct draw
          if (v.videoWidth && v.videoHeight) {
            if (tryDrawFrom(v)) return;
          }

          // 3) Try captureStream() from the source into a temporary video element
          const tryCaptureStream = async () => {
            try {
              const streamFn = v.captureStream || v.mozCaptureStream;
              if (!streamFn) return null;
              let stream = null;
              try {
                stream = v.captureStream
                  ? v.captureStream()
                  : v.mozCaptureStream();
              } catch (e) {
                return null;
              }
              if (!stream) return null;
              const tmp = document.createElement("video");
              tmp.style.position = "fixed";
              tmp.style.left = "-9999px";
              tmp.muted = true;
              tmp.playsInline = true;
              tmp.autoplay = true;
              tmp.srcObject = stream;
              document.body.appendChild(tmp);
              let settled = false;
              const cleanupTmp = () => {
                try {
                  if (tmp && tmp.parentNode) tmp.parentNode.removeChild(tmp);
                } catch (e) {}
                try {
                  stream.getTracks().forEach((t) => t.stop());
                } catch (e) {}
              };
              const onFrame = () => {
                try {
                  if (tryDrawFrom(tmp)) {
                    settled = true;
                    cleanupTmp();
                    done(true);
                    return;
                  }
                } catch (e) {}
              };
              if (typeof tmp.requestVideoFrameCallback === "function") {
                try {
                  tmp.requestVideoFrameCallback(() => setTimeout(onFrame, 20));
                } catch (e) {
                  // ignore
                }
              }
              const onPlayable = () => {
                try {
                  if (!settled) onFrame();
                } catch (e) {}
              };
              tmp.addEventListener("playing", onPlayable);
              tmp.addEventListener("loadeddata", onPlayable);
              setTimeout(() => {
                if (!settled) {
                  cleanupTmp();
                  done(null);
                }
              }, timeout + 200);
              return null; // resolution handled via done()
            } catch (e) {
              return null;
            }
          };

          tryCaptureStream();

          // 4) Finally, wait for playing/loadeddata events on source with timeout
          const t = setTimeout(() => done(null), timeout);
          const onPlayableSrc = () => {
            clearTimeout(t);
            if (!tryDrawFrom(v)) done(null);
          };
          try {
            v.addEventListener("playing", onPlayableSrc, { once: true });
            v.addEventListener("loadeddata", onPlayableSrc, { once: true });
          } catch (e) {
            clearTimeout(t);
            done(null);
          }
        });
      };

      const loadImageAsDataUrl = (src, layoutW, layoutH, timeout = 2000) => {
        return new Promise((resolve) => {
          try {
            const img = document.createElement("img");
            let settled = false;
            const onLoad = () => {
              try {
                const c = document.createElement("canvas");
                c.width = img.naturalWidth || layoutW;
                c.height = img.naturalHeight || layoutH;
                const ctx = c.getContext("2d", { willReadFrequently: true });
                ctx.drawImage(img, 0, 0, c.width, c.height);
                try {
                  ctx.getImageData(0, 0, 1, 1);
                  const data = c.toDataURL("image/png");
                  settled = true;
                  resolve(data);
                  return;
                } catch (err) {
                  settled = true;
                  resolve(null);
                  return;
                }
              } catch (e) {
                settled = true;
                resolve(null);
                return;
              }
            };
            const onErr = () => {
              if (!settled) resolve(null);
            };
            const to = setTimeout(() => {
              if (!settled) resolve(null);
            }, timeout);
            img.crossOrigin = "anonymous";
            img.onload = () => {
              clearTimeout(to);
              onLoad();
            };
            img.onerror = () => {
              clearTimeout(to);
              onErr();
            };
            img.src = src;
          } catch (e) {
            resolve(null);
          }
        });
      };

      await Promise.all(
        vids.map(async (v) => {
          try {
            if (v.getAttribute && v.getAttribute("data-bugscribe-snapshot"))
              return;
            const rect = v.getBoundingClientRect();
            const layoutW = Math.round(rect.width) || 160;
            const layoutH = Math.round(rect.height) || 90;

            const poster = v.getAttribute && v.getAttribute("poster");
            if (poster) {
              insertImage(v, poster, layoutW, layoutH);
              return;
            }

            const frameData = await captureFrame(v, 1600);
            if (frameData) {
              insertImage(v, frameData, layoutW, layoutH);
              return;
            }

            const src = v.currentSrc || v.src;
            if (src) {
              const imgData = await loadImageAsDataUrl(src, layoutW, layoutH);
              if (imgData) {
                insertImage(v, imgData, layoutW, layoutH);
                return;
              }
              if (preview)
                this._appendThumbnail(
                  preview,
                  "data:,Video not capturable (cross-origin)"
                );
              return;
            }

            if (preview)
              this._appendThumbnail(
                preview,
                "data:,Video not capturable (no poster, cross-origin or not decoded)"
              );
          } catch (e) {
            // ignore per-video failures
          }
        })
      );

      if (!replaced.length) return null;
      return () => {
        replaced.forEach((r) => {
          try {
            if (r.overlay && r.overlay.parentNode) {
              const vid = r.video;
              r.overlay.parentNode.removeChild(r.overlay);
              // Trigger a small mouse event to coax native controls to reappear
              try {
                if (vid && typeof vid.dispatchEvent === "function") {
                  const ev = new MouseEvent("mousemove", {
                    bubbles: true,
                    cancelable: true,
                  });
                  vid.dispatchEvent(ev);
                }
              } catch (e) {}
            } else if (r.parent && r.repl && r.orig) {
              r.parent.replaceChild(r.orig, r.repl);
              try {
                if (r.orig && typeof r.orig.dispatchEvent === "function") {
                  const ev2 = new MouseEvent("mousemove", {
                    bubbles: true,
                    cancelable: true,
                  });
                  r.orig.dispatchEvent(ev2);
                }
              } catch (e) {}
            }
          } catch (e) {}
        });
      };
    } catch (e) {
      return null;
    }
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
        try {
          window.removeEventListener("keydown", this._onHotkey, {
            passive: false,
          });
        } catch (e) {}
        try {
          window.removeEventListener("keydown", this._modKeyDown, {
            capture: true,
          });
        } catch (e) {}
        try {
          window.removeEventListener("keyup", this._modKeyUp, {
            capture: true,
          });
        } catch (e) {}
      }
    } catch (e) {}
  }
}
