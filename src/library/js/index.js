import { Bugscribe } from "./Bugscribe.js";
import { icons } from "./icons.js";

export { Bugscribe, icons };

// Expose Bugscribe class directly for IIFE build
if (typeof window !== "undefined") {
  window.Bugscribe = Bugscribe;
  window.BugscribeIcons = icons;
}
