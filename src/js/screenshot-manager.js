import { ScreenshotService } from "./screenshot-service.js";
import { RecordingService } from "./recording-service.js";
import { PreviewManager } from "./preview-manager.js";
import { CarouselViewer } from "./carousel-viewer.js";
import { ReportManager } from "./report-manager.js";

class ScreenshotManager {
  constructor() {
    this.ss = new ScreenshotService();
    this.rec = new RecordingService();
    this.preview = new PreviewManager(
      document.getElementById("screenshotPreviewContainer")
    );
    this.carousel = new CarouselViewer(
      document.getElementById("screenshotModal")
    );

    this.reportManager = new ReportManager({
      previewManager: this.preview,
      carousel: this.carousel,
    });

    this.registerEvents();
  }

  registerEvents() {
    document.querySelector(".report-btn").onclick = () => {
      this.reportManager.open();
    };

    document.getElementById("takeScreenshotBtn").onclick = async () => {
      const data = await this.ss.takeFullScreenshot();
      this.preview.addImage(data, (idx) => this.openCarousel(idx));
    };

    document.getElementById("screenshotVisibleBtn").onclick = async () => {
      const data = await this.ss.takeVisibleScreenshot();
      this.preview.addImage(data, (idx) => this.openCarousel(idx));
    };

    document.getElementById("recordBtn").onclick = () => {
      if (!this.rec.mediaRecorder) this.startRecording();
      else this.stopRecording();
    };
  }

  openCarousel(index) {
    const items = [...document.querySelectorAll(".preview-item")].map((p) => {
      return p.dataset.videoUrl
        ? { type: "video", url: p.dataset.videoUrl }
        : { type: "image", url: p.querySelector("img").src };
    });

    this.carousel.open(items, index);
  }

  async startRecording() {
    await this.rec.start(async (blob) => {
      const url = URL.createObjectURL(blob);
      const thumb = await this.rec.extractThumbnail(blob);
      this.preview.addVideo(url, thumb, (idx) => this.openCarousel(idx));
    });
  }

  stopRecording() {
    this.rec.stop();
  }
}

window.addEventListener("DOMContentLoaded", () => new ScreenshotManager());
