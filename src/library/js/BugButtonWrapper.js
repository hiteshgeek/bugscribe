import { icons } from "./icons.js";

export default class BugButtonWrapper {
  mainButton = null;
  screenshotButton = null;
  recordButton = null;
  settingsButton = null;

  constructor(options = {}) {
    this._options = options;
    this._render();
  }

  _render() {
    const wrapper = document.createElement("div");
    wrapper.className = `bug-wrapper bug-element`;

    this.mainBtn = this._getBugButton();
    wrapper.appendChild(this._getBugActions());

    // <div class="bug-separator"></div>;

    const separator = document.createElement("div");
    separator.className = "bug-separator";

    wrapper.appendChild(separator);
    wrapper.appendChild(this.mainBtn);

    document.body.appendChild(wrapper);

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

    this.screenshotButton = this._getBugScreenshotButton();
    this.recordBtn = this._getRecordButton();
    this.settingsBtn = this._getSettingsButton();

    actions.appendChild(this.screenshotButton);
    actions.appendChild(this.recordBtn);
    actions.appendChild(this.settingsBtn);

    return actions;
  }

  _getBugScreenshotButton() {
    const screenshotButton = document.createElement("button");
    screenshotButton.className = "bug-btn bug-screenshot";
    screenshotButton.innerHTML = icons.screenshot;

    // Create vertical icons container
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

    //<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>1</kbd>

    shortcut = shortcut.join("+");

    shortcut = `<kbd>${shortcut}</kbd>`;

    //wrp in <kbd>

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
}
