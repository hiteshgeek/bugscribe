// BackdropManager.js - Centralized backdrop management to ensure only one backdrop exists at a time

export default class BackdropManager {
  static currentBackdrop = null;

  /**
   * Gets or creates a backdrop element
   * Ensures only one backdrop exists at any time
   * @returns {HTMLElement} The backdrop element
   */
  static getBackdrop() {
    // If we already have a backdrop reference, check if it's still in the DOM
    if (this.currentBackdrop && document.body.contains(this.currentBackdrop)) {
      console.log('[BackdropManager] Reusing existing backdrop');
      return this.currentBackdrop;
    }

    // Remove any orphaned backdrops from the DOM
    this.removeAllBackdrops();

    // Create new backdrop
    console.log('[BackdropManager] Creating new backdrop');
    const backdrop = document.createElement("div");
    backdrop.className = "mc-backdrop";
    backdrop.setAttribute('data-backdrop-managed', 'true');
    document.body.appendChild(backdrop);

    this.currentBackdrop = backdrop;
    return backdrop;
  }

  /**
   * Removes all backdrops from the DOM
   */
  static removeAllBackdrops() {
    const allBackdrops = document.querySelectorAll('.mc-backdrop');
    if (allBackdrops.length > 0) {
      console.log(`[BackdropManager] Removing ${allBackdrops.length} existing backdrop(s)`);
      allBackdrops.forEach(backdrop => backdrop.remove());
    }
    this.currentBackdrop = null;
  }

  /**
   * Removes the current backdrop if it exists
   */
  static removeBackdrop() {
    if (this.currentBackdrop) {
      console.log('[BackdropManager] Removing current backdrop');
      this.currentBackdrop.remove();
      this.currentBackdrop = null;
    } else {
      // Fallback: remove any backdrops that might exist
      this.removeAllBackdrops();
    }
  }

  /**
   * Checks if a backdrop currently exists
   * @returns {boolean}
   */
  static hasBackdrop() {
    return this.currentBackdrop !== null && document.body.contains(this.currentBackdrop);
  }

  /**
   * Resets backdrop styles to default
   */
  static resetBackdropStyles() {
    if (this.currentBackdrop) {
      console.log('[BackdropManager] Resetting backdrop styles');
      this.currentBackdrop.style.clipPath = '';
      this.currentBackdrop.style.opacity = '';
      this.currentBackdrop.style.background = '';
      this.currentBackdrop.style.zIndex = '';
    }
  }
}
