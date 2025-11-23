export default class ShapeSelector {
  async show() {
    return new Promise((resolve) => {
      const modalBackdrop = document.createElement("div");
      modalBackdrop.className = "mc-initial-backdrop";
      Object.assign(modalBackdrop.style, {
        position: "fixed",
        inset: "0",
        background: "rgba(0, 0, 0, 0.7)",
        zIndex: "100000",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      });

      const selectorContainer = document.createElement("div");
      selectorContainer.id = "mc-shape-selector";
      Object.assign(selectorContainer.style, {
        padding: "30px",
        background: "white",
        borderRadius: "8px",
        textAlign: "center",
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        maxWidth: "600px",
        position: "relative",
      });

      selectorContainer.innerHTML = `
        <button id="mc-cancel-btn" style="position: absolute; top: 10px; right: 10px; width: 30px; height: 30px; border: none; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 4px; transition: background 0.2s;" title="Cancel">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <h3 style="margin-top: 0; font-size: 1.3em; margin-bottom: 20px;">Choose Capture Shape</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
          <button id="mc-shape-rect" data-shape="rectangle" style="padding: 15px 20px; cursor: pointer; border: 2px solid #ccc; background-color: white; border-radius: 4px; font-weight: bold; transition: all 0.2s;">
            Rectangle
          </button>
          <button id="mc-shape-square" data-shape="square" style="padding: 15px 20px; cursor: pointer; border: 2px solid #ccc; background-color: white; border-radius: 4px; font-weight: bold; transition: all 0.2s;">
            Square
          </button>
          <button id="mc-shape-ellipse" data-shape="ellipse" style="padding: 15px 20px; cursor: pointer; border: 2px solid #ccc; background-color: white; border-radius: 4px; font-weight: bold; transition: all 0.2s;">
            Ellipse/Oval
          </button>
          <button id="mc-shape-circle" data-shape="circle" style="padding: 15px 20px; cursor: pointer; border: 2px solid #ccc; background-color: white; border-radius: 4px; font-weight: bold; transition: all 0.2s;">
            Circle
          </button>
        </div>
        <p style="color: gray; font-size: 0.9em; margin: 0;">Square and Circle maintain 1:1 aspect ratio</p>
      `;

      modalBackdrop.appendChild(selectorContainer);
      document.body.appendChild(modalBackdrop);

      selectorContainer.addEventListener("click", (e) => {
        e.stopPropagation();
      });

      modalBackdrop.addEventListener("click", () => {
        cleanup();
        resolve(null);
      });

      const buttons = ["rect", "square", "ellipse", "circle"].map((shape) =>
        document.getElementById(`mc-shape-${shape}`)
      );
      const cancelButton = document.getElementById("mc-cancel-btn");

      cancelButton.addEventListener("mouseenter", () => {
        cancelButton.style.backgroundColor = "#f0f0f0";
      });
      cancelButton.addEventListener("mouseleave", () => {
        cancelButton.style.backgroundColor = "transparent";
      });

      buttons.forEach((btn) => {
        btn.addEventListener("mouseenter", () => {
          btn.style.borderColor = "var(--bug-primary, #d81d65)";
          btn.style.backgroundColor = "#f8f9fa";
        });
        btn.addEventListener("mouseleave", () => {
          btn.style.borderColor = "#ccc";
          btn.style.backgroundColor = "white";
        });
        btn.addEventListener("click", () => {
          cleanup();
          resolve(btn.dataset.shape);
        });
      });

      cancelButton.addEventListener("click", () => {
        cleanup();
        resolve(null);
      });

      const cleanup = () => {
        modalBackdrop.remove();
        document.removeEventListener("keydown", onKeyDown);
      };

      const onKeyDown = (e) => {
        if (e.key === "Escape") {
          cleanup();
          resolve(null);
        }
      };

      document.addEventListener("keydown", onKeyDown);
    });
  }
}
