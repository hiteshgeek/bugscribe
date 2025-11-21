import BugButton from "./BugButton.js";

export default class Bugscribe {
  constructor(options = {}) {
    this._options = options;

    this.bug_button = new BugButton(options.button || {});
  }
}

export { Bugscribe };
