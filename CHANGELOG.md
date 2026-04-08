# Changelog

All notable changes to this project will be documented in this file.

## 0.0.4

- Refined automatic graph organization to favor a more compact, vertical reading flow in larger repositories instead of spreading cards aggressively across the horizontal axis.
- Updated overlap resolution so horizontal spacing is handled more locally by row, improving readability in dense graphs.
- Removed the minified overview area to simplify the board and free more space for the main graph.
- Preserved `HEAD`-anchored centering while keeping the board focused on the primary graph interaction area.

## 0.0.3

- Updated graph centering so the current `HEAD` becomes the primary anchor point for board positioning and initial viewport focus.
- Improved the revision graph presentation around the active branch by preferring the checked out reference over the geometric center of the graph when centering.

## 0.0.2

- Improved revision graph readability with curved connectors, compacted vertical spacing, and centered graph presentation inside the board.
- Added horizontal drag handles for reference cards so users can manually rearrange the graph during a session.
- Added a board context menu with `Reorganize`, `Zoom Out`, and `Zoom In` actions for graph layout control.
- Refined automatic graph organization for repositories with sparse or denser reference layouts.
- Improved drag interaction feedback and minimap behavior to better match the rendered graph.

## 0.0.1

- Initial public release of GIT Revision Graph.
- Dedicated revision graph webview for Git references.
- Compare between references and against the worktree.
- Checkout, merge, delete, unified diff, and revision log workflows.
- Automatic refresh on repository state changes.
