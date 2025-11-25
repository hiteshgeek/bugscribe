import { icons } from "./icons.js";
import CustomVideoPlayer from "./video-player/CustomVideoPlayer.js";

export default class PreviewManager {
  constructor(onPreviewClickCallback, onDeleteCallback) {
    this.preview_wrapper = null;
    this.onPreviewClick = onPreviewClickCallback;
    this.onDelete = onDeleteCallback;
    this.activeVideoPlayer = null;
  }

  // --- UI Wrapper Management ---

  hideWrapper = () => {
    document
      .querySelectorAll(".bug-element")
      .forEach((el) => el.classList.add("hide_el"));
    return Promise.resolve();
  };

  showWrapper = () => {
    if (!this.preview_wrapper) this.createWrapper();
    document
      .querySelectorAll(".bug-element")
      .forEach((el) => el.classList.remove("hide_el"));
  };

  createWrapper = () => {
    if (this.preview_wrapper) return;
    const wrapper = document.createElement("div");
    wrapper.id = "bugscribe-preview-wrapper";
    wrapper.className = "bug-element thin-scroll";
    document.body.appendChild(wrapper);
    this.preview_wrapper = wrapper;
  };

  redrawPreviews = (currentPreviews) => {
    if (this.preview_wrapper) {
      this.preview_wrapper.innerHTML = "";
    }
    currentPreviews.forEach((item, index) => {
      if (item.type === "image") {
        this.showImagePreview(index, item.thumbnail);
      } else if (item.type === "video") {
        this.showVideoPreview(index, item.thumbnail);
      }
    });
    if (currentPreviews.length === 0 && this.preview_wrapper) {
      this.preview_wrapper.remove();
      this.preview_wrapper = null;
    }
  };

  // --- Image Preview ---

  showImagePreview = (index, thumbnailUrl) => {
    this.createWrapper();

    const wrapper = document.createElement("div");
    wrapper.className = "image-preview-wrapper";
    wrapper.setAttribute("data-index", index);

    const thumbnailImg = document.createElement("img");
    thumbnailImg.src = thumbnailUrl;
    thumbnailImg.className = "screenshot-preview image-thumbnail";

    const deleteButton = this._createDeleteButton(index);
    const downloadButton = this._createDownloadButton(index, "image");

    wrapper.append(thumbnailImg, deleteButton, downloadButton);

    wrapper.addEventListener("click", (e) => {
      if (
        e.target.closest(".preview-delete-btn") ||
        e.target.closest(".preview-download-btn")
      ) {
        return;
      }
      const mediaData = this.onPreviewClick(index);
      if (mediaData) this.viewFullImage(mediaData.url);
    });

    this.preview_wrapper.appendChild(wrapper);
  };

  viewFullImage(imageUrl) {
    const modal = document.createElement("div");
    modal.className = "image-modal-overlay";

    const content = document.createElement("div");
    content.className = "image-modal-content";

    // Custom image viewer with controls
    const controls = document.createElement("div");
    controls.className = "media-controls";

    const close = document.createElement("button");
    close.className = "media-control-btn close-btn";
    close.innerHTML = "×";
    close.title = "Close";

    const zoomIn = document.createElement("button");
    zoomIn.className = "media-control-btn";
    zoomIn.innerHTML = icons.zoomIn || "+";
    zoomIn.title = "Zoom In";

    const zoomOut = document.createElement("button");
    zoomOut.className = "media-control-btn";
    zoomOut.innerHTML = icons.zoomOut || "−";
    zoomOut.title = "Zoom Out";

    const resetZoom = document.createElement("button");
    resetZoom.className = "media-control-btn";
    resetZoom.innerHTML = icons.reset || "⟲";
    resetZoom.title = "Reset Zoom";

    const download = document.createElement("button");
    download.className = "media-control-btn";
    download.innerHTML = icons.download;
    download.title = "Download";

    controls.append(close, zoomIn, zoomOut, resetZoom, download);

    const img = document.createElement("img");
    img.src = imageUrl;
    img.className = "image-modal-viewer";
    img.draggable = false;

    let scale = 1;
    let isDragging = false;
    let startX,
      startY,
      translateX = 0,
      translateY = 0;

    const updateTransform = () => {
      img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
      img.style.cursor = scale > 1 ? "grab" : "default";
    };

    // Zoom controls
    zoomIn.addEventListener("click", () => {
      scale = Math.min(scale + 0.25, 3);
      updateTransform();
    });

    zoomOut.addEventListener("click", () => {
      scale = Math.max(scale - 0.25, 0.5);
      updateTransform();
    });

    resetZoom.addEventListener("click", () => {
      scale = 1;
      translateX = 0;
      translateY = 0;
      updateTransform();
    });

    // Mouse wheel zoom
    content.addEventListener("wheel", (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      scale = Math.min(Math.max(scale + delta, 0.5), 3);
      updateTransform();
    });

    // Drag to pan
    img.addEventListener("mousedown", (e) => {
      if (scale > 1) {
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        img.style.cursor = "grabbing";
      }
    });

    document.addEventListener("mousemove", (e) => {
      if (isDragging) {
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        updateTransform();
      }
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
      img.style.cursor = scale > 1 ? "grab" : "default";
    });

    // Keyboard controls
    const handleKeyboard = (e) => {
      switch (e.key) {
        case "Escape":
          modal.remove();
          document.removeEventListener("keydown", handleKeyboard);
          break;
        case "+":
        case "=":
          zoomIn.click();
          break;
        case "-":
        case "_":
          zoomOut.click();
          break;
        case "0":
          resetZoom.click();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyboard);

    close.addEventListener("click", () => {
      modal.remove();
      document.removeEventListener("keydown", handleKeyboard);
    });

    download.addEventListener("click", () => {
      this._triggerDownload(imageUrl, "image");
    });

    content.append(controls, img);
    modal.appendChild(content);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
        document.removeEventListener("keydown", handleKeyboard);
      }
    });

    document.body.appendChild(modal);
  }

  // --- Video Preview ---

  showVideoPreview = (index, thumbnailUrl) => {
    this.createWrapper();

    const wrapper = document.createElement("div");
    wrapper.className = "video-preview-wrapper";
    wrapper.setAttribute("data-index", index);

    const thumbnailImg = document.createElement("img");
    thumbnailImg.src = thumbnailUrl;
    thumbnailImg.className = "screenshot-preview video-thumbnail";

    const playIcon = document.createElement("div");
    playIcon.className = "video-play-icon";
    playIcon.innerHTML = icons.play;

    const deleteButton = this._createDeleteButton(index);
    const downloadButton = this._createDownloadButton(index, "video");

    wrapper.append(thumbnailImg, playIcon, deleteButton, downloadButton);

    wrapper.addEventListener("click", (e) => {
      if (
        e.target.closest(".preview-delete-btn") ||
        e.target.closest(".preview-download-btn")
      ) {
        return;
      }
      const mediaData = this.onPreviewClick(index);
      if (mediaData) this.playFullVideo(mediaData.url, mediaData.duration);
    });

    this.preview_wrapper.appendChild(wrapper);
  };

  playFullVideo(videoUrl, knownDuration = null) {
    // Close any existing video player
    if (this.activeVideoPlayer) {
      this.activeVideoPlayer.destroy();
    }

    // Convert duration from milliseconds to seconds if needed
    const durationInSeconds = knownDuration ? knownDuration / 1000 : null;

    // Create new custom video player with known duration
    this.activeVideoPlayer = new CustomVideoPlayer(videoUrl, {
      autoplay: true,
      showDownload: true,
      showClose: true,
      knownDuration: durationInSeconds, // Pass the known duration!
      onClose: () => {
        this.activeVideoPlayer = null;
      },
    });

    this.activeVideoPlayer.open();
  }

  // --- Helper Functions ---

  _createDeleteButton = (index) => {
    const deleteButton = document.createElement("button");
    deleteButton.className = "preview-delete-btn";
    deleteButton.innerHTML = icons.cancel;

    deleteButton.addEventListener("click", (e) => {
      e.stopPropagation();
      this.onDelete(index);
    });
    return deleteButton;
  };

  _createDownloadButton = (index, type) => {
    const downloadButton = document.createElement("button");
    downloadButton.className = "preview-download-btn";
    downloadButton.innerHTML = icons.download;

    downloadButton.addEventListener("click", (e) => {
      e.stopPropagation();
      const mediaData = this.onPreviewClick(index);
      if (mediaData && mediaData.url) {
        this._triggerDownload(mediaData.url, type);
      } else {
        console.warn("Media data not found for download.");
      }
    });
    return downloadButton;
  };

  _triggerDownload = (dataUrl, type) => {
    if (!dataUrl) {
      console.error("No data URL available for download.");
      return;
    }
    const link = document.createElement("a");
    link.href = dataUrl;

    const extension = type === "image" ? "png" : "webm";
    link.download = `bugscribe_${type}_${Date.now()}.${extension}`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Cleanup method
  destroy() {
    if (this.activeVideoPlayer) {
      this.activeVideoPlayer.destroy();
    }
    if (this.preview_wrapper) {
      this.preview_wrapper.remove();
      this.preview_wrapper = null;
    }
  }
}
