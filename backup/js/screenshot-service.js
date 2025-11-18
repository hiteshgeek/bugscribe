export class ScreenshotService {
  loadHtml2Canvas(cb) {
    if (window.html2canvas) return cb();
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
    script.onload = cb;
    document.head.appendChild(script);
  }

  takeFullScreenshot() {
    return new Promise((resolve) => {
      this.loadHtml2Canvas(() => {
        html2canvas(document.body).then((canvas) =>
          resolve(canvas.toDataURL("image/png"))
        );
      });
    });
  }

  takeVisibleScreenshot() {
    return new Promise((resolve) => {
      this.loadHtml2Canvas(() => {
        html2canvas(document.body, {
          scrollY: -window.scrollY,
          width: window.innerWidth,
          height: window.innerHeight,
        }).then((canvas) => resolve(canvas.toDataURL("image/png")));
      });
    });
  }

  takeAreaScreenshot(rect) {
    return new Promise((resolve) => {
      this.loadHtml2Canvas(() => {
        html2canvas(document.body).then((canvas) => {
          const crop = document.createElement("canvas");
          crop.width = rect.w;
          crop.height = rect.h;
          crop
            .getContext("2d")
            .drawImage(
              canvas,
              rect.x,
              rect.y,
              rect.w,
              rect.h,
              0,
              0,
              rect.w,
              rect.h
            );
          resolve(crop.toDataURL("image/png"));
        });
      });
    });
  }
}
