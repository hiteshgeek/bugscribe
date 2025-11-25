/**
 * VideoMenus - Manages speed menu, settings menu, and keyboard shortcuts modal
 */

import { icons } from "../../icons.js";

export default class VideoMenus {
  constructor(speedMenu, settingsMenu) {
    this.speedMenu = speedMenu;
    this.settingsMenu = settingsMenu;
  }

  /**
   * Toggle speed menu visibility
   * @param {boolean} show - Whether to show menu
   */
  toggleSpeedMenu(show) {
    if (show) {
      this.speedMenu.classList.add("show");
    } else {
      this.speedMenu.classList.remove("show");
    }
  }

  /**
   * Toggle settings menu visibility
   * @param {boolean} show - Whether to show menu
   */
  toggleSettingsMenu(show) {
    if (show) {
      this.settingsMenu.classList.add("show");
    } else {
      this.settingsMenu.classList.remove("show");
    }
  }

  /**
   * Show keyboard shortcuts modal
   */
  showKeyboardShortcuts() {
    const modal = this._createShortcutsModal();
    document.body.appendChild(modal);
  }

  /**
   * Create keyboard shortcuts modal
   * @private
   * @returns {HTMLElement} Modal element
   */
  _createShortcutsModal() {
    const modal = document.createElement("div");
    modal.className = "video-shortcuts-modal";

    const content = document.createElement("div");
    content.className = "video-shortcuts-content";

    const header = document.createElement("div");
    header.className = "video-shortcuts-header";

    const title = document.createElement("h3");
    title.innerHTML = `<span class="header-icon">${icons.keyboard}</span> Keyboard Shortcuts`;
    header.appendChild(title);

    const closeBtn = document.createElement("button");
    closeBtn.className = "video-shortcuts-close";
    closeBtn.innerHTML = icons.cancel;
    closeBtn.onclick = () => modal.remove();
    header.appendChild(closeBtn);

    const shortcuts = [
      { key: "Space / K", action: "Play/Pause" },
      { key: "J", action: "Backward 10 seconds" },
      { key: "L", action: "Forward 10 seconds" },
      { key: "← Arrow", action: "Backward 5 seconds" },
      { key: "→ Arrow", action: "Forward 5 seconds" },
      { key: "M", action: "Mute/Unmute" },
      { key: "F", action: "Toggle Fullscreen" },
      { key: "I", action: "Picture in Picture" },
      { key: "Esc", action: "Exit Fullscreen/PiP or Close" },
      { key: "Click Timer", action: "Toggle Remaining/Elapsed Time" },
    ];

    const list = document.createElement("div");
    list.className = "video-shortcuts-list";

    shortcuts.forEach(({ key, action }) => {
      const item = document.createElement("div");
      item.className = "video-shortcuts-item";
      item.innerHTML = `
        <span class="shortcut-key">${key}</span>
        <span class="shortcut-action">${action}</span>
      `;
      list.appendChild(item);
    });

    content.append(header, list);
    modal.appendChild(content);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });

    return modal;
  }
}
