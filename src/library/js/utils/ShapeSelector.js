export default class ShapeSelector {
  async show() {
    return new Promise((resolve) => {
      const modalBackdrop = document.createElement("div");
      modalBackdrop.className = "mc-initial-backdrop";

      const selectorContainer = document.createElement("div");
      selectorContainer.id = "mc-shape-selector";

      selectorContainer.innerHTML = `
        <button id="mc-cancel-btn" class="mc-cancel-btn" title="Cancel">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <h3 class="mc-selector-title">Choose Capture Shape</h3>
        <div class="mc-button-grid">
          <button id="mc-shape-rect" class="mc-shape-btn" data-shape="rectangle">
            Rectangle
          </button>
          <button id="mc-shape-square" class="mc-shape-btn" data-shape="square">
            Square
          </button>
          <button id="mc-shape-ellipse" class="mc-shape-btn" data-shape="ellipse">
            Ellipse/Oval
          </button>
          <button id="mc-shape-circle" class="mc-shape-btn" data-shape="circle">
            Circle
          </button>
        </div>
        <p class="mc-selector-note">Square and Circle maintain 1:1 aspect ratio</p>
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

      buttons.forEach((btn) => {
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
