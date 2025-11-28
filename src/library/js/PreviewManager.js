import { icons } from "./icons.js";
import CustomVideoPlayer from "./video-player/CustomVideoPlayer.js";

export default class PreviewManager {
  constructor(onPreviewClickCallback, onDeleteCallback, config = {}) {
    this.preview_wrapper = null;
    this.onPreviewClick = onPreviewClickCallback;
    this.onDelete = onDeleteCallback;
    this.onDeleteAll = config.onDeleteAll; // Callback for delete all
    this.activeVideoPlayer = null;
    this.currentMediaList = []; // Store all media items for carousel
    this.config = {
      maxVisibleItems: config.maxVisibleItems || 4,
      itemWidth: config.itemWidth || 200, // Width of each preview item in pixels
      itemGap: config.itemGap || 5, // Gap between items in pixels
      viewMode: config.viewMode || "modal", // "modal" or "carousel"
    };
  }

  // --- UI Wrapper Management ---

  hideWrapper = () => {
    document
      .querySelectorAll(".bug-element")
      .forEach((el) => el.classList.add("hide_el"));
    return Promise.resolve();
  };

  showWrapper = () => {
    // Always show bug button and other elements
    document
      .querySelectorAll(".bug-element")
      .forEach((el) => el.classList.remove("hide_el"));
  };

  createWrapper = () => {
    if (this.preview_wrapper) return;
    const wrapper = document.createElement("div");
    wrapper.id = "bugscribe-preview-wrapper";
    wrapper.className = "bug-element thin-scroll";

    // Calculate max width based on configuration
    const maxWidth =
      this.config.maxVisibleItems * this.config.itemWidth +
      (this.config.maxVisibleItems + 1) * this.config.itemGap +
      10; // Extra padding

    wrapper.style.maxWidth = `${maxWidth}px`;

    // Create Remove All button
    const removeAllBtn = document.createElement("button");
    removeAllBtn.className = "preview-remove-all-btn";
    removeAllBtn.innerHTML = `${icons.trash}<span>Remove All</span>`;
    removeAllBtn.title = "Remove all screenshots and recordings";
    removeAllBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.onDeleteAll) {
        this.onDeleteAll();
      }
    });

    // Create container for preview items
    const itemsContainer = document.createElement("div");
    itemsContainer.className = "preview-items-wrapper thin-scroll";

    wrapper.appendChild(removeAllBtn);
    wrapper.appendChild(itemsContainer);
    document.body.appendChild(wrapper);
    this.preview_wrapper = wrapper;
    this.itemsContainer = itemsContainer;
    this.removeAllBtn = removeAllBtn;
  };

  redrawPreviews = (currentPreviews) => {
    this.currentMediaList = currentPreviews; // Store for carousel
    if (this.itemsContainer) {
      // Clear only the items container
      this.itemsContainer.innerHTML = "";
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
      this.itemsContainer = null;
      this.removeAllBtn = null;
    }
  };

  // --- Image Preview ---

  showImagePreview = (index, thumbnailUrl) => {
    if (!this.preview_wrapper) {
      this.createWrapper();
    }

    const wrapper = document.createElement("div");
    wrapper.className = "image-preview-wrapper";
    wrapper.setAttribute("data-index", index);

    const thumbnailImg = document.createElement("img");
    thumbnailImg.src = thumbnailUrl;
    thumbnailImg.className = "screenshot-preview image-thumbnail";

    const menuButton = this._createMenuButton(index, "image");

    wrapper.append(thumbnailImg, menuButton);

    wrapper.addEventListener("click", (e) => {
      if (
        e.target.closest(".preview-menu-btn") ||
        e.target.closest(".preview-menu-dropdown")
      ) {
        return;
      }

      if (this.config.viewMode === "carousel") {
        this.openCarousel(index);
      } else {
        const mediaData = this.onPreviewClick(index);
        if (mediaData) this.viewFullImage(mediaData.url);
      }
    });

    this.itemsContainer.appendChild(wrapper);
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
    close.innerHTML = icons.cancel || "+";
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

    controls.append(zoomIn, zoomOut, resetZoom, download, close);

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
    if (!this.preview_wrapper) {
      this.createWrapper();
    }

    const wrapper = document.createElement("div");
    wrapper.className = "video-preview-wrapper";
    wrapper.setAttribute("data-index", index);

    const thumbnailImg = document.createElement("img");
    thumbnailImg.src = thumbnailUrl;
    thumbnailImg.className = "screenshot-preview video-thumbnail";

    const playIcon = document.createElement("div");
    playIcon.className = "video-play-icon";
    playIcon.innerHTML = icons.play;

    const menuButton = this._createMenuButton(index, "video");

    wrapper.append(thumbnailImg, playIcon, menuButton);

    wrapper.addEventListener("click", (e) => {
      if (
        e.target.closest(".preview-menu-btn") ||
        e.target.closest(".preview-menu-dropdown")
      ) {
        return;
      }

      if (this.config.viewMode === "carousel") {
        this.openCarousel(index);
      } else {
        const mediaData = this.onPreviewClick(index);
        if (mediaData) this.playFullVideo(mediaData.url, mediaData.duration);
      }
    });

    this.itemsContainer.appendChild(wrapper);
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

  // --- Carousel View ---

  openCarousel(startIndex = 0) {
    // Always rebuild currentMediaList from DOM to ensure it's up to date
    this.currentMediaList = [];
    if (this.preview_wrapper) {
      const previews = this.preview_wrapper.querySelectorAll('[data-index]');
      console.log("Rebuilding currentMediaList from", previews.length, "preview elements");
      previews.forEach((_, idx) => {
        const mediaData = this.onPreviewClick(idx);
        if (mediaData) {
          this.currentMediaList.push(mediaData);
          console.log(`Added media ${idx}:`, mediaData.type);
        }
      });
    }

    console.log("Opening carousel with", this.currentMediaList.length, "items, starting at index", startIndex);

    const carousel = document.createElement("div");
    carousel.className = "media-carousel-overlay";

    const content = document.createElement("div");
    content.className = "media-carousel-content";

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.className = "carousel-close-btn";
    closeBtn.innerHTML = icons.cancel;
    closeBtn.title = "Close";

    // Main display area
    const displayArea = document.createElement("div");
    displayArea.className = "carousel-display-area";

    // Navigation buttons
    const prevBtn = document.createElement("button");
    prevBtn.className = "carousel-nav-btn carousel-prev-btn";
    prevBtn.innerHTML = icons.arrow_left;
    prevBtn.title = "Previous";

    const nextBtn = document.createElement("button");
    nextBtn.className = "carousel-nav-btn carousel-next-btn";
    nextBtn.innerHTML = icons.arrow_right;
    nextBtn.title = "Next";

    // Thumbnail strip at bottom
    const thumbnailStrip = document.createElement("div");
    thumbnailStrip.className = "carousel-thumbnail-strip";

    let currentIndex = startIndex;

    // Keyboard navigation
    const handleKeyboard = (e) => {
      switch (e.key) {
        case "Escape":
          closeCarousel();
          break;
        case "ArrowLeft":
          if (currentIndex > 0) {
            currentIndex--;
            renderMedia(currentIndex);
          }
          break;
        case "ArrowRight":
          if (currentIndex < this.currentMediaList.length - 1) {
            currentIndex++;
            renderMedia(currentIndex);
          }
          break;
      }
    };

    // Close carousel
    const closeCarousel = () => {
      if (this.activeVideoPlayer) {
        this.activeVideoPlayer.destroy();
        this.activeVideoPlayer = null;
      }
      carousel.remove();
      document.removeEventListener("keydown", handleKeyboard);
    };

    // Render current media
    const renderMedia = (index) => {
      console.log("renderMedia called with index:", index);

      // Update current index
      currentIndex = index;
      console.log("Updated currentIndex to:", currentIndex);

      // Clear only the media content, keep buttons
      const existingMedia = displayArea.querySelector(".carousel-image, .carousel-video-container");
      if (existingMedia) {
        existingMedia.remove();
      }

      const mediaData = this.onPreviewClick(index);
      console.log("Media data:", mediaData);
      if (!mediaData) {
        console.error("No media data returned for index:", index);
        return;
      }

      if (mediaData.type === "image") {
        const img = document.createElement("img");
        img.src = mediaData.url;
        img.className = "carousel-image";
        // Insert before the first button
        if (displayArea.firstChild) {
          displayArea.insertBefore(img, displayArea.firstChild);
        } else {
          displayArea.appendChild(img);
        }
      } else if (mediaData.type === "video") {
        if (this.activeVideoPlayer) {
          this.activeVideoPlayer.destroy();
          this.activeVideoPlayer = null;
        }

        const videoPlayer = new CustomVideoPlayer(mediaData.url, {
          autoplay: false,
          showDownload: false,
          showClose: false,
          knownDuration: mediaData.duration ? mediaData.duration / 1000 : null,
        });

        const videoContainer = document.createElement("div");
        videoContainer.className = "carousel-video-container";

        // Insert before the first button
        if (displayArea.firstChild) {
          displayArea.insertBefore(videoContainer, displayArea.firstChild);
        } else {
          displayArea.appendChild(videoContainer);
        }

        // Initialize video player
        setTimeout(() => {
          this.activeVideoPlayer = videoPlayer;
          videoPlayer.open();
          // Move the modal content to our container
          const videoModal = document.querySelector(".custom-video-modal-overlay");
          if (videoModal) {
            const videoContent = videoModal.querySelector(
              ".custom-video-modal-content"
            );
            if (videoContent) {
              videoContainer.innerHTML = "";
              videoContainer.appendChild(videoContent);
              videoModal.remove();
            }
          }
        }, 0);
      }

      // Update thumbnails active state
      document.querySelectorAll(".carousel-thumbnail").forEach((thumb) => {
        const thumbIndex = parseInt(thumb.getAttribute("data-index"));
        if (thumbIndex === index) {
          thumb.classList.add("active");
        } else {
          thumb.classList.remove("active");
        }
      });

      // Update navigation buttons
      prevBtn.disabled = index === 0;
      nextBtn.disabled = index === this.currentMediaList.length - 1;
      console.log(`Button states updated: prev disabled=${prevBtn.disabled}, next disabled=${nextBtn.disabled} (index=${index}, total=${this.currentMediaList.length})`);
    };

    // Create thumbnails
    const createThumbnails = () => {
      thumbnailStrip.innerHTML = "";
      console.log("Creating thumbnails for", this.currentMediaList.length, "items");

      this.currentMediaList.forEach((item, idx) => {
        console.log(`Creating thumbnail ${idx}:`, item.thumbnail);

        const thumb = document.createElement("div");
        thumb.className = `carousel-thumbnail ${
          idx === currentIndex ? "active" : ""
        }`;
        thumb.setAttribute("data-index", idx);

        const thumbImg = document.createElement("img");
        thumbImg.src = item.thumbnail;
        thumbImg.alt = `Thumbnail ${idx + 1}`;

        thumb.appendChild(thumbImg);

        if (item.type === "video") {
          const playIcon = document.createElement("div");
          playIcon.className = "carousel-thumb-play-icon";
          playIcon.innerHTML = icons.play;
          thumb.appendChild(playIcon);
        }

        thumb.addEventListener("click", () => {
          console.log("Thumbnail clicked:", idx);
          renderMedia(idx);
        });

        thumbnailStrip.appendChild(thumb);
      });

      console.log("Thumbnails created, total in strip:", thumbnailStrip.children.length);
    };

    // Navigation button click handlers
    prevBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      console.log("Prev button clicked, currentIndex:", currentIndex);
      if (currentIndex > 0) {
        renderMedia(currentIndex - 1);
      }
    });

    nextBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      console.log("Next button clicked, currentIndex:", currentIndex, "total:", this.currentMediaList.length);
      if (currentIndex < this.currentMediaList.length - 1) {
        renderMedia(currentIndex + 1);
      } else {
        console.log("Next button disabled - at last item");
      }
    });

    closeBtn.addEventListener("click", closeCarousel);

    // Click outside to close
    carousel.addEventListener("click", (e) => {
      if (e.target === carousel) {
        closeCarousel();
      }
    });

    document.addEventListener("keydown", handleKeyboard);

    // Add navigation buttons to display area
    displayArea.appendChild(prevBtn);
    displayArea.appendChild(nextBtn);

    // Assemble carousel
    content.append(closeBtn, displayArea, thumbnailStrip);
    carousel.appendChild(content);
    document.body.appendChild(carousel);

    // Initialize - create thumbnails first, then render media
    createThumbnails();
    renderMedia(currentIndex);
  }

  // --- Helper Functions ---

  _createMenuButton = (index, type) => {
    const menuContainer = document.createElement("div");
    menuContainer.className = "preview-menu-container";

    const menuButton = document.createElement("button");
    menuButton.className = "preview-menu-btn";
    menuButton.innerHTML = icons.vertical_menu;
    menuButton.setAttribute("aria-label", "Menu");

    const dropdown = document.createElement("div");
    dropdown.className = "preview-menu-dropdown";

    // Download option
    const downloadOption = document.createElement("button");
    downloadOption.className = "preview-menu-option";
    downloadOption.innerHTML = `${icons.download}<span>Download</span>`;
    downloadOption.addEventListener("click", (e) => {
      e.stopPropagation();
      const mediaData = this.onPreviewClick(index);
      if (mediaData && mediaData.url) {
        this._triggerDownload(mediaData.url, type);
      } else {
        console.warn("Media data not found for download.");
      }
      dropdown.classList.remove("show");
    });

    // Delete option
    const deleteOption = document.createElement("button");
    deleteOption.className = "preview-menu-option";
    deleteOption.innerHTML = `${icons.trash}<span>Delete</span>`;
    deleteOption.addEventListener("click", (e) => {
      e.stopPropagation();
      this.onDelete(index);
      dropdown.classList.remove("show");
    });

    dropdown.append(downloadOption, deleteOption);

    // Toggle dropdown on menu button click
    menuButton.addEventListener("click", (e) => {
      e.stopPropagation();
      // Close all other open dropdowns
      document
        .querySelectorAll(".preview-menu-dropdown.show")
        .forEach((el) => {
          if (el !== dropdown) el.classList.remove("show");
        });
      dropdown.classList.toggle("show");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!menuContainer.contains(e.target)) {
        dropdown.classList.remove("show");
      }
    });

    menuContainer.append(menuButton, dropdown);
    return menuContainer;
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
