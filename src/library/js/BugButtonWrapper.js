//import icons
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
    // Create button wrapper
    const wrapper = document.createElement("div");
    wrapper.className = `bug-wrapper bug-element`;

    this.mainBtn = this._getBugButton();
    wrapper.appendChild(this._getBugActions());
    wrapper.appendChild(this.mainBtn);

    // Append to body
    document.body.appendChild(wrapper);

    // Add event listeners
    this.mainBtn.addEventListener("click", () => {
      wrapper.classList.toggle("open");
    });
  }

  _getBugButton() {
    // Create main button
    const mainBtn = document.createElement("button");
    mainBtn.className = "bug-btn bug-main";
    mainBtn.innerHTML = icons.bug;
    return mainBtn;
  }

  _getBugActions() {
    // Create actions container
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
    return screenshotButton;
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
