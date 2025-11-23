import { icons } from "./icons.js";

export default class PreviewManager {
  constructor(onPreviewClickCallback, onDeleteCallback) {
    this.preview_wrapper = null;
    this.onPreviewClick = onPreviewClickCallback; // Store the callback from Bugscribe
    this.onDelete = onDeleteCallback; // Store the delete callback
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
      this.preview_wrapper.innerHTML = ""; // Clear all existing previews
    }
    // Iterate over the remaining media items and re-display them
    currentPreviews.forEach((item, index) => {
      if (item.type === "image") {
        this.showImagePreview(index, item.thumbnail);
      } else if (item.type === "video") {
        this.showVideoPreview(index, item.thumbnail);
      }
    });
    // Optional: Remove wrapper if empty
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

    // Click handler for viewing full image
    wrapper.addEventListener("click", (e) => {
      // Prevent modal opening if delete or download is clicked
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

    const close = document.createElement("button");
    close.className = "image-modal-close";
    close.innerHTML = "×";
    close.addEventListener("click", () => modal.remove());

    const img = document.createElement("img");
    img.src = imageUrl;
    img.className = "image-modal-viewer";

    content.append(close, img);
    modal.appendChild(content);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
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

    // Click handler for viewing full video
    wrapper.addEventListener("click", (e) => {
      // Prevent modal opening if delete or download is clicked
      if (
        e.target.closest(".preview-delete-btn") ||
        e.target.closest(".preview-download-btn")
      ) {
        return;
      }
      const mediaData = this.onPreviewClick(index);
      if (mediaData) this.playFullVideo(mediaData.url);
    });

    this.preview_wrapper.appendChild(wrapper);
  };

  playFullVideo(videoUrl) {
    const modal = document.createElement("div");
    modal.className = "video-modal-overlay";

    const content = document.createElement("div");
    content.className = "video-modal-content";

    const close = document.createElement("button");
    close.className = "video-modal-close";
    close.innerHTML = "×";
    close.addEventListener("click", () => modal.remove());

    const video = document.createElement("video");
    video.src = videoUrl;
    video.controls = true;
    video.autoplay = true;
    video.className = "video-modal-player";

    content.append(close, video);
    modal.appendChild(content);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
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
      // Fallback check in case the index is momentarily invalid during redraw
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
}
