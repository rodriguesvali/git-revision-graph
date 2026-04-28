# Changelog

All notable changes to this project will be documented in this file.

## 0.0.23

### Workflow & UX

- Remote branch checkout now offers an explicit confirmation path to overwrite an existing non-current local branch name before checking it out and configuring upstream tracking.
- Remote branch deletion, remote tag deletion, remote-name discovery, and graph fetch without tag fetching now use the `vscode.git` API instead of direct Git CLI calls.
- Graph fetch with `Tags` and remote tag publication checks remain targeted Git CLI fallbacks because the public `vscode.git` API does not expose equivalent operations.
- The minimap now preserves graph proportions for small repositories instead of stretching narrow graphs to fill the overview.
- Webview-to-extension-host messages are now validated before dispatch, and graph actions are checked against the current graph state before running host-side Git workflows.
- Branch creation now applies Git-style branch-name validation before calling Git, and webview CSP nonces are generated with cryptographic randomness.

### Quality

- Added regression coverage for confirmed overwrite, canceled overwrite, current-branch protection, remote delete refspecs, remote-name discovery, fetch API routing, proportional minimap scaling, branch-name validation, webview message validation, cryptographic nonce generation, and the existing remote tracking branch creation path.

## 0.0.22

### Highlights

- Polished the Revision Graph experience with cleaner grouped context menus, destructive-action separation, and reduced visual density in the toolbar.
- Added a real graph minimap for larger repositories, including proportional rendering, viewport bounds, click/drag navigation, internal scrolling, and dedicated minimap zoom controls.
- Moved lower-frequency graph visibility toggles into a compact `View` options menu while keeping scope, search, fetch, layout, and zoom actions available from the toolbar.

### Workflow & UX

- Copying a commit hash now shows native VS Code feedback.
- Empty repository states now provide an actionable `Choose Repository` path when a workspace has available repositories.
- Mouse-opened context menus no longer show a misleading initial focus highlight.
- The minimap is tuned for tall repositories, avoids the graph scrollbars, and keeps the graph viewport scrollbars aligned with the map edges.
- Published tags now resolve remote tag state on demand so the graph offers remote deletion instead of a misleading `Push Tag to Remote` action.

### Quality

- Added and updated webview coverage for grouped menus, compact view options, minimap navigation, minimap zoom controls, remote tag action resolution, empty-state recovery, and viewport preservation.

## 0.0.21

### Highlights

- Added `Publish Branch to Remote` to the Revision Graph context menu for local branches.
- Publishing a local branch now lets users choose a remote, confirms the push, and configures upstream tracking through the VS Code Git API.
- Branches with inherited or mismatched upstream tracking can be published to their matching remote branch, with confirmation text explaining the tracking update.

### Workflow & UX

- The publish action is hidden once a local branch already tracks its matching remote branch.
- `Sync` is only offered when the current branch tracks the matching remote branch, preventing accidental sync with an inherited upstream from the source branch.
- Local branches created from local refs or commits continue to clear inherited upstream tracking, while local branches created from remote refs keep intentional tracking.

### Quality

- Added regression coverage for local branch publish, inherited upstream handling, publish action visibility, sync action visibility, and graph state metadata.

## 0.0.18

### Highlights

- Improved revision graph refresh efficiency by reusing clean graph snapshots for projection-only changes instead of reloading Git history unnecessarily.
- Added a snapshot reload semaphore so repository state and checkout events can patch metadata first, falling back to a full rebuild only when the graph snapshot is stale.
- Strengthened the Activity Bar icon by scaling the contributed SVG artwork by about 30% inside its existing 24px icon box.

### Quality

- Added regression coverage for snapshot reload gating and metadata patch fallback when refs point to commits missing from the current snapshot.
- Fixed the `npm test` script to match the repository's flat compiled test layout without relying on shell-specific glob expansion.

## 0.0.17

### Highlights

- Added an on-demand `Show Log` view so selected refs, commits, and `base..compare` pairs can be reviewed in a denser history surface without leaving the extension.
- Added automatic paging to `Show Log`, replacing the manual `Load More` step with end-of-scroll loading for longer histories.
- Expanded `Show Log` file review actions with context-menu support, including `Open Diff`, `Compare with Worktree`, and clipboard helpers for file name and full path.

### Workflow & UX

- `Show Log` now supports both single-target history and explicit `base -> compare` range review, with clearer summaries that identify the comparison base directly in the header.
- The `Show Log` graph column now behaves like a real lane column: it can be widened by the user, hides overflowed lanes instead of scaling them, and keeps lane continuity during inline file expansion.
- Graph selection feedback is stronger, including more visible dual-selection highlighting and a larger external `(Base)` badge shared by referenced and unreferenced nodes.
- The revision graph loading overlay no longer leaves stale status text blurred underneath while a blocking refresh is in progress.

## 0.0.16

### Highlights

- Started the next graph-focused release after the recent compare, commit-action, and selection UX refinements.
- Reworked `Compare Results` into a dedicated webview so the file list now has a fixed inline filter box above the results, along with context-menu compare and restore actions.
- `Compare Results` now stays hidden until a compare produces results, and the title action now closes the view instead of clearing the file list explicitly.
- Moved file actions inside `Compare Results` from inline buttons to a right-click context menu, reducing visual noise in large compare lists.
- Replaced the static `Graph` title with a dynamic `Branch: <name>` header that follows the active `HEAD` branch.
- Added `Copy Commit Hash` to the graph context menu for any commit node, whether it carries a visible ref or not.
- Updated `Fetch` so each run can opt into `Prune` and `Tags` before contacting the remote.

### Workflow & UX

- Continue improving graph interaction quality, especially around commit selection, visual clarity, and low-friction daily review workflows.

## 0.0.15

### Highlights

- Refreshed the extension artwork by adding a new SVG source asset and updating the packaged PNG icon.
- Added context actions for compare result files to reopen the base diff, compare a result against the worktree, and restore worktree files to the selected revision.
- Added graph actions for visible unreferenced commits so they can be compared directly and used as branch starting points without creating a temporary ref first.

### Workflow & UX

- Defined the release around graph navigation, release workflows, and daily-driver UX polish.

## 0.0.14

### Highlights

- Added richer graph filtering so remote branches and stash refs can be shown or hidden directly from the toolbar alongside the existing scope, tags, and branch/merge controls.
- Added a persistent `Compare Results` view so branch-to-branch and branch-to-worktree comparisons stay available while reviewing multiple files.
- Added `Fetch` for the active repository directly from the graph view so remote refs can be refreshed without leaving the extension.

### Workflow & UX

- Compare result entries now prioritize the full repository-relative path, making large compare lists easier to scan when many files share the same name.
- The primary graph view is now labeled `Graph`, reducing title repetition inside the `GIT Revision Graph` container.
- The graph refresh flow now preserves viewport and selection more predictably after rebuilds when the effective layout is unchanged.
- Initial graph organization and manual `Reorganize` now use the same layout routine, keeping the graph presentation consistent.

### Stability

- Tightened refresh policy around mutating Git operations so `fetch`, `sync`, `merge`, and delete flows rebuild the graph safely instead of relying on optimistic metadata-only patches.
- Unified metadata patch fingerprinting with the same complete ref source used by the applied patch, preventing missing tag or remote decorations after lighter updates.
- Restored burst suppression for follow-up repository events while keeping abort handling explicit, improving refresh consistency during activation and repository churn.

### Quality

- Expanded regression coverage for compare presentation, refresh coordination, metadata patch correctness, loading modes, and graph layout behavior.

## 0.0.13

### Highlights

- Improved Revision Graph loading so the webview shell appears immediately with explicit feedback instead of staying blank during heavier graph rebuilds.
- Hardened graph refresh behavior during activation and checkout so the view no longer shows stale intermediate states or repeated loading cycles.
- Continued the TortoiseGit-inspired refinement pass with flatter cards, straighter edges, stash-aware refs, and a smarter `Reorganize` layout.

### UX & Visual

- Local branch refs now use a vivid green treatment so they stand apart more clearly from remote branches.
- Checkout actions now show the destination reference name directly in the UI, including the graph context menu and confirmation button label.
- The checkout action is hidden for the current local `HEAD` branch so the context menu no longer offers a no-op branch switch.
- Added explicit loading feedback while reorganizing the graph layout, and improved client-side layout responsiveness for larger graphs.
- Tightened ref grouping so `HEAD` no longer duplicates the same local branch line, and stash refs render as first-class graph labels.

### Stability

- Fixed checkout refresh sequencing so branch switches no longer render a graph based on the previous snapshot before the rebuilt graph is ready.
- Reduced redundant graph rebuilds when the view opens, when the active repository set changes, and when repository events race explicit refresh requests.
- Hardened controller-side follow-up refresh suppression so canceled or failed renders do not accidentally suppress legitimate repository events.

### Quality

- Added regression coverage around refresh coordination, reorganize behavior, checkout flows, stash-aware refs, and release-path UI updates.

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
