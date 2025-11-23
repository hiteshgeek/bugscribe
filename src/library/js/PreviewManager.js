import { icons } from "./icons.js";

export default class PreviewManager {
  constructor(onPreviewClickCallback, onDeleteCallback) {
    this.preview_wrapper = null;
    this.onPreviewClick = onPreviewClickCallback;
    this.onDelete = onDeleteCallback;
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
    if (currentPreviews.length === 0) {
      this.preview_wrapper.remove();
      this.preview_wrapper = null;
    }
  };

  // --- Image Preview ---

  // MODIFIED: Now accepts index instead of full URL
  showImagePreview = (index, thumbnailUrl) => {
    this.createWrapper();

    const wrapper = document.createElement("div");
    wrapper.className = "image-preview-wrapper";
    wrapper.setAttribute("data-index", index);

    const thumbnailImg = document.createElement("img");
    thumbnailImg.src = thumbnailUrl;
    thumbnailImg.className = "screenshot-preview image-thumbnail";

    // NEW: Delete button
    const deleteButton = this._createDeleteButton(index);

    // MODIFIED: Append both thumbnail and delete button
    wrapper.append(thumbnailImg, deleteButton);

    // MODIFIED: Click handler for viewing full image (only if not clicking delete)
    wrapper.addEventListener("click", (e) => {
      if (e.target !== deleteButton && !deleteButton.contains(e.target)) {
        const mediaData = this.onPreviewClick(index);
        this.viewFullImage(mediaData.url);
      }
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

    // NEW: Delete button
    const deleteButton = this._createDeleteButton(index);

    // MODIFIED: Append thumbnail, play icon, and delete button
    wrapper.append(thumbnailImg, playIcon, deleteButton);

    // MODIFIED: Click handler for playing full video (only if not clicking delete)
    wrapper.addEventListener("click", (e) => {
      if (e.target !== deleteButton && !deleteButton.contains(e.target)) {
        const mediaData = this.onPreviewClick(index);
        this.playFullVideo(mediaData.url);
      }
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

  _createDeleteButton = (index) => {
    const deleteButton = document.createElement("button");
    deleteButton.className = "preview-delete-btn";
    deleteButton.innerHTML = "×"; // Using a simple '×' for now

    deleteButton.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent the main preview click handler
      this.onDelete(index); // Call the delete callback from Bugscribe
    });
    return deleteButton;
  };
}
