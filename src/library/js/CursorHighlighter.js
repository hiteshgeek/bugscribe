export default class CursorHighlighter {
  constructor() {
    this.el = null;
    this.isScrolling = false;
    this.scrollTimer = null;
    this.rippleTimer = null;
  }

  static HOTSPOT_OFFSET_X = 2;
  static HOTSPOT_OFFSET_Y = 2;

  _createElement() {
    this.el = document.createElement("div");
    this.el.id = "recording-cursor-highlighter";
    this.el.className = "cursor-highlighter";
    this.el.style.zIndex = "1000000";
    document.body.appendChild(this.el);

    // Set initial position to current mouse position if available
    let x = 0,
      y = 0;
    if (window.event && typeof window.event.clientX === "number") {
      x = window.event.clientX + CursorHighlighter.HOTSPOT_OFFSET_X;
      y = window.event.clientY + CursorHighlighter.HOTSPOT_OFFSET_Y;
    } else {
      x = window.innerWidth / 2;
      y = window.innerHeight / 2;
    }
    this.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  start() {
    this._createElement();
    this._bindEvents();
  }

  stop() {
    this._unbindEvents();
    if (this.scrollTimer) clearTimeout(this.scrollTimer);
    if (this.rippleTimer) clearTimeout(this.rippleTimer);
    if (this.el) this.el.remove();
    this.el = null;
  }

  _bindEvents() {
    document.addEventListener("mousemove", this._onMouseMove, {
      capture: true,
    });
    document.addEventListener("mousedown", this._onMouseDown, {
      capture: true,
    });
    document.addEventListener("mouseup", this._onMouseUp, { capture: true });
    window.addEventListener("scroll", this._onScroll, { capture: true });
  }

  _unbindEvents() {
    document.removeEventListener("mousemove", this._onMouseMove, {
      capture: true,
    });
    document.removeEventListener("mousedown", this._onMouseDown, {
      capture: true,
    });
    document.removeEventListener("mouseup", this._onMouseUp, { capture: true });
    window.removeEventListener("scroll", this._onScroll, { capture: true });
  }

  _onMouseMove = (e) => {
    if (this.el) {
      const offsetX = e.clientX + CursorHighlighter.HOTSPOT_OFFSET_X;
      const offsetY = e.clientY + CursorHighlighter.HOTSPOT_OFFSET_Y;
      this.el.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
    }
  };

  _onMouseDown = () => {
    if (this.el) {
      // Remove any existing ripple animation
      this.el.classList.remove("ripple");
      // Force reflow to restart animation
      void this.el.offsetWidth;
      // Add ripple class for animation
      this.el.classList.add("ripple");
      // Clear previous timer if any
      if (this.rippleTimer) clearTimeout(this.rippleTimer);
      // Remove ripple class after animation duration
      this.rippleTimer = setTimeout(() => {
        if (this.el) this.el.classList.remove("ripple");
      }, 400); // Match SCSS transition duration
    }
  };

  _onMouseUp = () => {
    // No color change, ripple will be removed by timer
  };

  _onScroll = () => {
    this.isScrolling = true;
    if (this.el) {
      this.el.classList.add("scrolling");
    }
    if (this.scrollTimer) clearTimeout(this.scrollTimer);
    this.scrollTimer = setTimeout(() => {
      this.isScrolling = false;
      if (this.el) {
        this.el.classList.remove("scrolling");
      }
    }, 150);
  };
}
