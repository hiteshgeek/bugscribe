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
    // Keyboard shortcut: Ctrl+Shift+S
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        this.takeScreenshot();
      }
    });
    // Modal close
    document
      .getElementById("closeScreenshotModal")
      .addEventListener("click", () => {
        this.fullscreenModal.style.display = "none";
      });
    // Click outside image closes modal
    this.fullscreenModal.addEventListener("click", (e) => {
      if (e.target === this.fullscreenModal) {
        this.fullscreenModal.style.display = "none";
      }
    });
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
    document.getElementById("fullscreenScreenshotImg").src = dataUrl;
    this.fullscreenModal.style.display = "flex";
  }
}

// Initialize on DOMContentLoaded
window.addEventListener("DOMContentLoaded", () => {
  new ScreenshotManager();
});
