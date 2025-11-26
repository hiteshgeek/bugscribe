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

    // Get tooltip content to measure
    const tooltipText = element.getAttribute('data-tooltip');
    if (!tooltipText) return;

    // Create temporary element to measure tooltip size
    const tempTooltip = document.createElement('div');
    tempTooltip.style.cssText = `
      position: fixed;
      visibility: hidden;
      white-space: nowrap;
      padding: 5px 10px;
      font-size: 0.813rem;
      font-weight: 500;
      border-radius: 6px;
      pointer-events: none;
    `;
    tempTooltip.textContent = tooltipText;
    document.body.appendChild(tempTooltip);
    const tooltipWidth = tempTooltip.offsetWidth;
    const tooltipHeight = tempTooltip.offsetHeight;
    document.body.removeChild(tempTooltip);

    // Calculate available space
    const spaceTop = rect.top;
    const spaceBottom = viewportHeight - rect.bottom;
    const spaceLeft = rect.left;
    const spaceRight = viewportWidth - rect.right;
    const elementCenterX = rect.left + rect.width / 2;

    // Calculate minimum space needed (tooltip size + gap + some margin)
    const minVerticalSpace = tooltipHeight + 20;
    const minHorizontalSpace = tooltipWidth + 20;

    // Check if tooltip would go off-screen horizontally for top/bottom positions
    const halfTooltipWidth = tooltipWidth / 2;
    const wouldOverflowLeft = elementCenterX - halfTooltipWidth < 10;
    const wouldOverflowRight = elementCenterX + halfTooltipWidth > viewportWidth - 10;

    // Priority: top > bottom > left > right (but only if fits)
    if (spaceTop >= minVerticalSpace && !wouldOverflowLeft && !wouldOverflowRight) {
      element.classList.add('tooltip-top');
    } else if (spaceBottom >= minVerticalSpace && !wouldOverflowLeft && !wouldOverflowRight) {
      element.classList.add('tooltip-bottom');
    } else if (spaceLeft >= minHorizontalSpace) {
      element.classList.add('tooltip-left');
    } else if (spaceRight >= minHorizontalSpace) {
      element.classList.add('tooltip-right');
    } else {
      // Fallback to position with most space
      const maxSpace = Math.max(spaceTop, spaceBottom, spaceLeft, spaceRight);
      if (maxSpace === spaceTop) element.classList.add('tooltip-top');
      else if (maxSpace === spaceBottom) element.classList.add('tooltip-bottom');
      else if (maxSpace === spaceLeft) element.classList.add('tooltip-left');
      else element.classList.add('tooltip-right');
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

    // Get wrapper dimensions (show temporarily to measure)
    const originalDisplay = wrapper.style.display;
    const originalOpacity = wrapper.style.opacity;
    const originalVisibility = wrapper.style.visibility;

    wrapper.style.display = 'flex';
    wrapper.style.opacity = '0';
    wrapper.style.visibility = 'visible';
    const wrapperRect = wrapper.getBoundingClientRect();

    wrapper.style.display = originalDisplay;
    wrapper.style.opacity = originalOpacity;
    wrapper.style.visibility = originalVisibility;

    const tooltipHeight = wrapperRect.height;
    const tooltipWidth = wrapperRect.width;

    // Calculate available space
    const spaceTop = rect.top;
    const spaceBottom = viewportHeight - rect.bottom;
    const spaceLeft = rect.left;
    const spaceRight = viewportWidth - rect.right;
    const elementCenterX = rect.left + rect.width / 2;

    // Calculate minimum space needed (tooltip size + gap + margin)
    const minVerticalSpace = tooltipHeight + 20;
    const minHorizontalSpace = tooltipWidth + 20;

    // Check if tooltip would go off-screen horizontally for top/bottom positions
    const halfTooltipWidth = tooltipWidth / 2;
    const wouldOverflowLeft = elementCenterX - halfTooltipWidth < 10;
    const wouldOverflowRight = elementCenterX + halfTooltipWidth > viewportWidth - 10;

    // Priority: top > bottom > left > right (but only if fits)
    if (spaceTop >= minVerticalSpace && !wouldOverflowLeft && !wouldOverflowRight) {
      wrapper.classList.add('tooltip-top');
    } else if (spaceBottom >= minVerticalSpace && !wouldOverflowLeft && !wouldOverflowRight) {
      wrapper.classList.add('tooltip-bottom');
    } else if (spaceLeft >= minHorizontalSpace) {
      wrapper.classList.add('tooltip-left');
    } else if (spaceRight >= minHorizontalSpace) {
      wrapper.classList.add('tooltip-right');
    } else {
      // Fallback to position with most space
      const maxSpace = Math.max(spaceTop, spaceBottom, spaceLeft, spaceRight);
      if (maxSpace === spaceTop) wrapper.classList.add('tooltip-top');
      else if (maxSpace === spaceBottom) wrapper.classList.add('tooltip-bottom');
      else if (maxSpace === spaceLeft) wrapper.classList.add('tooltip-left');
      else wrapper.classList.add('tooltip-right');
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
