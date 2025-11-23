// PreviewManager.js

import { icons } from "./icons.js";

export default class PreviewManager {
  constructor() {
    this.preview_wrapper = null;
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

  showImagePreview = (imageUrl, thumbnailUrl) => {
    this.createWrapper();

    const wrapper = document.createElement("div");
    wrapper.className = "image-preview-wrapper";
    wrapper.setAttribute("data-image-url", imageUrl);

    const thumbnailImg = document.createElement("img");
    thumbnailImg.src = thumbnailUrl;
    thumbnailImg.className = "screenshot-preview image-thumbnail";
    wrapper.appendChild(thumbnailImg);

    wrapper.addEventListener("click", () => this.viewFullImage(imageUrl));
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

  showVideoPreview = (videoUrl, thumbnailUrl) => {
    this.createWrapper();

    const wrapper = document.createElement("div");
    wrapper.className = "video-preview-wrapper";
    wrapper.setAttribute("data-video-url", videoUrl);

    const thumbnailImg = document.createElement("img");
    thumbnailImg.src = thumbnailUrl;
    thumbnailImg.className = "screenshot-preview video-thumbnail";

    const playIcon = document.createElement("div");
    playIcon.className = "video-play-icon";
    playIcon.innerHTML = icons.play;

    wrapper.append(thumbnailImg, playIcon);

    wrapper.addEventListener("click", () => this.playFullVideo(videoUrl));
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
