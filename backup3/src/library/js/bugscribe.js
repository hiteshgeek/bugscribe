// Bugscribe.js - Main library entry
// UMD-style: expose Bugscribe to global and CommonJS, but do NOT use import/export in the IIFE build
(function (global) {
  // Prefer the global BugscribeButton (bundler will inline it if needed)
  var BugscribeButton = global.BugscribeButton || null;

  class Bugscribe {
    constructor(options = {}) {
      this.options = options;
      this.button = BugscribeButton
        ? new BugscribeButton(options.buttons || {})
        : null;
    }
  }

  // Expose Bugscribe globally and for CommonJS
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Bugscribe;
  }
  global.Bugscribe = Bugscribe;
})(typeof window !== "undefined" ? window : this);
