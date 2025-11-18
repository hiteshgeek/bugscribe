/**
 * Bugscribe
 * Small embeddable button library to create or attach a bug-report button.
 * Usage:
 *   new Bugscribe({ selector: '#myBtn', text: 'Report', onClick: fn })
 *   or
 *   const b = new Bugscribe(); // creates default button and mounts
 */
import BugscribeButtonModule from "./bugscribe_button";

(function (global) {
  // Prefer the module import (bundler will inline it). Fall back to global.
  var BugscribeButton = BugscribeButtonModule || global.BugscribeButton || null;

  class Bugscribe {
    /**
     * @param {Object} options
     * Expecting shape: { button: { ...buttonOpts }, onClick: fn }
     * For backward compatibility, flat button options are also accepted.
     */
    constructor(options = {}) {
      // Keep raw options for external use, but the button-specific
      // defaults live in the BugscribeButton implementation.
      this.rawOptions = options || {};

      // Support both new nested option: `options.button` and legacy flat shape
      let buttonOpts = {};
      if (
        this.rawOptions &&
        this.rawOptions.button &&
        typeof this.rawOptions.button === "object"
      ) {
        buttonOpts = Object.assign({}, this.rawOptions.button);
      } else {
        // treat top-level options as button options (legacy)
        buttonOpts = Object.assign({}, this.rawOptions);
      }

      this.buttonOptions = buttonOpts;
      this.button = null;
      this.el = null;
      this._handleClick = this._handleClick.bind(this);
      this._mounted = false;

      this.mount();
    }

    mount() {
      if (!BugscribeButton) {
        console.error(
          "BugscribeButton class is not available. Make sure bugscribe_button.js is loaded or built into the bundle."
        );
        return;
      }

      this.button = new BugscribeButton(
        this.buttonOptions,
        this._handleClick.bind(this)
      );
      this.el = this.button.el;
      this._mounted = !!(this.button && this.button._mounted);
    }

    _handleClick(e) {
      const userOnClick =
        (this.rawOptions && this.rawOptions.onClick) ||
        (this.buttonOptions && this.buttonOptions.onClick);
      if (typeof userOnClick === "function") {
        try {
          userOnClick(e, this);
        } catch (err) {
          console.error("Bugscribe onClick error", err);
        }
        return;
      }

      const modal =
        document.getElementById("reportModal") ||
        document.getElementById("reportBugModal");
      if (modal) {
        modal.classList.toggle("hidden");
      } else {
        const url = window.location.href;
        const msg = prompt("Report a bug — describe the issue");
        if (msg) {
          console.info("Bug report (demo):", { url, message: msg });
          alert("Thanks — demo report recorded in console.");
        }
      }
    }

    show() {
      if (this.button) this.button.show();
    }

    hide() {
      if (this.button) this.button.hide();
    }

    destroy() {
      if (this.button) this.button.destroy();
      this.button = null;
      this.el = null;
      this._mounted = false;
    }

    updateOptions(newOpts = {}) {
      // Merge into raw options
      Object.assign(this.rawOptions, newOpts);

      // If nested button opts provided, merge into buttonOptions, else treat newOpts as button opts (legacy)
      if (newOpts && newOpts.button && typeof newOpts.button === "object") {
        Object.assign(this.buttonOptions, newOpts.button);
      } else {
        Object.assign(this.buttonOptions, newOpts);
      }

      if (this.button) {
        this.button.update(this.buttonOptions);
        this.el = this.button.el;
        this._mounted = !!this.button._mounted;
      } else if (this._mounted) {
        this.destroy();
        this.mount();
      }
    }
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = Bugscribe;
  }
  global.Bugscribe = Bugscribe;
})(window);
