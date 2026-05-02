# Frontend

## Scope
Revision graph webview, compare/log webview surfaces, browser-side graph interactions, theming, layout, filters, context menus, and user-visible copy.

## Inputs
Use `README.md`, `docs/revision-graph-parity-plan.md`, feature artifacts in `project-context/2.build/features/`, and existing webview code as sources.

## Changes
Record frontend changes here only when they affect shared webview behavior. Prefer feature-specific files under `project-context/2.build/features/` for individual feature notes.

- 2026-05-01 `0.0.27` stabilization: toolbar zoom now preserves the current graph viewport instead of recentering the graph, fixing a pre-existing issue when zooming while scrolled below the top.
- 2026-05-02 `0.0.27` graph layout stabilization: scene layout identity now includes a fan-out balance version and edge topology so normal refresh/update paths discard stale node offsets and converge with full rebuild disposition.
- 2026-05-02 `0.0.27` refs-only merge simplification: the default graph now hides unreferenced merge connector cards while preserving merged-branch lines from visible merge commits.
- 2026-05-02 `0.0.28` default scope reversal: new revision graph sessions now start with `All Refs` again.
- 2026-05-02 `0.0.28` current scope refinement: the `View` menu now includes `Show Current Branch Descendants` only for `Current Branch`, which lets that scope include visible references whose tips descend from the current `HEAD` while excluding unrelated sibling refs.
- 2026-05-02 `0.0.28` view simplification: removed the `Show Branchings & Merges` option from the `View` menu and from projection options so graph loading no longer switches into the sparse branch/merge topology path.

## Verification
- Run `npm run build`.
- Run `npm test` for graph state, render coordination, controller, or behavior changes.
- Manually verify affected graph interactions in an Extension Development Host when changing webview behavior.

Latest automated verification:

- `npm run build` passed.
- `npm test` passed with 235 tests.

## Decisions
- Keep UI aligned with VS Code workbench conventions and theme variables.
- Preserve existing webview surface rather than adding new persistent webviews unless explicitly scoped.

## Handoff Notes
Document changed files, user-facing behavior, known browser-side state risks, and manual validation performed.

## Known Gaps
Manual VS Code webview validation is still needed for many UI regressions.
Manual validation is specifically pending for the TensorFlow fan-out area before and after fetch/update.
Manual validation is specifically pending for a local branch after merging multiple branches into it in the refs-only graph.
Manual validation is specifically pending for descendant references in the `Current Branch` scope.
