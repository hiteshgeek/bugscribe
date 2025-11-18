/* Minimal main JS: only bootstraps Bugscribe. All modal/event handlers removed. */

document.addEventListener("DOMContentLoaded", () => {
  // Bootstraps the Bugscribe library when it becomes available.
  (function setupBugscribe() {
    let instantiated = false;

    function createInstance() {
      if (instantiated) return;
      if (window.Bugscribe) {
        try {
          // Only create the persistent button. Library handles default behavior.
          new window.Bugscribe({
            onClick: (e, inst) => {
              // Default behavior delegated to the library (toggle modal or prompt).
            },
            position: { bottom: "24px", left: "24px" },
          });
          instantiated = true;
        } catch (err) {
          console.error("Error creating Bugscribe instance:", err);
        }
      }
    }

    createInstance();
    if (!instantiated) {
      let attempts = 0;
      const maxAttempts = 30; // ~3s polling
      const timer = setInterval(() => {
        attempts += 1;
        createInstance();
        if (instantiated || attempts >= maxAttempts) {
          clearInterval(timer);
          if (!instantiated) {
            console.warn("Bugscribe library not found — giving up");
          }
        }
      }, 100);
    }
  })();
});
