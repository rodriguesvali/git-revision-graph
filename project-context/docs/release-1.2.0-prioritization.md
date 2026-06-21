# Release 1.2.0 Prioritization

## Objective

Open `1.2.0` as a performance-focused minor release after the `1.1.0` implementation baseline.

The release should reduce extension activation, package, graph-loading, and webview rendering cost while preserving the existing product surface and Git workflow semantics.

## Context

- Current package baseline before opening: `1.1.0`.
- Target release: `1.2.0`.
- The current graph already uses bounded history, cancellation, stale-render guards, worker-thread layout, persisted layout caching, load tracing, and virtualized graph DOM rendering.
- Opening measurements found a packaged VSIX of approximately 1.3 MB containing 718 files, 132 source maps, and 10 stale compiled JavaScript files.
- Runtime inspection found repeated ref loading within full graph state construction, full node/edge scans during virtual viewport frames, per-reference merge-base fallback processes, and complete Show Log state/DOM rebuilding.

## Release Direction

### Priority 0: activation and package hygiene

- Remove `onStartupFinished` and rely on implicit activation from the five contributed commands. Implemented with automated manifest coverage; fresh-profile Extension Development Host validation remains pending.
- Remove the obsolete `gitRefs.revisionGraphVisible` activation-time context reset for the removed side-bar graph surface. Implemented; editor graph smoke validation remains pending.
- Add deterministic `out/` cleanup before production builds. Implemented through the npm `prebuild` lifecycle; package-specific source-map and orphan enforcement remain pending.
- Exclude source maps and stale build output from the VSIX.
- Add regression checks for package metadata and orphaned compiled output.
- Evaluate bundling only after explicit maintainer approval for the required build dependency and worker-entry strategy.

### Priority 1: graph loading and refresh reuse

- Define a projection-only refresh path for options that do not require a new Git history query.
- Avoid duplicate repository ref reads inside one graph-load request.
- Reduce or aggregate merge-blocked ancestry fallback Git processes.
- Extend existing load tracing with counts for Git processes, ref reads, snapshot reuse, and host payload size where practical.

### Priority 2: webview frame and review-surface efficiency

- Index graph layouts by row or spatial range so viewport updates inspect nearby candidates rather than the full scene.
- Recompute full topology maps only when graph topology changes.
- Evaluate incremental or virtualized Show Log rendering and append-only load-more messages.
- Preserve minimap, search, selection, keyboard behavior, persisted offsets, and retained panel state.

## Sequencing

1. Package/activation baseline and deterministic cleanup.
2. Graph refresh intent and ref-loading reuse.
3. Git ancestry fan-out reduction.
4. Graph viewport indexing.
5. Show Log incremental rendering.

Each item should receive a focused feature artifact before implementation. Later items may be deferred if measurement shows that earlier slices deliver sufficient improvement for a safe minor release.

## Acceptance Criteria

- Version metadata reports `1.2.0`.
- The release readiness artifact records the cycle as open and not packaged or published.
- Every implemented performance slice records before/after measurements using the same fixture or workload.
- `npm run build`, `npm test`, and `git diff --check` pass for release-candidate work.
- Package validation reports no orphaned compiled JavaScript or shipped source maps.
- Activation changes are validated in a fresh Extension Development Host profile.
- Graph-loading changes preserve cancellation, repository switching, refs/HEAD freshness, and multi-repository behavior.
- Rendering changes preserve minimap, viewport, selection, search, context menus, and Show Log workflows.

## Exclusions

- No new command, menu, view, setting, or product surface unless separately approved.
- No replacement of the VS Code Git integration architecture.
- No unbounded full-history loading.
- No dependency addition, VSIX packaging, version re-bump, or Marketplace publication without explicit maintainer approval.

## Verification Plan

Opening:

- Confirm version metadata in `package.json` and `package-lock.json`.
- `git diff --check`
- `npm run build`
- `npm test`

Performance slices:

- Capture existing `gitRevisionGraph.traceLoading` output for a fixed repository and graph option set.
- Record VSIX file count, compressed size, shipped source-map count, and orphaned output count.
- Record Git process/ref-read counts for initial load, projection changes, reload, checkout, and fetch.
- Observe graph scroll/zoom/minimap behavior on a large scene.
- Observe Show Log initial load, filter, expansion, and repeated load-more behavior.

Release candidate:

- `npm run build`
- `npm test`
- `git diff --check`
- `npm run package:vsix` only after explicit approval
- Fresh-profile Extension Development Host smoke validation

## Risks

- Performance work can trade correctness for speed if invalidation boundaries are too broad.
- Activation cleanup can affect compatibility behavior that is currently initialized eagerly.
- Bundling can break worker-thread loading or package runtime dependencies.
- Incremental webview updates can regress retained state or accessibility.
- The release can become too broad if all candidates are treated as mandatory rather than measurement-driven slices.

## Marketplace Notes

- Describe only measured, implemented improvements.
- Avoid generic “faster” claims without a reproducible workload.
- Keep packaging and publication as separate maintainer-approved Deliver actions.
