# Release 0.0.37 Prioritization

## Objective

Version `0.0.37` should be opened as a post-`0.0.36` product-polish and regression-control cycle.

The release should allow small visual and functional improvements from maintainer product review while still protecting the `d3-dag` layout, worker-thread layout execution, virtualized webview rendering, and stale render guard work prepared for `0.0.36`.

## Context

- Current package baseline: `0.0.36`.
- Target release: `0.0.37`.
- Product surface remains unchanged: `View Git Revision Graph` opens or reveals the singleton editor graph panel from Source Control or the Command Palette.
- Compare Results and Show Logs now open as on-demand editor review panels alongside the main revision graph.
- `0.0.36` introduced the largest recent graph-rendering and layout architecture change set, so `0.0.37` should still treat graph rendering, layout, cancellation, packaging, and large-repository responsiveness as release-risk areas.
- Maintainer decision on 2026-06-04: `0.0.37` is not stabilization-only. Small visual and functional improvements may be selected and implemented one at a time.

## Release Direction

Primary release themes:

- Validate and harden virtualized graph rendering across scrolling, zooming, minimap navigation, search highlighting, selection, metadata patches, and repository refreshes.
- Validate and harden worker-thread layout execution, including cancellation, fallback to synchronous layout, small-graph overhead, and packaged worker availability.
- Preserve stale render result guards so rapid refreshes, repository events, scope changes, and manual reloads do not apply obsolete graph state.
- Capture any manual smoke findings from the `0.0.36` VSIX as focused `0.0.37` fixes.
- Keep the release patch-sized by scoping maintainer-selected visual and functional improvements individually.

Potential bounded slices:

- Fix virtual window edge or node visibility defects found at unusual scroll and zoom positions.
- Improve layout worker fallback diagnostics if packaged or runtime worker startup failures are hard to diagnose.
- Add targeted regression coverage for any stale refresh, virtualization, or worker failure found during smoke validation.
- Add a small benchmark or fixture note for the standard large-repository smoke sample if the manual validation repository becomes repeatable.

## Exclusions

- No new commands, menus, view containers, or contribution points unless a specific regression requires it.
- No change to the Source Control/editor graph product surface.
- No broad graph renderer replacement.
- No full-history graph rendering promise beyond the bounded recent-commit window already documented in README.
- No dependency additions without explicit maintainer approval.
- No package version bump, VSIX packaging, or Marketplace publication without explicit maintainer approval.

## Release Narrative

`0.0.37` should read as a confidence and polish release after the `0.0.36` graph performance work.

User-facing message, if the cycle remains stabilization-focused:

- The graph remains faster and more responsive on large repositories.
- Scrolling, zooming, minimap navigation, search, and refresh behavior are more reliable after the virtualized rendering and worker-layout changes.
- Native VS Code Git workflows and the Source Control-launched editor graph surface are preserved.

## Acceptance Criteria

- `project-context/3.deliver/release.md` records the `0.0.37` readiness state, validation, packaging assumptions, Marketplace impact, monitoring focus, and rollback plan.
- Any implemented fixes have focused feature artifacts under `project-context/2.build/features/`.
- README and CHANGELOG are updated only when user-visible behavior or release notes change.
- Automated verification includes `npm run build`, `npm test`, and `git diff --check` before release preparation.
- Manual smoke validation covers the graph paths most affected by `0.0.36`: large graph loading, worker-layout misses, virtualization while scrolling and zooming, minimap navigation, search, scope switching, refresh, fetch, and stale-request cancellation.
- VSIX packaging is run only after maintainer approval.

## Verification Plan

Automated:

- `npm run build`
- `npm test`
- `git diff --check`

Manual Extension Development Host smoke test:

- Install or launch from a build equivalent to the current `0.0.36` baseline.
- Open a branch-heavy and merge-heavy repository.
- Launch `View Git Revision Graph` from Source Control.
- Confirm graph loading completes and the extension host remains responsive during uncached layout.
- Confirm scope changes, refresh, fetch, search, minimap navigation, scroll, zoom, `Center HEAD`, and selection highlighting behave normally.
- Confirm compare, compare with worktree, unified diff, Show Log, checkout, branch creation, tag creation, sync, merge, delete, reset, and conflict guards still work.
- Repeat with `gitRevisionGraph.traceLoading` enabled and capture any large outliers or missing worker-layout diagnostics.

## Risks

- Virtualized rendering defects may appear only at certain viewport sizes, scroll offsets, zoom levels, or search/selection states.
- Worker layout fallback may hide packaging or runtime worker failures unless diagnostics are explicit enough.
- Cache hits can mask cold-layout regressions during casual manual testing.
- A small stabilization cycle can grow if manual smoke validation reveals multiple unrelated regressions.

## Marketplace Notes

- Marketplace copy should stay close to the `0.0.36` performance narrative unless `0.0.37` adds a visible workflow improvement.
- Screenshots do not need to change for a stabilization-only patch.
- Review generated VSIX contents before publication if packaging is requested, especially compiled worker files under `out/revisionGraph/layout/`.
