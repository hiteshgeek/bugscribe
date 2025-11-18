export class PreviewManager {
  constructor(container) {
    this.container = container;
    this.count = 0;
    this.urls = new Set();
  }

  addImage(dataUrl, onClick) {
    this.count++;
    const wrapper = document.createElement("div");
    wrapper.className = "preview-item";
    wrapper.dataset.index = this.count;

    wrapper.innerHTML = `
      <img src="${dataUrl}" class="preview-thumb"/>
      <span class="preview-num">${this.count}</span>
      <button class="del-btn">&times;</button>
    `;

    wrapper.querySelector(".del-btn").onclick = (e) => {
      e.stopPropagation();
      this.remove(wrapper);
    };

    wrapper.onclick = () => onClick(this.count);

    this.container.appendChild(wrapper);
  }

  addVideo(blobUrl, thumbDataUrl, onClick) {
    this.urls.add(blobUrl);
    this.count++;

    const wrapper = document.createElement("div");
    wrapper.className = "preview-item";
    wrapper.dataset.index = this.count;
    wrapper.dataset.videoUrl = blobUrl;

    wrapper.innerHTML = `
      <img src="${thumbDataUrl}" class="preview-thumb"/>
      <span class="play-icon">▶</span>
      <span class="preview-num">${this.count}</span>
      <button class="del-btn">&times;</button>
    `;

    wrapper.querySelector(".del-btn").onclick = (e) => {
      e.stopPropagation();
      this.remove(wrapper);
    };

    wrapper.onclick = () => onClick(this.count);

    this.container.appendChild(wrapper);
  }

  remove(wrapper) {
    const url = wrapper.dataset.videoUrl;
    if (url) {
      URL.revokeObjectURL(url);
      this.urls.delete(url);
    }
    wrapper.remove();
  }

  clear() {
    this.urls.forEach((url) => URL.revokeObjectURL(url));
    this.urls.clear();
    this.container.innerHTML = "";
    this.count = 0;
  }
}
