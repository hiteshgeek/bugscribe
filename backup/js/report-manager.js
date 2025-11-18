export class ReportManager {
  constructor(options) {
    this.previewManager = options.previewManager; // instance of PreviewManager
    this.carousel = options.carousel; // instance of CarouselViewer
    // The modal element may not exist on all pages. Make this manager defensive.
    this.modalEl = document.getElementById("reportBugModal") || null;

    if (this.modalEl) {
      this.urlInput = this.modalEl.querySelector("#reportUrl");
      this.msgInput = this.modalEl.querySelector("#reportMessage");
      this.mediaList = this.modalEl.querySelector("#reportMediaList");
      this.statusEl = this.modalEl.querySelector("#reportStatus");
      this.progressWrap = this.modalEl.querySelector("#reportUploadProgress");
      this.progressBar = this.modalEl.querySelector("#reportProgressBar");
      this.submitBtn = this.modalEl.querySelector("#submitReportBtn");
    } else {
      this.urlInput = null;
      this.msgInput = null;
      this.mediaList = null;
      this.statusEl = null;
      this.progressWrap = null;
      this.progressBar = null;
      this.submitBtn = null;
    }

    this.registerEvents();
  }

  registerEvents() {
    if (this.submitBtn) this.submitBtn.onclick = () => this.submitReport();
  }

  /** OPEN MODAL + FILL UI */
  open() {
    if (!this.modalEl) return;

    this.urlInput.value = window.location.href;
    this.msgInput.value = "";
    this.mediaList.innerHTML = "";
    this.statusEl.textContent = "";
    // hide progress via CSS class
    this.progressWrap.classList.remove("visible");

    const previews = [...document.querySelectorAll(".preview-item")];

    previews.forEach((item, index) => {
      const wrapper = document.createElement("div");
      wrapper.className = "report-media-item";

      const thumb = item.querySelector("img")?.src;
      const isVideo = item.dataset.videoUrl;

      // thumb
      const img = document.createElement("img");
      img.className = "report-media-thumb";
      img.src = thumb || "";
      wrapper.appendChild(img);

      // buttons
      const btnRow = document.createElement("div");
      btnRow.className = "btn-group";

      const viewBtn = document.createElement("button");
      viewBtn.className = "btn btn-sm btn-outline-primary";
      viewBtn.innerText = "View";
      viewBtn.onclick = (e) => {
        e.preventDefault();
        this.carousel.open(this._collectPreviewItems(), index + 1);
      };

      const delBtn = document.createElement("button");
      delBtn.className = "btn btn-sm btn-outline-danger";
      delBtn.innerText = "Delete";
      delBtn.onclick = (e) => {
        e.preventDefault();
        item.remove();
        wrapper.remove();
      };

      btnRow.appendChild(viewBtn);
      btnRow.appendChild(delBtn);
      wrapper.appendChild(btnRow);

      this.mediaList.appendChild(wrapper);
    });

    new bootstrap.Modal(this.modalEl).show();
  }

  close() {
    if (!this.modalEl) return;
    bootstrap.Modal.getInstance(this.modalEl)?.hide();
  }

  /** Extract image/video info from preview items */
  _collectPreviewItems() {
    const previews = [...document.querySelectorAll(".preview-item")];

    return previews.map((p) => {
      if (p.dataset.videoUrl) {
        return {
          type: "video",
          url: p.dataset.videoUrl,
          thumb: p.querySelector("img")?.src,
          originalBlob: p.__originalBlob || null,
        };
      }
      return {
        type: "image",
        url: p.querySelector("img")?.src,
      };
    });
  }

  /** Convert preview items into uploadable blobs */
  async _prepareMedia() {
    const items = this._collectPreviewItems();
    const result = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.type === "video") {
        const videoBlob =
          item.originalBlob || (await fetch(item.url).then((r) => r.blob()));

        // Attach thumbnail (if exists)
        let thumbBlob = null;
        if (item.thumb) {
          thumbBlob = await fetch(item.thumb)
            .then((r) => r.blob())
            .catch(() => null);
        }

        result.push({
          blob: videoBlob,
          filename: `recording_${i + 1}.webm`,
          mime: "video/webm",
          thumbBlob,
          thumbFilename: `recording_${i + 1}_thumb.jpg`,
        });
      } else {
        // image
        const imgBlob = await fetch(item.url).then((r) => r.blob());

        result.push({
          blob: imgBlob,
          filename: `screenshot_${i + 1}.png`,
          mime: "image/png",
          thumbBlob: null,
          thumbFilename: null,
        });
      }
    }

    return result;
  }

  /** Do AJAX upload with progress */
  async submitReport() {
    if (!this.modalEl) return;

    this.statusEl.textContent = "Preparing attachments...";
    if (this.submitBtn) this.submitBtn.disabled = true;

    try {
      const media = await this._prepareMedia();

      this.statusEl.textContent = "Uploading...";

      const form = new FormData();
      form.append("page_url", this.urlInput.value);
      form.append("message", this.msgInput.value);

      media.forEach((item, i) => {
        form.append("attachments[]", item.blob, item.filename);
        if (item.thumbBlob) {
          form.append(`thumb[${i}]`, item.thumbBlob, item.thumbFilename);
        }
      });

      if (this.progressWrap) this.progressWrap.classList.add("visible");
      if (this.progressBar) {
        this.progressBar.style.setProperty("--progress", "0%");
        this.progressBar.textContent = "0%";
      }

      const result = await this._xhrUpload("report.php", form);

      if (result.ok) {
        this.statusEl.textContent = "Report submitted ✔";
        setTimeout(() => this.close(), 1000);
      } else {
        this.statusEl.textContent = "Upload error: " + result.error;
      }
    } catch (err) {
      this.statusEl.textContent = "Error: " + err.message;
    } finally {
      if (this.submitBtn) this.submitBtn.disabled = false;
    }
  }

  /** XMLHttpRequest wrapper with progress */
  _xhrUpload(url, formData) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);

      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        const pct = Math.round((e.loaded / e.total) * 100);
        if (this.progressBar) {
          this.progressBar.style.setProperty("--progress", pct + "%");
          this.progressBar.textContent = pct + "%";
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          resolve({ ok: false, error: "HTTP " + xhr.status });
        }
      };

      xhr.onerror = reject;
      xhr.send(formData);
    });
  }
}
