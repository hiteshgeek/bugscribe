import { icons } from "./icons.js";

export default class BugButtonWrapper {
  mainButton = null;
  screenshotButton = null;
  recordButton = null;
  settingsButton = null;

  constructor(options = {}) {
    this._options = options;
    this._render();
    // this._initDragFunctionality();
    // this._loadSavedPosition();
  }

  _render() {
    const wrapper = document.createElement("div");
    wrapper.className = `bug-wrapper bug-element`;

    this.mainBtn = this._getBugButton();
    wrapper.appendChild(this._getBugActions());

    const separator = document.createElement("div");
    separator.className = "bug-separator";

    wrapper.appendChild(separator);
    wrapper.appendChild(this.mainBtn);

    document.body.appendChild(wrapper);
    this.wrapper = wrapper;

    this.mainBtn.addEventListener("click", () => {
      wrapper.classList.toggle("open");
    });
  }

  _getBugButton() {
    const mainBtn = document.createElement("button");
    mainBtn.className = "bug-btn bug-main";
    mainBtn.innerHTML = icons.bug;
    return mainBtn;
  }

  _getBugActions() {
    const actions = document.createElement("div");
    actions.className = "bug-actions";

    this.moveButton = this._getBugMoveButton();
    this.screenshotButton = this._getBugScreenshotButton();
    this.recordBtn = this._getRecordButton();
    this.settingsBtn = this._getSettingsButton();

    actions.appendChild(this.moveButton);
    actions.appendChild(this.screenshotButton);
    actions.appendChild(this.recordBtn);
    actions.appendChild(this.settingsBtn);

    return actions;
  }

  _getBugMoveButton() {
    const moveButton = document.createElement("button");
    moveButton.className = "bug-btn bug-move";
    moveButton.innerHTML = icons.move;
    return moveButton;
  }

  _getBugScreenshotButton() {
    const screenshotButton = document.createElement("button");
    screenshotButton.className = "bug-btn bug-screenshot";
    screenshotButton.innerHTML = icons.screenshot;

    const verticalIcons = document.createElement("div");
    verticalIcons.className = "vertical-icons";

    this.bug_menu_full_page = this._getVerticalIcon("Full Page", "full_page", [
      "Ctrl",
      "Shift",
      "1",
    ]);
    this.bug_menu_visible_page = this._getVerticalIcon(
      "Visible Page",
      "visible_page",
      ["Ctrl", "Shift", "2"]
    );

    this.bug_menu_custom_area = this._getVerticalIcon(
      "Custom Area",
      "custom_area",
      ["Ctrl", "Shift", "3"]
    );

    this.bug_menu_any_page = this._getVerticalIcon("Any Page", "any_page", [
      "Ctrl",
      "Shift",
      "4",
    ]);

    verticalIcons.appendChild(this.bug_menu_full_page);
    verticalIcons.appendChild(this.bug_menu_visible_page);
    verticalIcons.appendChild(this.bug_menu_custom_area);
    verticalIcons.appendChild(this.bug_menu_any_page);

    screenshotButton.appendChild(verticalIcons);

    return screenshotButton;
  }

  _getVerticalIcon(title, id, shortcut = []) {
    const icon = document.createElement("span");
    icon.id = `bug_menu_${id}`;
    icon.className = `vertical-icon`;
    icon.textContent = title;

    shortcut = shortcut.join("+");
    shortcut = `<kbd>${shortcut}</kbd>`;

    const shortcutSpan = document.createElement("span");
    shortcutSpan.className = "bug-shortcut";
    shortcutSpan.innerHTML = shortcut;

    icon.appendChild(shortcutSpan);
    return icon;
  }

  _getRecordButton() {
    const recordBtn = document.createElement("button");
    recordBtn.className = "bug-btn bug-record";
    recordBtn.innerHTML = icons.record;
    return recordBtn;
  }

  _getSettingsButton() {
    const settingsBtn = document.createElement("button");
    settingsBtn.className = "bug-btn bug-settings";
    settingsBtn.innerHTML = icons.settings;
    return settingsBtn;
  }

  _initDragFunctionality() {
    let isDragging = false;
    let startX, startY, initialX, initialY;

    const onMouseDown = (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = this.mainBtn.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;

      this.wrapper.style.transition = "none";
      this.wrapper.classList.add("dragging");

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);

      e.preventDefault();
      e.stopPropagation();
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      const newX = initialX + deltaX;
      const newY = initialY + deltaY;

      // Keep button within viewport bounds (based on main button)
      const mainBtnRect = this.mainBtn.getBoundingClientRect();
      const maxX = window.innerWidth - mainBtnRect.width;
      const maxY = window.innerHeight - mainBtnRect.height;

      const boundedX = Math.max(0, Math.min(newX, maxX));
      const boundedY = Math.max(0, Math.min(newY, maxY));

      this.wrapper.style.left = `${boundedX}px`;
      this.wrapper.style.top = `${boundedY}px`;
      this.wrapper.style.right = "auto";
      this.wrapper.style.bottom = "auto";
    };

    const onMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        this.wrapper.style.transition = "";
        this.wrapper.classList.remove("dragging");

        // Save position to localStorage
        this._savePosition();

        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      }
    };

    this.moveButton.addEventListener("mousedown", onMouseDown);
  }

  _savePosition() {
    const rect = this.mainBtn.getBoundingClientRect();
    const position = {
      left: rect.left,
      top: rect.top,
    };

    try {
      localStorage.setItem(
        "bugscribe-button-position",
        JSON.stringify(position)
      );
    } catch (e) {
      console.warn("Failed to save button position to localStorage:", e);
    }
  }

  // _loadSavedPosition() {
  //   try {
  //     const savedPosition = localStorage.getItem("bugscribe-button-position");
  //     if (savedPosition) {
  //       const position = JSON.parse(savedPosition);

  //       // Calculate offset between wrapper and main button
  //       const wrapperRect = this.wrapper.getBoundingClientRect();
  //       const mainBtnRect = this.mainBtn.getBoundingClientRect();
  //       const offsetX = mainBtnRect.left - wrapperRect.left;
  //       const offsetY = mainBtnRect.top - wrapperRect.top;

  //       // Position wrapper so main button appears at saved position
  //       const wrapperLeft = position.left - offsetX;
  //       const wrapperTop = position.top - offsetY;

  //       // Ensure wrapper is within viewport
  //       const maxX = window.innerWidth - this.wrapper.offsetWidth;
  //       const maxY = window.innerHeight - this.wrapper.offsetHeight;

  //       const boundedX = Math.max(0, Math.min(wrapperLeft, maxX));
  //       const boundedY = Math.max(0, Math.min(wrapperTop, maxY));

  //       this.wrapper.style.left = `${boundedX}px`;
  //       this.wrapper.style.top = `${boundedY}px`;
  //       this.wrapper.style.right = "auto";
  //       this.wrapper.style.bottom = "auto";
  //     }
  //   } catch (e) {
  //     console.warn("Failed to load button position from localStorage:", e);
  //   }
  // }
}
