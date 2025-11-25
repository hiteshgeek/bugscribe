export default class CursorHighlighter {
  constructor(config = {}) {
    this.el = null;
    this.isScrolling = false;
    this.scrollTimer = null;
    this.rippleTimer = null;
    this.lastClickTime = 0;
    this.clickCount = 0;
    this.doubleClickTimer = null;

    // Configuration for click colors
    this.config = {
      clickColor: config.clickColor || "var(--bug-primary)",
      rightClickColor: config.rightClickColor || "orange",
      doubleClickColor: config.doubleClickColor || "green",
      ...config,
    };
  }

  static HOTSPOT_OFFSET_X = 2;
  static HOTSPOT_OFFSET_Y = 2;

  _createElement() {
    this.el = document.createElement("div");
    this.el.id = "recording-cursor-highlighter";
    this.el.className = "cursor-highlighter";
    this.el.style.zIndex = "1000000";

    // Apply custom colors via CSS variables
    this.el.style.setProperty("--click-color", this.config.clickColor);
    this.el.style.setProperty(
      "--right-click-color",
      this.config.rightClickColor
    );
    this.el.style.setProperty(
      "--double-click-color",
      this.config.doubleClickColor
    );

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
    if (this.doubleClickTimer) clearTimeout(this.doubleClickTimer);
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
    document.addEventListener("dblclick", this._onDoubleClick, {
      capture: true,
    });
    document.addEventListener("contextmenu", this._onContextMenu, {
      capture: true,
    });
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
    document.removeEventListener("dblclick", this._onDoubleClick, {
      capture: true,
    });
    document.removeEventListener("contextmenu", this._onContextMenu, {
      capture: true,
    });
    window.removeEventListener("scroll", this._onScroll, { capture: true });
  }

  _onMouseMove = (e) => {
    if (this.el) {
      const offsetX = e.clientX + CursorHighlighter.HOTSPOT_OFFSET_X;
      const offsetY = e.clientY + CursorHighlighter.HOTSPOT_OFFSET_Y;
      this.el.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;

      // Hide cursor highlighter when hovering over timer or bug elements
      const target = e.target;
      const isOverTimer = target.closest(".recording-timer-wrapper");
      const isOverBugElement = target.closest(".bug-element");

      if (isOverTimer || isOverBugElement) {
        this.el.style.opacity = "0";
      } else {
        this.el.style.opacity = "1";
      }
    }
  };

  /**
   * UPDATED: Triggers the 'clicking' visual effect (transparent background + ripple).
   * Detects right-click based on button property.
   */
  _onMouseDown = (e) => {
    if (this.el) {
      // Clear any previous timer
      if (this.rippleTimer) clearTimeout(this.rippleTimer);

      // Remove all clicking classes first to reset the animation
      this.el.classList.remove("clicking", "right-clicking", "double-clicking");

      // Force a reflow to restart the animation
      void this.el.offsetWidth;

      // Check if it's a right-click (button === 2)
      if (e.button === 2) {
        this.el.classList.add("right-clicking");
        this.rippleTimer = setTimeout(() => {
          if (this.el) this.el.classList.remove("right-clicking");
        }, 500);
      } else {
        // Regular left-click
        this.el.classList.add("clicking");
        this.rippleTimer = setTimeout(() => {
          if (this.el) this.el.classList.remove("clicking");
        }, 500);
      }
    }
  };

  _onMouseUp = () => {
    // No action needed here, the `setTimeout` in `_onMouseDown` handles restoring the state.
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

  /**
   * Handles double-click event with blue color.
   */
  _onDoubleClick = () => {
    if (this.el) {
      // Clear any previous timer
      if (this.rippleTimer) clearTimeout(this.rippleTimer);

      // Remove all clicking classes first
      this.el.classList.remove("clicking", "right-clicking", "double-clicking");

      // Force a reflow
      void this.el.offsetWidth;

      // Add double-clicking class
      this.el.classList.add("double-clicking");

      // Remove the class after animation
      this.rippleTimer = setTimeout(() => {
        if (this.el) this.el.classList.remove("double-clicking");
      }, 500);
    }
  };

  /**
   * Handles context menu (right-click) event.
   * The actual visual effect is handled in _onMouseDown.
   */
  _onContextMenu = () => {
    // This event fires after mousedown for right-clicks
    // We don't need to do anything here as the visual effect is already triggered
  };
}
