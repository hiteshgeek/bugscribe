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

class Tooltip {
  static init(element) {
    const text = element.getAttribute('data-tooltip-text');
    const shortcut = element.getAttribute('data-tooltip-shortcut');
    
    if (!text) return;
    
    // If no shortcut, use simple CSS-based tooltip
    if (!shortcut) {
      element.classList.add('has-tooltip');
      element.setAttribute('data-tooltip', text);
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
    
    // Position wrapper
    element.style.position = 'relative';
    element.appendChild(wrapper);
    
    // Show/hide on hover
    element.addEventListener('mouseenter', () => {
      wrapper.classList.add('show');
    });
    
    element.addEventListener('mouseleave', () => {
      wrapper.classList.remove('show');
    });
  }
  
  static initAll(container = document) {
    const elements = container.querySelectorAll('[data-tooltip-text]');
    elements.forEach(element => Tooltip.init(element));
  }
  
  static remove(element) {
    const wrapper = element.querySelector('.tooltip-wrapper');
    if (wrapper) {
      wrapper.remove();
    }
    element.classList.remove('has-tooltip');
    element.removeAttribute('data-tooltip');
  }
}

export default Tooltip;
