/**
 * Modern Tooltip System with Position Awareness
 * Supports text-only and text+shortcut tooltips with automatic edge detection
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
 * // Tooltip with custom position
 * <button data-tooltip-text="Settings" data-tooltip-position="left">Settings</button>
 * Tooltip.init(element);
 *
 * // Or initialize all tooltips at once
 * Tooltip.initAll();
 */

class Tooltip {
  /**
   * Initialize tooltip for a single element
   * @param {HTMLElement} element - Element to attach tooltip to
   */
  static init(element) {
    const text = element.getAttribute('data-tooltip-text');
    const shortcut = element.getAttribute('data-tooltip-shortcut');
    const position = element.getAttribute('data-tooltip-position') || 'auto';

    if (!text) return;

    // If no shortcut, use simple CSS-based tooltip with position awareness
    if (!shortcut) {
      element.classList.add('has-tooltip');
      element.setAttribute('data-tooltip', text);

      // Apply position if specified (and not auto)
      if (position !== 'auto') {
        element.classList.add(`tooltip-${position}`);
      } else {
        // Auto-detect position on hover
        element.addEventListener('mouseenter', () => {
          this._adjustPositionForEdges(element);
        });
      }
      return;
    }

    // Create tooltip wrapper for shortcut support
    const wrapper = document.createElement('div');
    wrapper.className = 'tooltip-wrapper';

    const textSpan = document.createElement('span');
    textSpan.className = 'tooltip-text';
    textSpan.textContent = text;

    const shortcutSpan = document.createElement('span');
    shortcutSpan.className = 'tooltip-shortcut';
    shortcutSpan.textContent = shortcut;

    wrapper.appendChild(textSpan);
    wrapper.appendChild(shortcutSpan);

    // Ensure element has position context
    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.position === 'static') {
      element.style.position = 'relative';
    }

    element.appendChild(wrapper);

    // Show/hide handlers with position awareness
    const showHandler = () => {
      if (position === 'auto') {
        this._adjustWrapperPositionForEdges(element, wrapper);
      } else {
        wrapper.classList.add(`tooltip-${position}`);
      }
      wrapper.classList.add('show');
    };

    const hideHandler = () => {
      wrapper.classList.remove('show');
      // Remove position classes when hiding
      wrapper.classList.remove('tooltip-top', 'tooltip-bottom', 'tooltip-left', 'tooltip-right');
    };

    element.addEventListener('mouseenter', showHandler);
    element.addEventListener('mouseleave', hideHandler);

    // Store handlers for cleanup
    element._tooltipHandlers = { showHandler, hideHandler };
  }

  /**
   * Initialize all tooltips in a container
   * @param {HTMLElement|Document} container - Container to search for tooltips
   */
  static initAll(container = document) {
    const elements = container.querySelectorAll('[data-tooltip-text]');
    elements.forEach(element => Tooltip.init(element));

    // Also handle simple tooltips
    const simpleTooltips = container.querySelectorAll('.has-tooltip[data-tooltip]:not([data-tooltip-text])');
    simpleTooltips.forEach(element => {
      if (element.getAttribute('data-tooltip-position') === 'auto' || !element.getAttribute('data-tooltip-position')) {
        element.addEventListener('mouseenter', () => {
          this._adjustPositionForEdges(element);
        });
      }
    });
  }

  /**
   * Remove tooltip from an element
   * @param {HTMLElement} element - Element to remove tooltip from
   */
  static remove(element) {
    const wrapper = element.querySelector('.tooltip-wrapper');
    if (wrapper) {
      wrapper.remove();
    }

    // Remove event handlers
    if (element._tooltipHandlers) {
      element.removeEventListener('mouseenter', element._tooltipHandlers.showHandler);
      element.removeEventListener('mouseleave', element._tooltipHandlers.hideHandler);
      delete element._tooltipHandlers;
    }

    element.classList.remove('has-tooltip');
    element.removeAttribute('data-tooltip');
  }

  /**
   * Adjust tooltip position based on viewport edges (for CSS-based tooltips)
   * @private
   * @param {HTMLElement} element - Element with tooltip
   */
  static _adjustPositionForEdges(element) {
    const rect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Remove existing position classes
    element.classList.remove('tooltip-top', 'tooltip-bottom', 'tooltip-left', 'tooltip-right');

    // Determine best position
    const spaceTop = rect.top;
    const spaceBottom = viewportHeight - rect.bottom;
    const spaceLeft = rect.left;
    const spaceRight = viewportWidth - rect.right;

    // Priority: top > bottom > left > right
    // Check if there's enough space on top
    if (spaceTop > 60) {
      element.classList.add('tooltip-top');
    }
    // Check if there's enough space on bottom
    else if (spaceBottom > 60) {
      element.classList.add('tooltip-bottom');
    }
    // Check if there's enough space on left
    else if (spaceLeft > 150) {
      element.classList.add('tooltip-left');
    }
    // Default to right if there's space, otherwise top
    else if (spaceRight > 150) {
      element.classList.add('tooltip-right');
    } else {
      element.classList.add('tooltip-top');
    }
  }

  /**
   * Adjust tooltip wrapper position based on viewport edges (for JS-based tooltips with shortcuts)
   * @private
   * @param {HTMLElement} element - Element with tooltip
   * @param {HTMLElement} wrapper - Tooltip wrapper element
   */
  static _adjustWrapperPositionForEdges(element, wrapper) {
    const rect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Remove existing position classes
    wrapper.classList.remove('tooltip-top', 'tooltip-bottom', 'tooltip-left', 'tooltip-right');

    // Determine best position
    const spaceTop = rect.top;
    const spaceBottom = viewportHeight - rect.bottom;
    const spaceLeft = rect.left;
    const spaceRight = viewportWidth - rect.right;

    // Get wrapper dimensions (show temporarily to measure)
    wrapper.style.opacity = '0';
    wrapper.style.visibility = 'visible';
    const wrapperRect = wrapper.getBoundingClientRect();
    wrapper.style.opacity = '';
    wrapper.style.visibility = '';

    const tooltipHeight = wrapperRect.height || 40; // Fallback height
    const tooltipWidth = wrapperRect.width || 100; // Fallback width

    // Priority: top > bottom > left > right
    if (spaceTop > tooltipHeight + 15) {
      wrapper.classList.add('tooltip-top');
    } else if (spaceBottom > tooltipHeight + 15) {
      wrapper.classList.add('tooltip-bottom');
    } else if (spaceLeft > tooltipWidth + 15) {
      wrapper.classList.add('tooltip-left');
    } else if (spaceRight > tooltipWidth + 15) {
      wrapper.classList.add('tooltip-right');
    } else {
      // Default to top if no good position found
      wrapper.classList.add('tooltip-top');
    }
  }

  /**
   * Update tooltip text dynamically
   * @param {HTMLElement} element - Element with tooltip
   * @param {string} newText - New tooltip text
   */
  static updateText(element, newText) {
    // Update simple tooltip
    if (element.hasAttribute('data-tooltip')) {
      element.setAttribute('data-tooltip', newText);
    }

    // Update tooltip with shortcut
    if (element.hasAttribute('data-tooltip-text')) {
      element.setAttribute('data-tooltip-text', newText);
      const wrapper = element.querySelector('.tooltip-wrapper');
      if (wrapper) {
        const textSpan = wrapper.querySelector('.tooltip-text');
        if (textSpan) {
          textSpan.textContent = newText;
        }
      }
    }
  }

  /**
   * Update tooltip shortcut dynamically
   * @param {HTMLElement} element - Element with tooltip
   * @param {string} newShortcut - New shortcut text
   */
  static updateShortcut(element, newShortcut) {
    if (element.hasAttribute('data-tooltip-shortcut')) {
      element.setAttribute('data-tooltip-shortcut', newShortcut);
      const wrapper = element.querySelector('.tooltip-wrapper');
      if (wrapper) {
        const shortcutSpan = wrapper.querySelector('.tooltip-shortcut');
        if (shortcutSpan) {
          shortcutSpan.textContent = newShortcut;
        }
      }
    }
  }
}

export default Tooltip;
