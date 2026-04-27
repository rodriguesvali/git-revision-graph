# Release 0.0.22 Prioritization

## Intent

Version `0.0.22` should be a focused UX polish release for the existing graph, compare, and log workflows.

The release should avoid adding a new Git mutation workflow by default. The product already has compare, checkout, branch, tag, publish, sync, merge, delete, diff, and log actions; the next user-value step is making those workflows easier to discover, safer to execute, and less visually dense.

## Inputs Reviewed

- `package.json` baseline version `0.0.21`
- `README.md` current feature set and next-step list
- `docs/revision-graph-parity-plan.md` UX and navigation targets
- `project-context/3.deliver/release.md` current release readiness state
- Revision graph shell, styles, browser-side interactions, controller message handling, compare results webview, and show log webview source

## Product Observations

- The graph toolbar is doing too much at once: scope, four visibility toggles, search, workspace state, fetch, layout, and zoom all compete in a fixed top band.
- The graph context menu is now feature-rich, but it is a flat list with no grouping, separators, keyboard focus handling, or destructive-action emphasis.
- Two-reference selection is powerful but too hidden. The user must know to Ctrl/Cmd-click, then right-click one of the selected items to reveal compare, log, and unified diff.
- The compare results and show log webviews have more mature context-menu structure than the primary graph menu, including submenu patterns and keyboard-oriented affordances.
- The revision graph had a `syncMinimap()` hook but no real minimap/overview implementation before this polish pass.
- Copying a commit hash from the graph is silent, while most Git workflows use native VS Code messages for completion or failure.
- Empty graph states are text-only even when the next action is obvious, such as choosing a repository.

## Recommended Scope

### 1. Graph Context Menu Polish

Refactor the primary graph context menu into grouped sections:

- Inspect: show log, unified diff, copy commit hash
- Compare: compare selected, compare with worktree
- Create and publish: create branch, create tag, publish branch, push tag
- Branch operations: checkout, sync, merge
- Destructive: delete branch, delete tag, delete remote branch, delete remote tag
- Selection: clear selection

Add separators, clamp the menu inside the viewport, focus the first item when opened by keyboard, and visually separate destructive actions.

Why it matters:

- The menu has grown past the point where a flat list feels safe.
- Destructive operations become easier to distinguish.
- The graph menu catches up to the compare/log webview menu quality.

### 2. Toolbar Density Reduction

Keep search first-class, but move lower-frequency visibility toggles into a compact view-options control.

Recommended shape:

- Keep scope, search, workspace status, fetch, layout, and zoom visible.
- Move tags, remote branches, stash, and branching/merge visibility into a `View Options` popover/menu.
- Shorten button text where the icon and tooltip are clear.
- Revisit `--toolbar-safe-height` after consolidation so the graph loses less vertical space on narrow sidebars.

Why it matters:

- The current toolbar can consume a large vertical band, especially under 820px width.
- Users need search and action controls more often than every visibility toggle.
- The graph itself should remain the dominant surface.

### 3. Feedback And Empty-State Polish

Add small feedback improvements:

- Show a native information message after copying a commit hash.
- Add actionable empty-state buttons for choosing a repository when repositories exist.
- Consider a non-blocking in-webview status chip for graph-only actions such as layout reset, zoom reset, and selection changes.
- Ensure canceled native prompts restore the graph from loading state consistently.

Why it matters:

- Silent actions feel broken even when they succeed.
- Empty states should invite the next action instead of only describing it.
- The user should never wonder whether a click was accepted.

### 4. Real Minimap / Overview

Implement the documented overview target by replacing the current empty `syncMinimap()` hook with a small minimap that shows graph bounds, the viewport rectangle, and click/drag navigation.

Why it matters:

- Larger graphs need orientation as much as cleaner actions.
- The minimap makes pan and zoom state visible.
- Click/drag navigation reduces the need for long manual scrolling.

## Out Of Scope By Default

- Version bump, VSIX packaging, or Marketplace publishing without explicit approval.
- New Git mutation workflows.
- Full-history rendering beyond the bounded recent-commit window.
- Replacing the graph model, projection layer, or layout engine.
- Adding new runtime dependencies unless explicitly approved.

## Suggested Release Narrative

`0.0.22` should position itself as the release that makes the graph easier and safer to use:

- calmer graph menus
- less crowded toolbar
- easier large-graph navigation
- more reassuring feedback

## Acceptance Criteria

- Graph context menu actions are grouped and destructive actions are visually separated.
- The toolbar remains usable in narrow VS Code sidebars without crowding the graph as much as the current version.
- The minimap shows graph shape, viewport bounds, and supports click/drag navigation.
- Copy hash and obvious empty-state actions provide visible feedback.
- Existing compare, checkout, branch, tag, publish, sync, merge, delete, diff, log, search, refresh, repository selection, and multi-repository behavior remain unchanged.

## Verification Plan

- `npm run build`
- `npm test`
- Manual Extension Development Host smoke:
  - Open a workspace with no Git repository and verify the empty state.
  - Open a workspace with one repository and verify toolbar layout at narrow and wide sidebars.
  - Open a workspace with multiple repositories and verify repository selection still works.
  - Select one graph target and verify the grouped context menu.
  - Select two graph targets and verify compare, show log, unified diff, and clear selection from the grouped context menu.
  - Navigate a larger graph with the minimap by clicking and dragging the overview.
  - Verify destructive menu items remain confirmed by native VS Code dialogs.
  - Verify copy commit hash gives feedback and writes the expected hash.
  - Verify compare results and show log views still open and operate normally.
