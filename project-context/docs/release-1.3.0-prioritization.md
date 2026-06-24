# Release 1.3.0 Prioritization

## Objective

Open `1.3.0` as a graph layout performance and readability release after the `1.2.0` implementation baseline.

The first release slice is adaptive d3-dag Sugiyama layout profile selection. The goal is to reduce layout cost for large or very wide projected revision graphs while preserving the existing editor graph surface, worker-thread layout execution, virtualized webview rendering, and native VS Code Git workflows.

## Context

- Current package baseline before opening: `1.2.0`.
- Target release: `1.3.0`.
- `1.2.0` shipped activation/package efficiency, graph refresh reuse, merge ancestry fan-out reduction, indexed graph virtualization, nonblocking current-branch sync error handling, and incremental Show Log append updates.
- The graph layout already uses `d3-dag` Sugiyama, cache misses run in a Node worker, and the webview renders only the visible graph window.
- Documentation analysis in `project-context/docs/d3-dag-performance-ux-opportunities.md` identified adaptive Sugiyama quality as the safest near-term performance improvement.

## Release Direction

### Priority 0: adaptive Sugiyama layout

- Add explicit layout profiles for the existing Sugiyama path:
  - `balanced` for normal graphs.
  - `fast-two-layer` for large projected graphs.
  - `dfs-wide` for extremely wide layer shapes.
- Keep the current balanced visual behavior for normal graphs.
- Move large graphs to a lower-pass two-layer decross strategy before falling back to DFS-only wide-layer handling.
- Include the selected profile in layout cache identity.
- Expose the selected profile through existing graph load trace detail.
- Preserve worker execution, cancellation, fallback-to-synchronous-layout behavior, and downstream webview payload shape.

Implementation reference:

- `project-context/2.build/features/1.3.0-adaptive-sugiyama-layout-plan.md`

## Implemented Scope

- Adaptive profile selection with thresholds:
  - `fast-two-layer` when `nodes >= 800` or `edges >= 1000`.
  - `dfs-wide` when estimated max layer width is greater than `300`.
- Layout cache namespace moved to `d3-dag-sugiyama-v3`.
- Worker result messages now include selected layout profile metadata.
- `scene.layout.d3DagSugiyama` trace detail now includes `profile=...`.
- Regression coverage added for profile selection, cache identity, worker metadata, trace detail, and graph row direction.

## Acceptance Criteria

- Package metadata remains unchanged until explicit release-opening approval.
- Normal graphs continue using balanced layout behavior.
- Large projected graphs select `fast-two-layer`.
- Wide projected graph shapes select `dfs-wide`.
- Layout cache identity changes for the new adaptive layout strategy.
- Existing graph scene construction and webview payload shape remain compatible.
- `npm run build`, `npm test`, and `git diff --check` pass.
- Manual Extension Development Host validation covers small and branch-heavy repositories with `gitRevisionGraph.traceLoading` enabled.
- VSIX packaging and Marketplace publication are not run without explicit maintainer approval.

## Verification Plan

Automated:

- `npm run build`
- `npm test`
- `git diff --check`

Manual Extension Development Host smoke:

- Enable `gitRevisionGraph.traceLoading`.
- Open a small repository and confirm the trace reports `profile=balanced`.
- Open a large or branch-heavy repository or synthetic equivalent and confirm the trace reports the adaptive profile as expected.
- Verify graph loading, repository switching, scope/filter toggles, refresh, empty-cache reload, search, minimap, zoom, Center HEAD, and selection path highlighting.
- Smoke compare, Show Log, checkout, branch creation, sync, merge, delete, reset, and conflict guards to ensure layout changes did not disturb graph workflows.

## Exclusions

- No visible layout-mode UI in this release slice.
- No switch to `grid()` or `zherebko()`.
- No d3-dag edge-route rendering adoption.
- No dependency additions.
- No package version bump, VSIX packaging, or Marketplace publication without explicit maintainer approval.

## Risks

- Lower decross pass counts can increase crossings in dense merge histories.
- Synthetic thresholds may not match real repository shapes; manual validation should include at least one branch-heavy real repository.
- The layout cache namespace bump invalidates older persisted layout positions by design.
- Future edge-route adoption should be handled as a separate slice because manual horizontal drag currently recomputes paths from node endpoints.

## Marketplace Notes

- Frame as graph layout responsiveness/readability work only after manual validation.
- Avoid broad “faster graph” claims unless release validation records a reproducible workload.
