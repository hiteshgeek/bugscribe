// ScreenshotToolbar.js - Modern toolbar for screenshot capture

import { icons } from "../icons.js";
import Tooltip from "../Tooltip.js";

export default class ScreenshotToolbar {
  static instance = null; // Track the single toolbar instance

  static getInstance(onShapeChange, onAccept, onCancel, onClose = null) {
    console.log('[ScreenshotToolbar] getInstance called, current instance:', !!ScreenshotToolbar.instance);
    if (ScreenshotToolbar.instance) {
      console.log('[ScreenshotToolbar] Reusing existing instance, updating callbacks');
      // Update callbacks on existing instance
      ScreenshotToolbar.instance.onShapeChange = onShapeChange;
      ScreenshotToolbar.instance.onAccept = onAccept;
      ScreenshotToolbar.instance.onCancel = onCancel;
      ScreenshotToolbar.instance.onClose = onClose || onCancel;
      return ScreenshotToolbar.instance;
    }
    console.log('[ScreenshotToolbar] Creating new instance');
    ScreenshotToolbar.instance = new ScreenshotToolbar(onShapeChange, onAccept, onCancel, onClose);
    return ScreenshotToolbar.instance;
  }

  static destroyInstance() {
    console.log('[ScreenshotToolbar] destroyInstance called');
    if (ScreenshotToolbar.instance) {
      ScreenshotToolbar.instance.remove();
      ScreenshotToolbar.instance = null;
    }
  }

  constructor(onShapeChange, onAccept, onCancel, onClose = null) {
    this.onShapeChange = onShapeChange;
    this.onAccept = onAccept;
    this.onCancel = onCancel;
    this.onClose = onClose || onCancel; // Default to onCancel if not provided
    this.currentShape = "rectangle";
    this.mode = "selecting"; // 'selecting' or 'preview'
    this.toolbar = null;
  }

  create() {
    // Create toolbar container
    this.toolbar = document.createElement("div");
    this.toolbar.className = "screenshot-toolbar-container";

    // Create toolbar wrapper
    this.toolbarWrapper = document.createElement("div");
    this.toolbarWrapper.className = "screenshot-toolbar-wrapper";

    // Create shape info display
    this.shapeInfo = document.createElement("div");
    this.shapeInfo.className = "screenshot-shape-info";
    this.shapeInfo.innerHTML = `
      <span class="screenshot-shape-icon">${icons.square}</span>
      <span class="screenshot-shape-text">Rectangle</span>
    `;

    // Create shape dropdown wrapper with relative positioning
    const shapeDropdownWrapper = document.createElement("div");
    shapeDropdownWrapper.className = "screenshot-shape-dropdown-wrapper";

    // Create shape dropdown button
    const shapeDropdownBtn = document.createElement("button");
    shapeDropdownBtn.className = "screenshot-control-btn";
    shapeDropdownBtn.innerHTML = icons.vertical_menu;
    shapeDropdownBtn.setAttribute("data-tooltip-text", "Change shape");

    // Create shape dropdown menu
    this.shapeMenu = document.createElement("div");
    this.shapeMenu.className = "screenshot-shape-menu";
    this.shapeMenu.innerHTML = `
      <div class="screenshot-shape-option" data-shape="rectangle">
        <span class="shape-icon">${icons.square}</span>
        <span class="shape-name">Rectangle</span>
      </div>
      <div class="screenshot-shape-option" data-shape="ellipse">
        <span class="shape-icon">${icons.circle}</span>
        <span class="shape-name">Oval</span>
      </div>
      <div class="screenshot-shape-option" data-shape="freeform">
        <span class="shape-icon">${icons.lasso}</span>
        <span class="shape-name">Freeform</span>
      </div>
    `;

    shapeDropdownWrapper.appendChild(shapeDropdownBtn);
    shapeDropdownWrapper.appendChild(this.shapeMenu);

    // Create action buttons (initially hidden)
    this.acceptBtn = document.createElement("button");
    this.acceptBtn.className = "screenshot-action-btn screenshot-accept-btn";
    this.acceptBtn.innerHTML = `${icons.accept} Accept`;
    this.acceptBtn.style.display = "none";
    this.acceptBtn.setAttribute("data-tooltip-text", "Capture screenshot");
    this.acceptBtn.setAttribute("data-tooltip-shortcut", "Enter");

    this.cancelBtn = document.createElement("button");
    this.cancelBtn.className = "screenshot-action-btn screenshot-cancel-btn";
    this.cancelBtn.innerHTML = `${icons.cancel} Cancel`;
    this.cancelBtn.style.display = "none";
    this.cancelBtn.setAttribute("data-tooltip-text", "Cancel and restart");
    this.cancelBtn.setAttribute("data-tooltip-shortcut", "Esc");

    // Create close button (always visible)
    this.closeBtn = document.createElement("button");
    this.closeBtn.className = "screenshot-control-btn screenshot-close-btn";
    this.closeBtn.innerHTML = icons.cancel;
    this.closeBtn.setAttribute("data-tooltip-text", "Close");
    this.closeBtn.setAttribute("data-tooltip-shortcut", "Esc");

    // Create hint text
    this.hintText = document.createElement("div");
    this.hintText.className = "screenshot-hint-text";
    this.hintText.textContent = "Hold Ctrl for square/circle • Esc to cancel";
    this.hintText.style.display = "none"; // Hidden initially

    // Append elements
    this.toolbarWrapper.appendChild(this.shapeInfo);
    this.toolbarWrapper.appendChild(shapeDropdownWrapper);
    this.toolbarWrapper.appendChild(this.acceptBtn);
    this.toolbarWrapper.appendChild(this.cancelBtn);
    this.toolbarWrapper.appendChild(this.closeBtn);
    this.toolbarWrapper.appendChild(this.hintText);

    this.toolbar.appendChild(this.toolbarWrapper);
    document.body.appendChild(this.toolbar);

    // Setup event listeners
    this._setupEventListeners(shapeDropdownBtn);

    // Initialize tooltips
    Tooltip.init(shapeDropdownBtn);
    Tooltip.init(this.acceptBtn);
    Tooltip.init(this.cancelBtn);
    Tooltip.init(this.closeBtn);

    return this.toolbar;
  }

  _setupEventListeners(shapeDropdownBtn) {
    // Toggle dropdown on button click
    shapeDropdownBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.shapeMenu.classList.toggle("show");
    });

    // Toggle dropdown when clicking shape name
    this.shapeInfo.addEventListener("click", (e) => {
      e.stopPropagation();
      this.shapeMenu.classList.toggle("show");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!this.shapeMenu.contains(e.target) && e.target !== shapeDropdownBtn) {
        this.shapeMenu.classList.remove("show");
      }
    });

    // Shape selection
    this.shapeMenu.querySelectorAll(".screenshot-shape-option").forEach((option) => {
      option.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent click from bubbling to canvas
        e.preventDefault();
        const shape = option.getAttribute("data-shape");
        this.setShape(shape);
        this.shapeMenu.classList.remove("show");
        if (this.onShapeChange) {
          this.onShapeChange(shape);
        }
      });
    });

    // Accept button
    this.acceptBtn.addEventListener("click", () => {
      if (this.onAccept) {
        this.onAccept();
      }
    });

    // Cancel button
    this.cancelBtn.addEventListener("click", () => {
      if (this.onCancel) {
        this.onCancel();
      }
    });

    // Close button
    this.closeBtn.addEventListener("click", () => {
      if (this.onClose) {
        this.onClose();
      }
    });
  }

  setShape(shape) {
    this.currentShape = shape;
    const shapeNames = {
      rectangle: "Rectangle",
      square: "Square",
      ellipse: "Oval",
      circle: "Circle",
      freeform: "Freeform",
    };
    const shapeIcons = {
      rectangle: icons.square,
      square: icons.square,
      ellipse: icons.circle,
      circle: icons.circle,
      freeform: icons.lasso,
    };

    this.shapeInfo.innerHTML = `
      <span class="screenshot-shape-icon">${shapeIcons[shape] || icons.square}</span>
      <span class="screenshot-shape-text">${shapeNames[shape] || "Rectangle"}</span>
    `;

    // Always show shape info
    this.shapeInfo.style.display = "flex";

    // Update highlighted option in dropdown
    this.updateShapeHighlight(shape);
  }

  updateShapeHighlight(shape) {
    // Map display shapes to menu shapes
    const menuShape = shape === "square" ? "rectangle" : shape === "circle" ? "ellipse" : shape;

    // Remove highlight from all options
    this.shapeMenu.querySelectorAll(".screenshot-shape-option").forEach((option) => {
      option.classList.remove("active");
    });

    // Add highlight to current shape
    const activeOption = this.shapeMenu.querySelector(`[data-shape="${menuShape}"]`);
    if (activeOption) {
      activeOption.classList.add("active");
    }
  }

  showPreviewMode() {
    console.log('[ScreenshotToolbar] showPreviewMode() called');
    this.mode = "preview";
    this.acceptBtn.style.display = "flex";
    this.cancelBtn.style.display = "flex";
    this.closeBtn.style.display = "none";
    this.hintText.style.display = "block";
    this.hintText.textContent = "Drag to reposition";

    // Hide shape dropdown and shape info in preview mode
    this.shapeInfo.style.display = "none";
    if (this.shapeMenu) {
      this.shapeMenu.style.display = "none";
    }
    const dropdownWrapper = this.toolbar?.querySelector(".screenshot-shape-dropdown-wrapper");
    if (dropdownWrapper) {
      dropdownWrapper.style.display = "none";
    }
    console.log('[ScreenshotToolbar] Preview mode set - acceptBtn display:', this.acceptBtn.style.display);
  }

  showSelectionMode() {
    this.mode = "selecting";
    this.acceptBtn.style.display = "none";
    this.cancelBtn.style.display = "none";
    this.closeBtn.style.display = "flex";
    this.hintText.style.display = "none";
    this.hintText.textContent = "Hold Ctrl for square/circle • Esc to cancel";

    // Show shape dropdown and shape info in selection mode
    this.shapeInfo.style.display = "flex";
    if (this.shapeMenu) {
      this.shapeMenu.style.display = "";
    }
    const dropdownWrapper = this.toolbar?.querySelector(".screenshot-shape-dropdown-wrapper");
    if (dropdownWrapper) {
      dropdownWrapper.style.display = "flex";
    }
  }

  updateHint(text) {
    this.hintText.textContent = text;
  }

  hide() {
    if (this.toolbar) {
      this.toolbar.classList.add("hidden");
    }
  }

  show() {
    console.log('[ScreenshotToolbar] show() called, toolbar exists:', !!this.toolbar);
    if (this.toolbar) {
      // Ensure toolbar is in DOM
      const inDOM = document.body.contains(this.toolbar);
      console.log('[ScreenshotToolbar] Toolbar in DOM:', inDOM);
      if (!inDOM) {
        document.body.appendChild(this.toolbar);
        console.log('[ScreenshotToolbar] Appended toolbar to body');
      }
      // Ensure toolbar wrapper is attached
      if (this.toolbarWrapper && !this.toolbar.contains(this.toolbarWrapper)) {
        this.toolbar.appendChild(this.toolbarWrapper);
        console.log('[ScreenshotToolbar] Appended toolbarWrapper to toolbar');
      }
      this.toolbar.classList.remove("hidden");
      console.log('[ScreenshotToolbar] Removed hidden class, display:', window.getComputedStyle(this.toolbar).display);
      console.log('[ScreenshotToolbar] Toolbar z-index:', window.getComputedStyle(this.toolbar).zIndex);
    }
  }

  remove() {
    console.log('[ScreenshotToolbar] remove() called');
    console.trace('[ScreenshotToolbar] remove() stack trace');
    if (this.toolbar) {
      this.toolbar.remove();
      this.toolbar = null;
      console.log('[ScreenshotToolbar] Toolbar DOM element removed and set to null');
    }
    // Clear static instance reference
    if (ScreenshotToolbar.instance === this) {
      ScreenshotToolbar.instance = null;
      console.log('[ScreenshotToolbar] Cleared static instance reference');
    }
  }
}
