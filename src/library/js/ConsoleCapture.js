export default class ConsoleCapture {
  constructor() {
    this.logs = [];
    this.overrideConsole();
  }

  overrideConsole() {
    ["log", "warn", "error", "info"].forEach((type) => {
      const original = console[type];

      console[type] = (...args) => {
        this.logs.push({
          type,
          message: args,
          timestamp: new Date().toLocaleTimeString(),
        });
        original.apply(console, args); // Keep original console output
      };
    });
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }

  showOverlay() {
    let panel = document.getElementById("console-capture-panel");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "console-capture-panel";
      panel.style.cssText = `
        position:fixed; bottom:10px; right:10px; width:350px; height:250px;
        background:#1e1e1e; color:#fff; padding:10px; overflow:auto;
        font-size:12px; z-index:999999; border:1px solid #444; 
        border-radius:6px; box-shadow:0 0 10px rgba(0,0,0,.4);
        font-family:monospace;
      `;
      document.body.appendChild(panel);
    }

    panel.innerHTML = this.logs
      .map(
        (log) => `<div>
        <span style="color:#888">${log.timestamp}</span>
        <span style="color:${this.colorMap(log.type)}">[${log.type}]</span>
        ${log.message.join(" ")}
      </div>`
      )
      .join("");
  }

  colorMap(type) {
    switch (type) {
      case "error":
        return "red";
      case "warn":
        return "yellow";
      case "info":
        return "lightblue";
      default:
        return "lightgreen";
    }
  }
}
