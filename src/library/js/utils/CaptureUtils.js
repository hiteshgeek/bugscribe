export default class CaptureUtils {
  injectColorSanitizerStyle() {
    const style = document.createElement("style");
    style.id = "html2canvas-color-sanitize";
    style.textContent = `
      * { color: rgb(0,0,0) !important; background-color: transparent !important; }
      svg, svg * { fill: rgb(0,0,0) !important; stroke: rgb(0,0,0) !important; }
    `;
    document.head.appendChild(style);
  }

  removeSanitizerStyle() {
    const el = document.getElementById("html2canvas-color-sanitize");
    if (el) el.remove();
  }

  getCSSVariable(varName, fallback) {
    const rootStyle = getComputedStyle(document.body);
    let value = rootStyle.getPropertyValue(varName).trim();
    return value || fallback;
  }

  adjustRectForAspectRatio(startX, startY, endX, endY, maintainSquare) {
    let rect = {
      left: Math.min(startX, endX),
      top: Math.min(startY, endY),
      width: Math.abs(endX - startX),
      height: Math.abs(endY - startY),
    };

    if (maintainSquare) {
      const size = Math.max(rect.width, rect.height);

      if (endX < startX) {
        rect.left = startX - size;
      }
      if (endY < startY) {
        rect.top = startY - size;
      }

      rect.width = size;
      rect.height = size;
    }

    return rect;
  }
}
