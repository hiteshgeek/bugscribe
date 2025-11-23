import { icons } from "./icons.js";

export default class PreviewManager {
  // MODIFIED: Accepts onPreviewClickCallback
  constructor(onPreviewClickCallback) {
    this.preview_wrapper = null;
    this.onPreviewClick = onPreviewClickCallback; // Store the callback from Bugscribe
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

  // --- Image Preview ---

  // MODIFIED: Now accepts index instead of full URL
  showImagePreview = (index, thumbnailUrl) => {
    this.createWrapper();

    const wrapper = document.createElement("div");
    wrapper.className = "image-preview-wrapper";
    // MODIFIED: Store index instead of data-image-url
    wrapper.setAttribute("data-index", index);

    const thumbnailImg = document.createElement("img");
    thumbnailImg.src = thumbnailUrl;
    thumbnailImg.className = "screenshot-preview image-thumbnail";
    wrapper.appendChild(thumbnailImg);

    // MODIFIED: The click handler retrieves the data using the index
    wrapper.addEventListener("click", () => {
      const mediaData = this.onPreviewClick(index);
      this.viewFullImage(mediaData.url);
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

  // MODIFIED: Now accepts index instead of full URL
  showVideoPreview = (index, thumbnailUrl) => {
    this.createWrapper();

    const wrapper = document.createElement("div");
    wrapper.className = "video-preview-wrapper";
    // MODIFIED: Store index instead of data-video-url
    wrapper.setAttribute("data-index", index);

    const thumbnailImg = document.createElement("img");
    thumbnailImg.src = thumbnailUrl;
    thumbnailImg.className = "screenshot-preview video-thumbnail";

    const playIcon = document.createElement("div");
    playIcon.className = "video-play-icon";
    playIcon.innerHTML = icons.play;

    wrapper.append(thumbnailImg, playIcon);

    // MODIFIED: The click handler retrieves the data using the index
    wrapper.addEventListener("click", () => {
      const mediaData = this.onPreviewClick(index);
      this.playFullVideo(mediaData.url);
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
}
