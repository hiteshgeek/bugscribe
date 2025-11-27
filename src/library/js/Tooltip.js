/**
 * Modern Tooltip System
 * Supports text-only and text+shortcut tooltips
 *
 * Usage:
 *
 * // Simple tooltip (CSS only)
 * <button class="has-tooltip" data-tooltip="Play video">Play</button>
 *
 * // Tooltip with shortcut (requires JS initialization)
 * <button data-tooltip-text="Play video" data-tooltip-shortcut="Space">Play</button>
 * Tooltip.init(element);
 *
 * // Or initialize all tooltips at once
 * Tooltip.initAll();
 */

export default class Tooltip {
  static init(element) {
    const text = element.getAttribute("data-tooltip-text");
    const shortcut = element.getAttribute("data-tooltip-shortcut");

    if (!text) return;

    // Always use tooltip-wrapper for consistency (even without shortcuts)
    const wrapper = document.createElement("div");
    wrapper.className = "tooltip-wrapper";

    const textSpan = document.createElement("span");
    textSpan.className = "tooltip-text";
    textSpan.textContent = text;

    wrapper.appendChild(textSpan);

    // Add shortcut if provided
    if (shortcut) {
      const shortcutSpan = document.createElement("span");
      shortcutSpan.className = "tooltip-shortcut";
      shortcutSpan.textContent = shortcut;
      wrapper.appendChild(shortcutSpan);
    }

    // Position wrapper
    element.style.position = "relative";
    element.appendChild(wrapper);

    // Show/hide on hover
    element.addEventListener("mouseenter", () => {
      wrapper.classList.add("show");
    });

    element.addEventListener("mouseleave", () => {
      wrapper.classList.remove("show");
    });
  }

  static initAll(container = document) {
    const elements = container.querySelectorAll("[data-tooltip-text]");
    elements.forEach((element) => Tooltip.init(element));
  }

  static updateText(element, newText) {
    // Update the data attribute
    element.setAttribute("data-tooltip-text", newText);

    // Find and update the tooltip wrapper text
    const wrapper = element.querySelector(".tooltip-wrapper");
    if (wrapper) {
      const textSpan = wrapper.querySelector(".tooltip-text");
      if (textSpan) {
        textSpan.textContent = newText;
      }
    }

    // Also update CSS-based tooltip if it exists
    if (element.classList.contains("has-tooltip")) {
      element.setAttribute("data-tooltip", newText);
    }
  }

  static remove(element) {
    const wrapper = element.querySelector(".tooltip-wrapper");
    if (wrapper) {
      wrapper.remove();
    }
    element.classList.remove("has-tooltip");
    element.removeAttribute("data-tooltip");
  }
}
