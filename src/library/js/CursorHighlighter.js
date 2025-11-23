// CursorHighlighter.js
export default class CursorHighlighter {
  constructor() {
    this.el = null;
    this.isClicking = false;
    this.isScrolling = false;
    this.scrollTimer = null;
  }

  // --- DOM Setup/Teardown ---

  _createElement() {
    this.el = document.createElement("div");
    this.el.id = "recording-cursor-highlighter";
    this.el.className = "cursor-highlighter";
    // Set z-index extremely high to ensure it's always visible
    this.el.style.zIndex = "1000000";
    document.body.appendChild(this.el);
  }

  start() {
    this._createElement();
    this._bindEvents();
    // REMOVED: document.body.style.cursor = 'none';
  }

  stop() {
    this._unbindEvents();
    if (this.scrollTimer) clearTimeout(this.scrollTimer);
    if (this.el) this.el.remove();
    this.el = null;
    // REMOVED: document.body.style.cursor = ''; // Restore system cursor
  }

  // --- Event Handling ---

  _bindEvents() {
    // Note: 'capture: true' ensures these events are handled early.
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

  // CRITICAL: Direct translate3d update for GPU acceleration and zero delay
  _onMouseMove = (e) => {
    if (this.el) {
      // Use translate3d to move the highlighter exactly where the cursor is
      this.el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    }
  };

  _onMouseDown = () => {
    this.isClicking = true;
    if (this.el) {
      this.el.classList.add("clicking");
      // Force a synchronous reflow/repaint for immediate style change
      this.el.offsetWidth;
    }
  };

  _onMouseUp = () => {
    this.isClicking = false;
    if (this.el) {
      this.el.classList.remove("clicking");
    }
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
