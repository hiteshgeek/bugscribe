//import icons
import { icons } from "./icons.js";

export default class BugButton {
  _mainButton = null;
  _screenshotButton = null;
  _recordButton = null;
  _settingsButton = null;

  constructor(options = {}) {
    this._options = options;

    this._render();
  }

  _render() {
    // Create button wrapper
    const wrapper = document.createElement("div");
    wrapper.className = `bug-wrapper`;

    this._mainBtn = this._getBugButton();
    this._screenshotBtn = this._getBugScreenshotButton();
    this._recordBtn = this._getRecordButton();
    this._settingsBtn = this._getSettingsButton();

    wrapper.appendChild(this._getBugActions());
    wrapper.appendChild(this._mainBtn);

    // Append to body
    document.body.appendChild(wrapper);

    // Add event listeners
    this._mainBtn.addEventListener("click", () => {
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

    const screenshotBtn = this._getBugScreenshotButton();
    const recordBtn = this._getRecordButton();
    const settingsBtn = this._getSettingsButton();

    actions.appendChild(screenshotBtn);
    actions.appendChild(recordBtn);
    actions.appendChild(settingsBtn);

    return actions;
  }

  _getBugScreenshotButton() {
    const screenshotBtn = document.createElement("button");
    screenshotBtn.className = "bug-btn bug-screenshot";
    screenshotBtn.innerHTML = icons.screenshot;
    return screenshotBtn;
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
