class BugscribeButton {
  constructor(opts = {}, onClick = null) {
    const defaults = {
      selector: null,
      text: "Report",
      icon: "🐞",
      id: "bugReportBtn",
      className: "bug-btn",
      container: typeof document !== "undefined" ? document.body : null,
      createIfMissing: true,
      isFixed: true,
      position: { bottom: "24px", right: "24px" },
      bgColor: "#ff4757",
      textColor: "#ffffff",
      zIndex: 9999,
    };

    this.opts = Object.assign({}, defaults, opts);
    this.onClick = onClick;
    this.el = null;
    this._mounted = false;
    this._createdByMe = false;
    this._boundClick = null;
    this.create();
  }

  create() {
    if (this.opts.selector) {
      this.el = document.querySelector(this.opts.selector);
      this._createdByMe = false;
    }

    if (!this.el && this.opts.createIfMissing) {
      this.el = document.createElement("button");
      this.el.type = "button";
      this.el.id = this.opts.id;
      this.el.className = this.opts.className;
      this._createdByMe = true;
      const container = this.opts.container || document.body;
      container.appendChild(this.el);
    }

    if (!this.el) return;

    // ensure the base class is present
    if (!this.el.classList.contains("bug-btn")) {
      this.el.classList.add(this.opts.className || "bug-btn");
    }

    // set initial label (icon + text)
    const icon = this.opts.icon ? String(this.opts.icon) + " " : "";
    this.el.textContent = icon + (this.opts.text || "");

    // attach click handler if provided (bound by caller to preserve 'this')
    if (typeof this.onClick === "function") {
      this._boundClick = this.onClick;
      this.el.addEventListener("click", this._boundClick);
    }

    // Apply CSS variables and attributes instead of inline layout styles
    this.applyStyles();
    this._mounted = true;
  }

  applyStyles() {
    if (!this.el) return;
    const o = this.opts || {};

    // Fixed vs static: expose as data attribute (SCSS will handle)
    if (o.isFixed === false) {
      this.el.setAttribute("data-fixed", "false");
    } else {
      this.el.setAttribute("data-fixed", "true");
    }

    // Position variables: prefer explicit sides, fall back to o.position
    const sides = ["top", "right", "bottom", "left"];
    for (const side of sides) {
      const val =
        o[side] !== undefined && o[side] !== null
          ? o[side]
          : o.position && o.position[side] !== undefined
          ? o.position[side]
          : null;
      if (val !== null && val !== undefined) {
        this.el.style.setProperty(`--bs-pos-${side}`, String(val));
      } else {
        // remove any previously set inline variable so SCSS defaults apply
        this.el.style.removeProperty(`--bs-pos-${side}`);
      }
    }

    // z-index
    if (o.zIndex !== undefined && o.zIndex !== null) {
      this.el.style.setProperty("--bs-btn-z", String(o.zIndex));
    } else {
      this.el.style.removeProperty("--bs-btn-z");
    }

    // Colors
    if (o.bgColor) this.el.style.setProperty("--bs-btn-bg", o.bgColor);
    else this.el.style.removeProperty("--bs-btn-bg");
    if (o.textColor) this.el.style.setProperty("--bs-btn-color", o.textColor);
    else this.el.style.removeProperty("--bs-btn-color");

    // Icon/text
    if (o.icon !== undefined || o.text !== undefined) {
      const icon = o.icon ? String(o.icon) + " " : "";
      this.el.textContent = icon + (o.text || "");
    }
  }

  show() {
    if (this.el) this.el.classList.remove("hidden");
  }

  hide() {
    if (this.el) this.el.classList.add("hidden");
  }

  update(newOpts = {}) {
    Object.assign(this.opts, newOpts);
    if (!this.el) return this.create();
    // reapply attributes and styles
    if (newOpts.id) this.el.id = this.opts.id;
    if (newOpts.className) this.el.className = this.opts.className;
    this.applyStyles();
  }

  destroy() {
    if (!this.el) return;
    if (this._boundClick)
      this.el.removeEventListener("click", this._boundClick);
    if (this._createdByMe && this.el.parentNode)
      this.el.parentNode.removeChild(this.el);
    this.el = null;
    this._mounted = false;
    this._createdByMe = false;
    this._boundClick = null;
  }
}

// CommonJS export for compatibility
if (typeof module !== "undefined" && module.exports) {
  module.exports = BugscribeButton;
}

// Attach to global/window for non-module usage
if (typeof window !== "undefined") {
  window.BugscribeButton = BugscribeButton;
}

// ES default export for bundlers (Rollup)
export default BugscribeButton;
// Icon/text
