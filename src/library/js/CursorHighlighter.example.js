/**
 * CursorHighlighter Usage Examples
 *
 * This file demonstrates how to use the CursorHighlighter class with custom color configurations.
 */

import CursorHighlighter from './CursorHighlighter.js';

// Example 1: Default colors
// - Normal click: primary color (from --bug-primary CSS variable)
// - Right click: magenta
// - Double click: blue
const defaultHighlighter = new CursorHighlighter();
defaultHighlighter.start();

// Example 2: Custom colors using standard CSS color names
const customHighlighter = new CursorHighlighter({
  clickColor: 'green',           // Normal click will be green
  rightClickColor: 'red',         // Right click will be red
  doubleClickColor: 'orange'      // Double click will be orange
});
customHighlighter.start();

// Example 3: Custom colors using hex values
const hexHighlighter = new CursorHighlighter({
  clickColor: '#00ff00',          // Bright green for normal click
  rightClickColor: '#ff1493',     // Deep pink for right click
  doubleClickColor: '#1e90ff'     // Dodger blue for double click
});
hexHighlighter.start();

// Example 4: Custom colors using RGB/RGBA
const rgbHighlighter = new CursorHighlighter({
  clickColor: 'rgb(255, 100, 0)',           // Orange for normal click
  rightClickColor: 'rgba(255, 0, 255, 0.8)', // Magenta with transparency
  doubleClickColor: 'rgb(0, 100, 255)'      // Blue for double click
});
rgbHighlighter.start();

// Example 5: Using CSS variables for dynamic theming
const themedHighlighter = new CursorHighlighter({
  clickColor: 'var(--primary-color)',
  rightClickColor: 'var(--secondary-color)',
  doubleClickColor: 'var(--accent-color)'
});
themedHighlighter.start();

// Example 6: Stop the highlighter when done
setTimeout(() => {
  defaultHighlighter.stop();
}, 10000); // Stop after 10 seconds

// Configuration Options:
//
// config = {
//   clickColor: string,        // Color for normal left-click (default: 'var(--bug-primary)')
//   rightClickColor: string,   // Color for right-click (default: 'magenta')
//   doubleClickColor: string   // Color for double-click (default: 'blue')
// }
//
// Accepted color formats:
// - CSS color names: 'red', 'blue', 'magenta', 'green', etc.
// - Hex: '#ff0000', '#00ff00', etc.
// - RGB/RGBA: 'rgb(255, 0, 0)', 'rgba(255, 0, 0, 0.5)', etc.
// - HSL/HSLA: 'hsl(0, 100%, 50%)', 'hsla(0, 100%, 50%, 0.5)', etc.
// - CSS variables: 'var(--my-color)', 'var(--bug-primary)', etc.
