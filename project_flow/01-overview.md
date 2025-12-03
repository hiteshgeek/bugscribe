# Project Flow Overview

This document explains the overall flow of the Bugscribe project and how its modules interact.

## Modules

- Bugscribe (main class)
- BugButtonWrapper
- PreviewManager
- CustomVideoPlayer
- CursorHighlighter
- MediaCapture
- SCSS Components

## Flow

1. Initialization: Bugscribe is instantiated and sets up the UI.
2. User interacts with the floating button (BugButtonWrapper).
3. Screenshot or recording is triggered.
4. PreviewManager displays captured media.
5. CustomVideoPlayer handles video playback.
6. CursorHighlighter provides visual feedback during capture.

[Prev: License](../documentation/13-license.md) | [Index](../documentation/index.md) | [Next: Bugscribe Module](./02-bugscribe-module.md)
