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
    // Button click
    const screenshotBtn = document.getElementById("takeScreenshotBtn");
    if (screenshotBtn) {
      screenshotBtn.addEventListener("click", () => {
        this.takeScreenshot();
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

  takeScreenshot() {
    loadHtml2Canvas(() => {
      html2canvas(document.body).then((canvas) => {
        const dataUrl = canvas.toDataURL("image/png");
        this.showPreview(dataUrl);
      });
    });
  }

  showPreview(dataUrl) {
    // Create preview image
    const img = document.createElement("img");
    img.src = dataUrl;
    img.title = "Click to expand";
    img.addEventListener("click", () => {
      this.expandScreenshot(dataUrl);
    });
    this.previewContainer.appendChild(img);
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
