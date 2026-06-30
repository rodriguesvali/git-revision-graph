# Release 0.0.36 Prioritization

## Objective

Version `0.0.36` should ship the graph performance and layout architecture work implemented after baseline `c4746ffe2b55a130183def5e95d366efaa4e17fd`.

The release should position the extension as more responsive on large revision graphs while preserving the existing Source Control-launched editor graph product surface and native VS Code Git workflows.

## Context

- Source baseline: `c4746ffe2b55a130183def5e95d366efaa4e17fd`.
- Current package baseline before release prep: `0.0.35`.
- Target release: `0.0.36`.
- Product surface remains unchanged: `View Git Revision Graph` opens or reveals the singleton editor graph panel from Source Control or the Command Palette.
- Compare Results and Show Logs remain on-demand Activity Bar review views.

## Release Scope

Primary release themes:

- Replace the prior Git-aware layout implementation with a `d3-dag` Sugiyama layout over the major-operations projection.
- Preserve important graph semantics in the projection: visible refs, merge commits, fork commits, roots, tips, and compressed hidden linear paths.
- Improve large-graph rendering responsiveness through webview virtualization.
- Move expensive `d3-dag` cache-miss layout calculation to a Node worker thread.
- Harden render refresh coordination so obsolete async results cannot apply stale state or snapshot side effects.
- Tune `d3-dag` decrossing to avoid pathological synchronous cost on very wide layers.

Supporting implementation work:

- Rename `projectTortoiseMajorOpsGraph` to `projectMajorOperationsGraph` to remove product-specific coupling from the projection API.
- Add layout cache invalidation for the `d3-dag` strategy.
- Add focused regression coverage for layout, worker execution, render coordination, cache identity, and webview virtualization.
- Record feature decisions in AAMAD build artifacts.

## Exclusions

- No new commands, menus, view containers, or contribution points.
- No change to the Source Control/editor graph product surface.
- No Marketplace publication without maintainer approval.
- No broader graph parity promise beyond the bounded recent-commit window already documented in README.
- No dependency expansion beyond the already-added `d3-dag` runtime dependency.

## Release Narrative

`0.0.36` is a performance and graph-readability release.

User-facing message:

- Large revision graphs should remain easier to navigate because the webview renders a virtualized graph window instead of the full scene DOM.
- Graph layout uses a more standard Sugiyama pipeline while preserving key Git operations as visible graph structure.
- Expensive layout misses run outside the VS Code extension host thread, reducing the chance that large graph layout blocks repository updates or graph actions.

## Acceptance Criteria

- Package metadata is bumped to `0.0.36`.
- CHANGELOG includes `0.0.36` release notes.
- README reflects the `d3-dag`, virtualized rendering, and worker-thread layout behavior without changing workflow promises.
- `project-context/3.deliver/release.md` records release readiness, validation, packaging assumptions, Marketplace impact, monitoring focus, and rollback plan.
- Automated verification includes `npm run build`, `npm test`, and `git diff --check`.
- VSIX packaging is run only after maintainer approval.
- Manual smoke validation covers large graph loading, repository switching, scope changes, search, minimap navigation, compare, Show Log, checkout, branch, sync, merge, delete, and reset flows.

## Verification Plan

Automated:

- `npm run build`
- `npm test`
- `git diff --check`

Manual Extension Development Host smoke test:

- Open a Git repository with branch-heavy and merge-heavy history.
- Launch `View Git Revision Graph` from Source Control.
- Confirm graph loading completes and the extension host remains responsive while layout is pending.
- Confirm scope changes, refresh, fetch, search, minimap, scroll, zoom, `Center HEAD`, and selection highlighting behave normally.
- Confirm compare, compare with worktree, unified diff, Show Log, checkout, branch creation, tag creation, sync, merge, delete, reset, and conflict guards still work.
- Repeat on a large fan-out repository or synthetic equivalent and watch `gitRevisionGraph.traceLoading` for layout and webview timing.

## Risks

- Worker-thread startup adds overhead for small uncached graphs; cache hits should still avoid the worker.
- Worker packaging must include the compiled worker file in the VSIX.
- Virtualized rendering may expose edge or node visibility bugs at unusual zoom/scroll positions.
- The `d3-dag` layout is visually different from the previous Git-aware layout and should be checked against branch-heavy repositories before publication.

## Marketplace Notes

- Marketplace copy can frame the release as graph performance, responsiveness, and layout-readability work.
- Screenshots do not need to change unless the maintainer wants to highlight large-graph virtualization.
- Review generated VSIX contents before publication to confirm compiled worker files are included under `out/revisionGraph/layout/`.
