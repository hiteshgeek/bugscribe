class BugscribeButton {
  constructor(opts = {}, onClick = null) {
    const defaults = {
      selector: null,
      text: "Report",
      icon: "🐞",
      id: "bugReportBtn",
      className: "bug-btn-wrapper",
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
      // create an outer wrapper so we can attach other components later
      const wrapper = document.createElement("div");
      wrapper.className = "bug-btn-container";

      // inner element that receives the library styles/vars
      const inner = document.createElement("div");
      inner.id = this.opts.id;
      inner.className = this.opts.className; // "bug-btn"

      // main interactive button inside the inner element
      const main = document.createElement("button");
      main.type = "button";
      main.className = "bug-btn__main";
      main.setAttribute("aria-expanded", "false");
      const mainIcon = this.opts.icon ? String(this.opts.icon) + " " : "";
      main.textContent = mainIcon + (this.opts.text || "");

      inner.appendChild(main);
      wrapper.appendChild(inner);

      const container = this.opts.container || document.body;
      container.appendChild(wrapper);

      this._createdByMe = true;
      this.wrapper = wrapper;
      this.el = inner; // keep this.el pointing at the element that has .bug-btn
      this.mainBtn = main;
    }

    if (!this.el) return;

    // ensure the base class is present on the element that holds styles
    if (!this.el.classList.contains("bug-btn-wrapper")) {
      this.el.classList.add(this.opts.className || "bug-btn-wrapper");
    }

    // If we don't already have a mainBtn (created above), try to find one inside
    if (!this.mainBtn) {
      this.mainBtn = this.el.querySelector(".bug-btn__main");
    }

    // set initial label (icon + text) on the main button
    if (this.mainBtn) {
      const icon = this.opts.icon ? String(this.opts.icon) + " " : "";
      this.mainBtn.textContent = icon + (this.opts.text || "");
    }

    // attach click handler if provided (bound by caller to preserve 'this')
    if (typeof this.onClick === "function") {
      this._boundClick = this.onClick;
      if (this.mainBtn)
        this.mainBtn.addEventListener("click", this._boundClick);
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

    // Position variables: compute provided values, and when one side of an
    // axis is provided ensure the opposite side is explicitly 'auto'. This
    // prevents both sides being set (which can force stretching). If neither
    // side is provided we remove inline variables so SCSS :root defaults apply.
    const getSide = (side) => {
      if (o[side] !== undefined && o[side] !== null) return o[side];
      if (
        o.position &&
        o.position[side] !== undefined &&
        o.position[side] !== null
      )
        return o.position[side];
      return undefined;
    };

    let top = getSide("top");
    let right = getSide("right");
    let bottom = getSide("bottom");
    let left = getSide("left");

    // If caller provided one side, ensure the opposite is 'auto'
    if (
      left !== undefined &&
      left !== null &&
      (right === undefined || right === null)
    ) {
      right = "auto";
    } else if (
      right !== undefined &&
      right !== null &&
      (left === undefined || left === null)
    ) {
      left = "auto";
    }
    if (
      top !== undefined &&
      top !== null &&
      (bottom === undefined || bottom === null)
    ) {
      bottom = "auto";
    } else if (
      bottom !== undefined &&
      bottom !== null &&
      (top === undefined || top === null)
    ) {
      top = "auto";
    }

    const sides = { top, right, bottom, left };
    for (const side of ["top", "right", "bottom", "left"]) {
      const val = sides[side];
      if (val !== undefined && val !== null) {
        this.el.style.setProperty(`--bs-pos-${side}`, String(val));
      } else {
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
      if (this.mainBtn) this.mainBtn.textContent = icon + (o.text || "");
      else this.el.textContent = icon + (o.text || "");
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
    if (this._boundClick) {
      if (this.mainBtn)
        this.mainBtn.removeEventListener("click", this._boundClick);
      else this.el.removeEventListener("click", this._boundClick);
    }
    if (this._createdByMe) {
      if (this.wrapper && this.wrapper.parentNode)
        this.wrapper.parentNode.removeChild(this.wrapper);
      else if (this.el && this.el.parentNode)
        this.el.parentNode.removeChild(this.el);
    }
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
