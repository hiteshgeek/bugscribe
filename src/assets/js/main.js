// Main (classic) script for the demo landing page
// Implements a theme mode switcher (system -> light -> dark), persists selection in localStorage
(function () {
  const STORAGE_KEY = "bugscribe:theme";
  const modes = ["system", "light", "dark"];

  function applyMode(mode) {
    const html = document.documentElement;
    if (mode === "system") {
      html.setAttribute("data-theme", "system");
    } else if (mode === "dark") {
      html.setAttribute("data-theme", "dark");
    } else {
      html.setAttribute("data-theme", "light");
    }
  }

  function readSaved() {
    return localStorage.getItem(STORAGE_KEY) || "system";
  }

  function saveMode(m) {
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch (e) {
      /* ignore */
    }
  }

  function updateButton(btn, mode) {
    if (!btn) return;
    const icon = btn.querySelector("i");
    if (icon) {
      icon.className =
        mode === "dark"
          ? "fa-solid fa-moon"
          : mode === "light"
          ? "fa-solid fa-sun"
          : "fa-solid fa-circle-half-stroke";
    }
    btn.setAttribute("data-mode", mode);
    btn.setAttribute("title", "Theme: " + mode);
    btn.setAttribute("aria-pressed", mode !== "system");
  }

  function cycle(current) {
    const idx = modes.indexOf(current);
    return modes[(idx + 1) % modes.length];
  }

  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("theme-toggle");
    const saved = readSaved();
    applyMode(saved);
    updateButton(btn, saved);

    if (btn) {
      btn.addEventListener("click", () => {
        const current = localStorage.getItem(STORAGE_KEY) || "system";
        const next = cycle(current);
        applyMode(next);
        updateButton(btn, next);
        saveMode(next);
      });
      // keyboard accessibility
      btn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          btn.click();
        }
      });
    }

    // Demo wiring for buttons (dispatch capture events if library exists)
    document.getElementById("btn-demo-full")?.addEventListener("click", () => {
      document.dispatchEvent(
        new CustomEvent("bugscribe.capture", { detail: { mode: "full" } })
      );
    });
    document
      .getElementById("btn-demo-select")
      ?.addEventListener("click", () => {
        document.dispatchEvent(
          new CustomEvent("bugscribe.capture", { detail: { mode: "select" } })
        );
      });
  });

  // Expose setter for other scripts
  window.BugscribeTheme = window.BugscribeTheme || {};
  window.BugscribeTheme.setThemeMode = function (m) {
    applyMode(m);
    saveMode(m);
  };
})();
