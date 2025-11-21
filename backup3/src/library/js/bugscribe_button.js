// BugscribeButton.js - Floating expandable button for Bugscribe
class BugscribeButton {
  constructor(options = {}) {
    this.options = Object.assign(
      {
        bgColor: "#2563eb",
        position: { vertical: "bottom", horizontal: "right" },
      },
      options
    );
    this.isOpen = false;
    this._render();
  }

  _render() {
    if (document.getElementById("bugscribe-btn-wrapper")) {
      document.getElementById("bugscribe-btn-wrapper").remove();
    }
    const wrapper = document.createElement("div");
    wrapper.id = "bugscribe-btn-wrapper";
    wrapper.className = `bugscribe-btn-wrapper ${this.options.position.vertical} ${this.options.position.horizontal}`;
    const mainBtn = document.createElement("button");
    mainBtn.className = "bugscribe-btn-main";
    mainBtn.style.background = this.options.bgColor;
    mainBtn.innerHTML = '<i class="fa-solid fa-bug"></i>';
    mainBtn.title = "Open Bugscribe";
    const panel = document.createElement("div");
    panel.className = "bugscribe-btn-panel";
    const splitBtn = document.createElement("button");
    splitBtn.className = "bugscribe-btn-action";
    splitBtn.innerHTML = '<i class="fa-solid fa-camera"></i>';
    splitBtn.title = "Screenshot";
    const splitMenu = document.createElement("div");
    splitMenu.className = "bugscribe-btn-split-menu";
    splitMenu.innerHTML = `
      <button class="bugscribe-btn-split">Full page</button>
      <button class="bugscribe-btn-split">Visible page</button>
      <button class="bugscribe-btn-split">Custom area</button>
      <button class="bugscribe-btn-split">Media API</button>
    `;
    splitBtn.appendChild(splitMenu);
    const recordBtn = document.createElement("button");
    recordBtn.className = "bugscribe-btn-action";
    recordBtn.innerHTML = '<i class="fa-solid fa-video"></i>';
    recordBtn.title = "Record";
    const settingsBtn = document.createElement("button");
    settingsBtn.className = "bugscribe-btn-action";
    settingsBtn.innerHTML = '<i class="fa-solid fa-gear"></i>';
    settingsBtn.title = "Settings";
    panel.appendChild(splitBtn);
    panel.appendChild(recordBtn);
    panel.appendChild(settingsBtn);
    panel.style.display = "none";
    mainBtn.addEventListener("click", () => {
      this.isOpen = !this.isOpen;
      panel.style.display = this.isOpen ? "flex" : "none";
      wrapper.classList.toggle("open", this.isOpen);
    });
    splitBtn.addEventListener("mouseenter", () => {
      splitMenu.style.display = "block";
    });
    splitBtn.addEventListener("mouseleave", () => {
      splitMenu.style.display = "none";
    });
    wrapper.appendChild(panel);
    wrapper.appendChild(mainBtn);
    document.body.appendChild(wrapper);
  }
}

// UMD-style: expose globally for IIFE, export for ESM
if (typeof window !== "undefined") {
  window.BugscribeButton = BugscribeButton;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = BugscribeButton;
}
export default BugscribeButton;
