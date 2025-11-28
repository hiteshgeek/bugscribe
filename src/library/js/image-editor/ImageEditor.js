// ImageEditor.js - Image annotation and editing component

import { icons } from "../icons.js";
import Tooltip from "../Tooltip.js";
import BackdropManager from "../utils/BackdropManager.js";

export default class ImageEditor {
  constructor(imageURL, options = {}) {
    this.imageURL = imageURL;
    this.onDone = options.onDone;
    this.onCancel = options.onCancel;
    this.backdrop = options.backdrop || null; // Use existing backdrop if provided
    this.overlay = null;
    this.toolbar = null;
    this.canvas = null;
    this.ctx = null;
    this.operations = []; // Track operations for undo
    this.currentTool = null; // 'text', 'shape', 'pointer', 'blur', 'crop'
    this.currentShape = 'rectangle'; // For shape tool
    this.createdBackdrop = false; // Track if we created the backdrop
  }

  open() {
    this._createOverlay();
    this._createCanvas();
    this._createToolbar();
    this._loadImage();
  }

  _createOverlay() {
    // If backdrop was provided, reuse it
    if (this.backdrop && document.body.contains(this.backdrop)) {
      console.log('[ImageEditor] Reusing provided backdrop');
      this.overlay = this.backdrop;
      this.overlay.classList.add("bug-element");
      this.overlay.classList.add("image-editor-overlay");
      this.overlay.style.zIndex = "1000001"; // Higher than toolbar
      // Don't modify opacity or background - use original mc-backdrop styles
    } else {
      // Use BackdropManager to get or create backdrop
      console.log('[ImageEditor] Getting backdrop from BackdropManager');
      this.overlay = BackdropManager.getBackdrop();
      this.overlay.classList.add("bug-element");
      this.overlay.classList.add("image-editor-overlay");
      this.overlay.style.zIndex = "1000001";
      this.createdBackdrop = true;
    }
  }

  _createCanvas() {
    const canvasContainer = document.createElement("div");
    canvasContainer.className = "image-editor-canvas-container";

    this.canvas = document.createElement("canvas");
    this.canvas.className = "image-editor-canvas";
    this.ctx = this.canvas.getContext("2d");

    canvasContainer.appendChild(this.canvas);
    this.overlay.appendChild(canvasContainer);
  }

  _createToolbar() {
    this.toolbar = document.createElement("div");
    this.toolbar.className = "image-editor-toolbar";

    // Add text button
    const addTextBtn = this._createToolButton(
      icons.note,
      "Add text",
      "Click to add text annotations",
      () => this._selectTool('text')
    );

    // Add shape dropdown button
    const shapeDropdown = this._createShapeDropdown();

    // Add pointers button
    const addPointerBtn = this._createToolButton(
      icons.arrow_right,
      "Add pointer",
      "Click to add pointer arrows",
      () => this._selectTool('pointer')
    );

    // Add blur button
    const addBlurBtn = this._createToolButton(
      icons.hide,
      "Add blur",
      "Click to blur sensitive areas",
      () => this._selectTool('blur')
    );

    // Crop button
    const cropBtn = this._createToolButton(
      icons.crop,
      "Crop image",
      "Click to crop the image",
      () => this._selectTool('crop')
    );

    // Undo button (initially disabled)
    const undoBtn = this._createToolButton(
      icons.undo,
      "Undo",
      "Undo last operation",
      () => this._undo(),
      true // Initially disabled
    );
    undoBtn.classList.add("image-editor-undo-btn");

    // Done button
    const doneBtn = this._createActionButton(
      icons.accept,
      "Done",
      "Save changes and continue",
      () => this._handleDone()
    );

    // Cancel button
    const cancelBtn = this._createActionButton(
      icons.cancel,
      "Cancel",
      "Cancel editing and go back",
      () => this._handleCancel()
    );
    cancelBtn.classList.add("image-editor-cancel-btn");

    // Append all buttons
    this.toolbar.appendChild(addTextBtn);
    this.toolbar.appendChild(shapeDropdown);
    this.toolbar.appendChild(addPointerBtn);
    this.toolbar.appendChild(addBlurBtn);
    this.toolbar.appendChild(cropBtn);
    this.toolbar.appendChild(undoBtn);
    this.toolbar.appendChild(doneBtn);
    this.toolbar.appendChild(cancelBtn);

    this.overlay.appendChild(this.toolbar);
  }

  _createToolButton(iconSVG, label, tooltip, onClick, disabled = false) {
    const btn = document.createElement("button");
    btn.className = "image-editor-tool-btn";
    btn.innerHTML = iconSVG;
    btn.setAttribute("data-tooltip-text", tooltip);
    btn.disabled = disabled;

    if (!disabled) {
      btn.addEventListener("click", onClick);
    }

    // Initialize tooltip
    Tooltip.init(btn);

    return btn;
  }

  _createActionButton(iconSVG, label, tooltip, onClick) {
    const btn = document.createElement("button");
    btn.className = "image-editor-action-btn";
    btn.innerHTML = `${iconSVG} ${label}`;
    btn.setAttribute("data-tooltip-text", tooltip);
    btn.addEventListener("click", onClick);

    // Initialize tooltip
    Tooltip.init(btn);

    return btn;
  }

  _createShapeDropdown() {
    const dropdownWrapper = document.createElement("div");
    dropdownWrapper.className = "image-editor-shape-dropdown";

    const dropdownBtn = this._createToolButton(
      icons.square,
      "Add shape",
      "Click to add shapes",
      () => {
        dropdown.classList.toggle("show");
      }
    );

    const dropdown = document.createElement("div");
    dropdown.className = "image-editor-dropdown-menu";
    dropdown.innerHTML = `
      <div class="image-editor-dropdown-option" data-shape="rectangle">
        <span class="shape-icon">${icons.square}</span>
        <span class="shape-name">Rectangle</span>
      </div>
      <div class="image-editor-dropdown-option" data-shape="ellipse">
        <span class="shape-icon">${icons.circle}</span>
        <span class="shape-name">Oval</span>
      </div>
    `;

    // Handle shape selection
    dropdown.querySelectorAll(".image-editor-dropdown-option").forEach(option => {
      option.addEventListener("click", (e) => {
        e.stopPropagation();
        const shape = option.getAttribute("data-shape");
        this.currentShape = shape;
        this._selectTool('shape');
        dropdown.classList.remove("show");
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!dropdownWrapper.contains(e.target)) {
        dropdown.classList.remove("show");
      }
    });

    dropdownWrapper.appendChild(dropdownBtn);
    dropdownWrapper.appendChild(dropdown);

    return dropdownWrapper;
  }

  _selectTool(tool) {
    this.currentTool = tool;
    console.log(`[ImageEditor] Selected tool: ${tool}`);
    // TODO: Implement tool selection logic
    // Highlight selected tool button
    // Update cursor
  }

  _undo() {
    if (this.operations.length === 0) return;
    console.log("[ImageEditor] Undo last operation");
    // TODO: Implement undo logic
    this.operations.pop();
    this._updateUndoButton();
  }

  _updateUndoButton() {
    const undoBtn = this.toolbar.querySelector(".image-editor-undo-btn");
    if (undoBtn) {
      undoBtn.disabled = this.operations.length === 0;
    }
  }

  _loadImage() {
    const img = new Image();
    img.onload = () => {
      // Set canvas size to image size
      this.canvas.width = img.width;
      this.canvas.height = img.height;

      // Draw image on canvas
      this.ctx.drawImage(img, 0, 0);

      console.log("[ImageEditor] Image loaded successfully");
    };
    img.onerror = () => {
      console.error("[ImageEditor] Failed to load image");
    };
    img.src = this.imageURL;
  }

  _handleDone() {
    console.log("[ImageEditor] Done - saving changes");

    // Get the final image data URL
    const finalImageURL = this.canvas.toDataURL("image/png");

    // Remove the backdrop completely when done
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }

    // Call onDone callback with the final image
    if (this.onDone) {
      this.onDone(finalImageURL);
    }
  }

  _handleCancel() {
    console.log("[ImageEditor] Cancel - discarding changes");

    // Close editor
    this.close();

    // Call onCancel callback
    if (this.onCancel) {
      this.onCancel();
    }
  }

  close() {
    if (this.overlay) {
      // If we created the backdrop, remove it completely
      if (this.createdBackdrop) {
        this.overlay.remove();
      } else {
        // If we're reusing an existing backdrop, just clean up our additions
        this.overlay.classList.remove("bug-element");
        this.overlay.classList.remove("image-editor-overlay");
        this.overlay.style.zIndex = ""; // Reset z-index
        // Don't reset opacity or background - they weren't modified

        // Remove canvas container (child elements)
        const canvasContainer = this.overlay.querySelector(".image-editor-canvas-container");
        if (canvasContainer) {
          canvasContainer.remove();
        }

        // Remove toolbar if it's a child of overlay
        if (this.toolbar && this.overlay.contains(this.toolbar)) {
          this.toolbar.remove();
        }
      }
      this.overlay = null;
    }
  }

  destroy() {
    this.close();
  }
}
