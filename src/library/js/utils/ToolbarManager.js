// ToolbarManager.js - Centralized toolbar management for all operations

export default class ToolbarManager {
  static currentToolbar = null;
  static toolbarContainer = null;
  static toolbarContent = null;

  /**
   * Initialize or get the toolbar container
   * Ensures only one toolbar exists at the bottom of the screen
   */
  static getToolbar() {
    if (!this.toolbarContainer || !document.body.contains(this.toolbarContainer)) {
      console.log('[ToolbarManager] Creating toolbar container');
      this.createToolbarContainer();
    }
    return this.toolbarContainer;
  }

  /**
   * Create the main toolbar container
   * @private
   */
  static createToolbarContainer() {
    // Remove any existing toolbar
    this.removeToolbar();

    // Create container
    this.toolbarContainer = document.createElement('div');
    this.toolbarContainer.className = 'unified-toolbar-container';
    this.toolbarContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000000;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      pointer-events: auto;
    `;

    document.body.appendChild(this.toolbarContainer);
  }

  /**
   * Update toolbar content
   * @param {HTMLElement} content - New content to display in toolbar
   * @param {string} type - Type of toolbar (screenshot, image-editor, etc.)
   */
  static updateContent(content, type = 'default') {
    console.log('[ToolbarManager] Updating toolbar content, type:', type);

    const toolbar = this.getToolbar();

    // Clear existing content
    toolbar.innerHTML = '';

    // Add new content
    if (content) {
      toolbar.appendChild(content);
    }

    this.currentToolbar = type;
  }

  /**
   * Show the toolbar
   */
  static show() {
    const toolbar = this.getToolbar();
    toolbar.style.opacity = '1';
    toolbar.style.visibility = 'visible';
    toolbar.style.pointerEvents = 'auto';
    console.log('[ToolbarManager] Toolbar shown');
  }

  /**
   * Hide the toolbar
   */
  static hide() {
    if (this.toolbarContainer) {
      this.toolbarContainer.style.opacity = '0';
      this.toolbarContainer.style.visibility = 'hidden';
      this.toolbarContainer.style.pointerEvents = 'none';
      console.log('[ToolbarManager] Toolbar hidden');
    }
  }

  /**
   * Remove the toolbar completely
   */
  static removeToolbar() {
    if (this.toolbarContainer) {
      console.log('[ToolbarManager] Removing toolbar');
      this.toolbarContainer.remove();
      this.toolbarContainer = null;
      this.currentToolbar = null;
    }
  }

  /**
   * Check if toolbar is currently visible
   */
  static isVisible() {
    return this.toolbarContainer &&
           this.toolbarContainer.style.visibility !== 'hidden' &&
           this.toolbarContainer.style.opacity !== '0';
  }

  /**
   * Get current toolbar type
   */
  static getCurrentType() {
    return this.currentToolbar;
  }
}
