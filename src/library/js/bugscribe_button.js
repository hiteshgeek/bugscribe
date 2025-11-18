import { bug_svg, screenshot_svg, record_svg } from "./helpers.js";

class BugscribeButton {
  constructor(opts = {}, onClick = null) {
    const defaults = {
      selector: null,
      text: "Report",
      // default icon is null so the library falls back to the bundled SVG
      icon: null,
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

  toggle() {
    if (!this.el) return;
    if (this.el.classList.contains("expanded")) this.collapse();
    else this.expand();
  }

  expand() {
    if (!this.el) return;
    this.el.classList.add("expanded");
    if (this.mainBtn) this.mainBtn.setAttribute("aria-expanded", "true");
  }

  collapse() {
    if (!this.el) return;
    this.el.classList.remove("expanded");
    if (this.mainBtn) this.mainBtn.setAttribute("aria-expanded", "false");
  }

  create() {
    if (this.opts.selector) {
      this.el = document.querySelector(this.opts.selector);
      this._createdByMe = false;
    }

    if (!this.el && this.opts.createIfMissing) {
      // inner element that receives the library styles/vars
      const inner = document.createElement("div");
      inner.id = this.opts.id;
      inner.className = this.opts.className; // "bug-btn-wrapper"

      // main interactive button inside the inner element
      const main = document.createElement("button");
      main.type = "button";
      // Add a small utility class so consumers / library styles can target
      // the interactive button easily (and share baseline button styles).
      main.className = "bug-btn__main bug-btn";
      main.setAttribute("aria-expanded", "false");
      // build icon + label: icon is SVG (from helpers), label is visible text
      const iconWrap = document.createElement("span");
      iconWrap.className = "bug-btn__icon";
      iconWrap.innerHTML = bug_svg;

      const label = document.createElement("span");
      label.className = "bug-btn__label";
      label.textContent = this.opts.text || "";

      main.appendChild(iconWrap);
      main.appendChild(label);

      // Create actions container with two icon-only buttons (screenshot, record).
      // These buttons are purely presentational here; consumers may attach
      // event handlers later if desired.
      const actions = document.createElement("div");
      actions.className = "bug-btn-actions";

      const makeAction = (type, labelText) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = `bug-btn__action bug-btn bug-btn__action--${type}`;

        const iconWrap = document.createElement("span");
        iconWrap.className = "bug-btn__icon";
        iconWrap.innerHTML =
          type === "screenshot" ? screenshot_svg : record_svg;

        const s = document.createElement("span");
        s.className = "sr-only";
        s.textContent = labelText;

        b.appendChild(iconWrap);
        b.appendChild(s);
        return b;
      };

      const screenshotBtn = makeAction("screenshot", "Screenshot");
      const recordBtn = makeAction("record", "Record");

      actions.appendChild(screenshotBtn);
      actions.appendChild(recordBtn);

      inner.appendChild(main);
      inner.appendChild(actions);

      const container = this.opts.container || document.body;
      container.appendChild(inner);

      this._createdByMe = true;
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

    // set initial icon + label on the main button (icon is SVG)
    if (this.mainBtn) {
      const iconWrap = this.mainBtn.querySelector(".bug-btn__icon");
      const labelEl = this.mainBtn.querySelector(".bug-btn__label");
      if (iconWrap) {
        if (
          typeof this.opts.icon === "string" &&
          this.opts.icon.trim().startsWith("<svg")
        ) {
          iconWrap.innerHTML = this.opts.icon;
        } else {
          iconWrap.innerHTML = bug_svg;
        }
      }
      if (labelEl) labelEl.textContent = this.opts.text || "";
    }

    // attach click handler if provided (bound by caller to preserve 'this')
    if (typeof this.onClick === "function") {
      this._boundClick = this.onClick;
      if (this.mainBtn)
        this.mainBtn.addEventListener("click", this._boundClick);
    }

    // Add internal toggle behavior: clicking the main button reveals the
    // icon-only actions. Keep this separate from user-provided onClick.
    this._boundToggle = (e) => {
      // prevent double-toggle if user handler calls stopPropagation
      this.toggle();
    };
    if (this.mainBtn) this.mainBtn.addEventListener("click", this._boundToggle);

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

    // Note: colors and z-index are controlled entirely via SCSS variables
    // and theme classes. We no longer write these as inline CSS variables
    // on the wrapper to keep styling centralized in CSS.

    // Icon/text: update SVG icon and label if options changed
    if (o.icon !== undefined || o.text !== undefined) {
      if (this.mainBtn) {
        const iconWrap = this.mainBtn.querySelector(".bug-btn__icon");
        const labelEl = this.mainBtn.querySelector(".bug-btn__label");
        if (iconWrap) {
          if (typeof o.icon === "string" && o.icon.trim().startsWith("<svg")) {
            iconWrap.innerHTML = o.icon;
          } else if (typeof o.icon === "string" && o.icon.trim().length > 0) {
            // fallback: wrap text icon in a small span
            iconWrap.textContent = o.icon;
          } else {
            iconWrap.innerHTML = bug_svg;
          }
        }
        if (labelEl) labelEl.textContent = o.text || "";
      }
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
    if (this._boundToggle && this.mainBtn) {
      this.mainBtn.removeEventListener("click", this._boundToggle);
    }
    if (this._createdByMe) {
      if (this.el && this.el.parentNode)
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
