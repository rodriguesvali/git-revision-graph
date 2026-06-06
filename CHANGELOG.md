# Changelog

All notable changes to this project will be documented in this file.

## 0.0.39

### Reliability & Maintainability

- Refined revision graph orchestration, fetch handling, current `HEAD` actions, reference workflows, and repository selection into smaller behavior-preserving units.
- Split revision graph backend responsibilities across narrower log, diff/detail, merge-analysis, snapshot, and cache boundaries.
- Reduced Compare Results and Show Log presenter coupling by moving message dispatch, state mapping, clipboard, restore, reset, remote-commit, compare, file-action, and refresh policies into focused helpers.
- Hardened webview host boundaries with explicit script-only options, denied local resource roots, and shared nonce/CSP construction.
- Centralized shared helpers for abort errors, Git error details, Git exit-code checks, remote-name normalization, short commit hash labels, renamed-file target paths, and clipboard writing.

### Quality

- Expanded focused regression coverage around the extracted controller, ref action, backend, webview, Show Log, Compare Results, error, and test fixture boundaries.
- Shared repeated test fixtures for revision log entries, compare result items, Git-like errors, and package manifest loading.
- Version bump to `0.0.39` has been applied in `package.json` and `package-lock.json`; VSIX packaging, manual smoke validation, and Marketplace publication are complete.

## 0.0.38

### Performance & Reliability

- Removed incremental revision graph update paths so repository changes, graph actions, scope changes, and manual reloads all use the full graph load path.
- Removed host and webview metadata/workspace patch message handling in favor of complete graph state reloads.
- Prepared repository event suppression before explicit Git mutations so graph actions avoid scheduling an early event-driven load followed by a later explicit load.
- Kept prepared repository event suppression active through the suppression window so repeated repository `state` or `checkout` events from one operation do not schedule extra graph loads.

### Quality

- Added refresh controller coverage for load-only refresh behavior and repeated follow-up event suppression.
- Added ref action coverage to assert explicit Git mutations prepare refresh suppression before push/pull-style operations and refresh only after the mutation completes.
- Added webview shell coverage that locks the absence of incremental revision graph patch handlers.
- Version bump to `0.0.38` has been applied in `package.json` and `package-lock.json`; VSIX packaging, manual smoke validation, and Marketplace publication remain with the maintainer.

## 0.0.37

### Workflow & UX

- Moved `Compare Results` and `Show Log` from left-side Activity Bar review views into on-demand editor panels, matching the central placement of the main revision graph.
- Harmonized the revision graph toolbar so search, repository actions, and main zoom controls use consistent grouped toolbar styling.
- Replaced search navigation, clear, and main zoom text glyphs with consistent SVG toolbar icons.
- Distinguished merge commits in the Show Log compact graph with a larger double-ring marker, made simple commit markers solid, and stopped the first visible lane at the top commit.
- Added a Source Control-style hover tooltip for Show Log commits with author, refs, message, stats, co-author, short-hash details, copy-hash, and GitHub commit actions.
- Redesigned Compare Results as a compact review queue with directional comparison context, status filters, explicit counts, rename paths, and centered row action menus.
- Removed the revision graph toolbar workspace-status LED and its redundant shortcut to open Source Control.
- Extended remote branch checkout with an explicit `Override branch if exists` option so existing local branches, including the currently checked-out branch, are only reset when that option is selected.

### Quality

- Updated manifest coverage to assert that Compare Results and Show Log are no longer contributed as Activity Bar webviews.
- Added webview shell coverage for the new toolbar grouping and icons.
- Added Show Log state and webview coverage for merge-commit metadata, merge markers, and top-row lane endpoint rendering.
- Added Show Log state, webview shell, message validation, and GitHub remote URL coverage for commit hover tooltip rendering and actions.
- Added Compare Results webview coverage for the dense review layout, status filters, single-result selection, rename presentation, and visible actions.
- Removed the obsolete graph webview `open-source-control` message contract and added coverage that keeps the workspace-status LED out of the toolbar.
- Added remote checkout regression coverage for the `Override branch if exists` option across existing and currently checked-out local branches.
- Version bump to `0.0.37` has been applied in `package.json` and `package-lock.json`; VSIX packaging, manual smoke validation, and Marketplace publication remain with the maintainer.

## 0.0.36

### Highlights

- Replaced the experimental Git-aware layout path with a `d3-dag` Sugiyama layout over the major-operations projection, improving graph ordering consistency while keeping merge, fork, root, tip, and referenced commits visible.
- Added virtualized graph rendering so large revision graphs render only the visible node and edge window instead of pushing the entire scene into the DOM at once.
- Moved cache-miss `d3-dag` layout calculation to a Node worker thread so expensive layout work no longer blocks the VS Code extension host thread.

### Performance & Reliability

- Tuned the `d3-dag` decrossing phase with fewer default two-layer passes and a faster DFS decross path for very wide layers.
- Added render request stale guards so obsolete async refresh results are discarded before they can apply stale state or snapshot side effects.
- Propagated refresh cancellation through graph scene layout so superseded renders can terminate layout worker work.
- Updated layout cache keys for the new `d3-dag` strategy so older persisted positions are not reused.

### Quality

- Added regression coverage for the `d3-dag` layout path, worker-thread layout execution, wide fan-out graphs, cache identity, render coordination, and virtualized webview rendering.
- `npm run build`, `npm test`, `git diff --check`, and VSIX packaging verification for the `0.0.36` release candidate are recorded in `project-context/3.deliver/release.md`.
- Version bump to `0.0.36` has been applied in `package.json` and `package-lock.json`.
- Manual smoke validation and Marketplace publication remain with the maintainer.

## 0.0.35

### Fixes

- Fixed Git-aware revision graph row ordering so projected descendants always render above their visible parents.
- Prevented shared structural ancestors from appearing between descendants in contradictory vertical positions.

### Quality

- Added regression coverage for structural ancestor row monotonicity.
- Layout cache keys now use `git-aware-v3` so older persisted positions are not reused for the corrected strategy.
- Version bump, VSIX packaging, and Marketplace publication remain with the maintainer.

## 0.0.34

### Release Preparation

- Version bump to `0.0.34` has been applied in `package.json` and `package-lock.json`.
- Release readiness artifacts have been updated for `0.0.34`.
- Marketplace publication remains with the maintainer.

## 0.0.33

### Highlights

- Replaced the generic ELK layout path with a deterministic Git-aware graph layout that keeps the primary trunk stable, balances side branches around it, and centers cards with different widths on their lane coordinates.
- Improved large-repository performance by removing the `elkjs` runtime dependency, replacing quadratic primary-ancestor path state with compact next pointers, and reducing initial webview render work.
- Added `Reset to this` to Show Log commits so a clean current local branch can be reset to a selected commit after confirmation.
- Added explicit `Remote` actions for the current tracked local `HEAD`: pull, push, and sync.

### Workflow & UX

- Replaced the old graph coordinate mutation workflow with `Center HEAD`, preserving graph layout while letting users quickly return to the current branch tip.
- Added reset zoom controls between zoom-out and zoom-in in both the graph toolbar and minimap.
- Added Show Log commit `Compare with Worktree` for single-commit actions, while two-commit selections now show only the unambiguous `Compare` action.
- Added normal, force-with-lease, and force push choices for tracked local branches, with destructive confirmation for force modes.
- Restoring Source Control after closing secondary review views no longer forces a graph reload when the graph state can be preserved.

### Quality

- Marketplace README now explicitly explains that, since `0.0.31`, the graph is launched from VS Code Source Control instead of a dedicated primary Activity Bar icon.
- Added regression coverage for Git-aware trunk placement, side descendant layers, oversized graph layout, centered cards, zoom reset controls, Show Log reset/compare actions, and tracked-branch remote operations.
- `npm run build`, `npm test`, `git diff --check`, and VSIX packaging verification for `0.0.33` are recorded in `project-context/3.deliver/release.md`.
- Version bump to `0.0.33` has been applied in `package.json` and `package-lock.json`.
- Marketplace publication remains with the maintainer.

## 0.0.32

### Workflow & UX

- Restored `Reload` inside the editor graph toolbar so users can manually refresh the revision graph after the move to the Source Control-launched editor panel.

### Quality

- Webview coverage now locks the restored `Reload` button markup, message wiring, and busy-state handling.
- `npm run build`, `npm test`, and `git diff --check` verification for the editor panel `Reload` action is recorded in `project-context/3.deliver/release.md`.
- Version bump to `0.0.32` has been applied in `package.json` and `package-lock.json`.
- VSIX packaging and Marketplace publication remain with the maintainer.

## 0.0.31

### Highlights

- Repositioned Git Revision Graph around VS Code Source Control: `View Git Revision Graph` now opens or reveals the full-size revision graph in an editor panel.
- Removed the primary graph Activity Bar view and the temporary Source Control companion graph view so there is one clear graph workspace.
- Kept Compare Results and Show Logs as on-demand secondary review views with explicit Activity Bar labels: `Git Revision Graph - Compare` and `Git Revision Graph - Show Logs`.
- Added light and dark Source Control toolbar icons for the graph entry point.

### Workflow & UX

- Closing the editor graph panel now closes Compare Results and Show Log review views instead of leaving stale dependent surfaces open.
- Closing the last secondary review view now returns the workbench to Source Control rather than falling back to Explorer.
- Compare Results file rows now support double-clicking to open the primary file diff.
- Show Log changed-file rows now support double-clicking to open file diffs from the compact history view.
- Compare Results file actions now use `Compare` as the primary action and show `Compare with Worktree` only when it adds a distinct workflow.
- The graph `View` menu now includes a persisted `Show Minimap` option for hiding or restoring the minimap without resetting graph layout.

### Quality

- Graph layout state now checks the saved scene layout key before reuse, reducing stale layout restoration after graph structure changes.
- Manifest coverage now locks the Source Control toolbar entry, editor graph command, secondary review view labels, and removed side-bar graph contributions.
- Webview coverage now locks Compare Results double-click behavior, Show Log double-click behavior, and minimap preference persistence.
- `npm run build` and `npm test` verification for the final `0.0.31` documentation pass is recorded in `project-context/3.deliver/release.md`.
- Version bump to `0.0.31`, VSIX packaging, and Marketplace publication remain with the maintainer.

## 0.0.30

### Highlights

- Added Show Log text filtering across commit metadata, hashes, authors, messages, and references.
- Added Show Log commit comparison through the existing Compare Results view.
- Added Show Log commit-to-worktree comparison from selected commits.
- Added kind-aware Show Log reference badges for `HEAD`, branches, remotes, tags, and stash refs.

### Refresh & Layout

- Local branch deletion now uses a full revision graph rebuild so destructive ref mutations do not leave stale graph topology behind.
- Pull-based sync now uses a full graph rebuild so `HEAD`, visible refs, and topology can advance beyond the current snapshot.
- Push-only sync keeps the lighter metadata-patch refresh path.
- Graph, Show Log, and Compare Results view focus is coordinated so secondary views can take focus while the graph is temporarily hidden.

### Quality

- Normal Show Log commit clicks now update the commit comparison selection while preserving expand/collapse behavior.
- Debounced Show Log filter messages are scoped to the active Show Log source, preventing stale filter text from applying after switching sources.
- `npm run build` passed after the 0.0.30 version bump.
- `npm test` passed with 269 tests after the 0.0.30 version bump.
- Manual Extension Development Host smoke testing is still recommended before Marketplace publication.
- Version bump to `0.0.30` has been applied in `package.json` and `package-lock.json`.
- Marketplace publication remains with the maintainer.

## 0.0.29

### Highlights

- Added an `origin/HEAD` graph scope for focusing on the default remote trunk and its descendant refs.
- Made descendant refs part of the core `Current Branch` scope behavior and removed the former descendant view option.
- Added current-branch workspace reset actions, with a separate confirmed option to remove untracked files.

### Workflow & UX

- Merge conflicts now keep the user in the graph surface: the conflict LED and `Abort Merge` action appear without automatically opening Source Control.
- Local current-branch tips that descend from `origin/HEAD`, such as `master-copy`, are now visible in the `origin/HEAD` scope.

### Quality

- `npm run build` passed for the 0.0.29 release candidate.
- `npm test` passed with 253 tests for the 0.0.29 release candidate.
- Manual Extension Development Host smoke testing is still recommended before Marketplace publication.
- Version bump to `0.0.29` has been applied in `package.json` and `package-lock.json`.

## 0.0.28

### Highlights

- Added conflicted-merge recovery from the graph toolbar, with `Abort Merge` shown only while a real conflicted merge is in progress.
- Added `Copy ref name to clipboard` to graph reference context menus.
- Added optional descendant reference visibility for `Current Branch` scope.
- Removed the low-value `Show Branchings & Merges` graph view option to keep the default graph path simpler and more stable.

### Performance & Refresh

- Improved local checkout refreshes by patching visible ref metadata without rebuilding graph topology when the target commit is already loaded.
- Improved local branch deletion responsiveness by removing the deleted branch line from the existing card through a direct reference patch.
- Updated merge-conflict and successful abort flows to patch workspace state without rerendering the graph.
- Expanded graph cache architecture for safer snapshot reuse and metadata freshness.
- Added five more main graph zoom-out levels for large graph navigation.

### Quality

- `npm run build` passed for the 0.0.28 release candidate.
- `npm test` passed with 246 tests for the 0.0.28 release candidate.
- Manual Extension Development Host smoke testing is still recommended before packaging or Marketplace publication.
- Version bump to `0.0.28` has been applied in `package.json` and `package-lock.json`.

## 0.0.27

### Highlights

- Focused the release on stabilization, hardening, and graph readability instead of broad new feature scope.
- The revision graph now starts in `Current Branch` scope by default, while switching scope or view options reloads the graph snapshot when needed so `All Refs` and other filters reflect the selected data set.
- Improved refs-only graph readability after merges by hiding unreferenced merge connector cards while preserving the lines that show which visible branches were merged.
- Stabilized graph layout identity so refreshed graphs discard stale node offsets when topology or layout rules change.

### Stability & Security

- Hardened targeted Git CLI calls with safer revision argument handling for unusual or option-like ref names.
- Added timeout and output-budget safeguards around expensive Git command paths, including graph loading, logs, diffs, commit details, fetch-with-tags, ref content, and compare restore.
- Guarded compare restore writes and deletes so file operations stay inside the selected repository.
- Tightened graph, compare results, and Show Log webview message validation with shared payload size budgets.
- Preserved the current graph viewport when zooming from toolbar buttons instead of recentering the graph.

### Performance & Cache

- Added graph snapshot cache tracing for hits, misses, and bypasses.
- Reused completed graph snapshot cache entries for cancelable refreshes without sharing cancelable in-flight Git work.
- Avoided redundant persisted layout-cache writes when the serialized cache payload is unchanged.
- Bounded Show Log expanded-change caching with recency refresh behavior.

### Quality

- Added regression coverage for Git command timeouts and output caps, option-like revisions, compare restore containment, oversized webview messages, graph zoom viewport preservation, snapshot cache reuse, Show Log cache bounding, topology-aware layout keys, refs-only merge simplification, default `Current Branch` graph loading, and snapshot reloads after projection option changes.
- `npm run build` passed.
- `npm test` passed with 232 tests.
- Production dependency audit reported 0 vulnerabilities; dev-tooling audit still reports moderate transitive findings through `@vscode/vsce -> @azure/msal-node -> uuid`.

## 0.0.26

### Highlights

- Improved revision graph readability with single-bend edge routing that approaches cards diagonally and closes connections vertically near the target.
- Added dynamic vertical spacing for real fan-out areas, including upward fan-outs, while keeping near-linear history chains compact.
- Added same-row card overlap protection for initial graph layout and client-side `Reorganize`.

### Workflow & UX

- Empty graph viewport space now uses the normal cursor instead of the open-hand drag cursor.
- Existing saved node offsets are invalidated when corrected card positions or widths change, preventing stale persisted layouts from reintroducing card overlaps.

### Quality

- Added regression coverage for single-bend edge paths, parent-to-descendant visual edge direction, fan-out vertical clearance, same-row overlap prevention, reorganize spacing, layout-key invalidation, and viewport cursor behavior.

## 0.0.25

### Stability

- Hardened large-repository graph loading by bounding persisted layout-cache payloads and clearing oversized cache entries from VS Code workspace state.
- Added a deterministic iterative lane-layout fallback for cases where ELK reports `Maximum call stack exceeded`, so the graph can still render instead of failing the load.

### Quality

- Added regression coverage for oversized persisted layout-cache rejection.

## 0.0.24

### Highlights

- Improved revision graph organization by preserving ELK layered vertical placement, producing a layout that is closer to dedicated Git graph tools for complex repositories.
- Added persisted ELK layout caching so repeated loads of the same graph topology can reuse previously calculated positions instead of recalculating the expensive layout.
- Added 10 more minimap zoom levels for finer navigation in large revision graphs.

### Performance & Refresh

- Metadata-only checkout updates now avoid full graph reloads when off-snapshot non-HEAD refs are not visible in the current graph.
- `Sync with...` now uses metadata patches after push-only and pull-only syncs, while keeping full rebuilds for diverged histories.
- Initial graph snapshot loading now starts repository ref loading and the graph `git log` command concurrently.
- Minimap viewport movement now avoids unnecessary full SVG rebuilds and batches minimap synchronization through animation frames.
- Added opt-in graph load timing diagnostics through `gitRevisionGraph.traceLoading`, writing phase timings to the `Git Revision Graph` output channel when enabled.

### Workflow & UX

- Removed the redundant internal `Fetch` button from the graph toolbar; the external VS Code view title action remains available for fetching the current repository.
- Kept graph loading diagnostics disabled by default so regular users do not see diagnostic output unless they explicitly enable it.

### Quality

- Added regression coverage for layout row reuse, independent-chain layering, checkout metadata patch fallback behavior, sync refresh intents, minimap sync throttling, webview toolbar cleanup, graph load tracing, and ELK layout cache restoration.
- Updated release readiness artifacts for `0.0.24` with verification, rollback, and Marketplace-readiness notes.

## 0.0.23

### Workflow & UX

- Remote branch checkout now offers an explicit confirmation path to overwrite an existing non-current local branch name before checking it out and configuring upstream tracking.
- Remote branch deletion, remote tag deletion, remote-name discovery, and graph fetch without tag fetching now use the `vscode.git` API instead of direct Git CLI calls.
- Graph fetch with `Tags` and remote tag publication checks remain targeted Git CLI fallbacks because the public `vscode.git` API does not expose equivalent operations.
- The minimap now preserves graph proportions for small repositories instead of stretching narrow graphs to fill the overview.
- Webview-to-extension-host messages are now validated before dispatch, and graph actions are checked against the current graph state before running host-side Git workflows.
- Branch creation now applies Git-style branch-name validation before calling Git, and webview CSP nonces are generated with cryptographic randomness.
- The revision graph title now uses `Git Revision Graph` casing and shows the real-case repository name before the real-case branch name.

### Quality

- Added regression coverage for confirmed overwrite, canceled overwrite, current-branch protection, remote delete refspecs, remote-name discovery, fetch API routing, proportional minimap scaling, branch-name validation, webview message validation, cryptographic nonce generation, title casing, and the existing remote tracking branch creation path.

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
- The primary graph view is now labeled `Graph`, reducing title repetition inside the `Git Revision Graph` container.
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

- Initial public release of Git Revision Graph.
- Dedicated revision graph webview for Git references.
- Compare between references and against the worktree.
- Checkout, merge, delete, unified diff, and revision log workflows.
- Automatic refresh on repository state changes.
