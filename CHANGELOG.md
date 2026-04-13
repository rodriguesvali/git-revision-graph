# Changelog

All notable changes to this project will be documented in this file.

## 0.0.13

### In Progress

- Release planning for `0.0.13` started. New changes will be documented in this section as the cycle moves forward.
- Improved the initial Revision Graph load so the webview shell appears immediately with explicit loading feedback instead of staying blank during heavier graph rebuilds.

## 0.0.12

### New Feature

- **Reference Location Search (Toolbar)**  
  Users can now define a reference location directly from the toolbar search box, making navigation faster and more intuitive. This enhancement streamlines workflows by allowing quick access to location-based context without leaving the main interface.

### Improvements

- Enhanced layout and organization of cards for better visual clarity and usability
- Minor UI refinements to improve overall user experience

### Fixes & Stability

- General bug fixes to improve system stability
- Performance optimizations across key components

## 0.0.11

This release focuses on stability and release readiness for the Revision Graph experience.

### Highlights

- Replaced fixed-buffer Git process execution with a streaming implementation so large diffs and commit views are more reliable in bigger repositories.
- Fixed revision graph repository selection so canceling the picker in multi-repository workspaces keeps the current state without unexpectedly reopening the prompt.
- Hardened local branch creation from existing branches and tags so the flow no longer fails when Git reports that the new branch has no upstream configured.
- Updated the revision graph refresh pipeline to cancel stale renders and obsolete background Git work, improving responsiveness during rapid refreshes.
- Added output bounds and extra safeguards around graph snapshot loading to reduce extension-host memory pressure in heavier repositories.

### Quality

- Added regression coverage for large Git output handling, Git error propagation, revision graph render cancelation, multi-repository open behavior, and branch creation edge cases.

### Result

- `0.0.11` delivers a more predictable and resilient Revision Graph experience, especially in larger repositories and multi-repository workspaces.

## 0.0.9

- Repositioned the workspace status LED 30px to the left for a cleaner top-right layout in the revision graph.
- Replaced deprecated Git refs access with `repository.getRefs()` to align the extension with the current VS Code Git API and reduce extension host deprecation warnings.

## 0.0.8

- Improved delete actions for branches and tags by showing clearer, ref-specific labels such as `Delete Branch: <name>` and `Delete Tag: <name>`.
- Added a workspace status LED to the top-right corner of the revision graph to indicate whether the repository is clean or has pending changes.
- When the workspace has pending changes, the red status LED now opens Source Control Changes directly.
- Added descriptive tooltips to the workspace status indicator for both clean and dirty states.
- Refined the workspace status LED visuals with brighter colors and updated sizing for better visibility.

## 0.0.7

- Improved branch lifecycle workflows by preventing local branch creation from inheriting unintended upstream tracking, which also avoids surprising delete behavior later.
- Refined deletion of tracked local branches with clearer confirmations, better error details, and a guided `Force Delete` fallback when the branch is not fully merged into its upstream.
- Unified error reporting across the extension so Git and shell failures now surface richer details such as stderr output, Git error codes, and exit codes.
- Added conflict-aware workspace protections that block workspace-changing actions while conflicts or pending changes remain unresolved.
- When merge or sync operations stop on conflicts, the extension now directs the user to Source Control automatically without opening files on their behalf.
- Updated the board context menu shortcut labels for zoom actions to better match the intended keyboard hints.

## 0.0.6

- Refined selection highlighting to follow the primary ancestor and descendant path instead of emphasizing every reachable side branch.
- Reduced visual noise in larger repositories by isolating the main stack related to the selected reference.
- Improved graph inspection around the selected reference by keeping connector and card highlights focused on the path that most directly impacts the current result.

## 0.0.5

- Added relationship highlighting from the first selected reference, emphasizing ancestor and descendant connectors and adding related card borders for easier graph inspection.
- Improved selection behavior by allowing a second click on the same reference to clear the active selection.
- Added a loading overlay during ancestor filtering and clarified context menu labels when a filter is already active.
- Updated the board to automatically reorganize the graph whenever its data is refreshed, keeping the layout cleaner after load, filter, and repository updates.

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
