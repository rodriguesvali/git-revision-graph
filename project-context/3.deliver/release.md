# Release Readiness

## Version / Change Set
Current package baseline: `0.0.24`.

Target release: `0.0.24`.

Planned publishable change set:

- Improve revision graph organization by preserving ELK layered `y` placement and compacting it into webview rows instead of forcing each visible commit into a unique `git log` row.
- Improve local checkout refresh efficiency by avoiding full graph reloads for off-snapshot non-HEAD ref metadata.
- Improve `Sync with...` refresh efficiency by using metadata patches for push-only and pull-only syncs.
- Add 10 more minimap zoom levels for precise navigation in large revision graphs.
- Improve minimap performance by batching updates and avoiding full SVG rebuilds during viewport-only movement.
- Remove the redundant internal `Fetch` button from the revision graph webview toolbar while keeping the external VS Code view title action.
- Improve revision graph load latency by starting repository ref loading and the graph `git log` command concurrently.
- Add opt-in revision graph load timing diagnostics behind `gitRevisionGraph.traceLoading`.
- Cache and persist ELK layout positions for repeated identical graph topologies.

Do not publish without explicit human approval.

Version bump to `0.0.24` has been applied in `package.json` and `package-lock.json`.

Planning references:

- `project-context/2.build/features/0.0.24-graph-layout-layering.md`
- `project-context/2.build/features/0.0.24-checkout-metadata-patch-efficiency.md`
- `project-context/2.build/features/0.0.24-sync-refresh-efficiency.md`
- `project-context/2.build/features/0.0.24-minimap-zoom-levels.md`
- `project-context/2.build/features/0.0.24-minimap-sync-performance.md`
- `project-context/2.build/features/0.0.24-internal-fetch-toolbar-removal.md`
- `project-context/2.build/features/0.0.24-graph-load-io-parallelism.md`
- `project-context/2.build/features/0.0.24-graph-load-tracing.md`
- `project-context/2.build/features/0.0.24-elk-layout-cache.md`

## Verification Summary
- Required for meaningful changes: `npm run build`.
- Required for behavior, command, graph, controller, Git workflow, or user-visible changes: `npm test`.
- Recommended for release candidates: manual Extension Development Host smoke test.

Current verification:

- Source implementation for the planned `0.0.24` graph layout layering improvement is complete.
- Source implementation for the planned `0.0.24` checkout metadata patch efficiency improvement is complete.
- Source implementation for the planned `0.0.24` sync refresh efficiency improvement is complete.
- Source implementation for the planned `0.0.24` minimap zoom-level improvement is complete.
- Source implementation for the planned `0.0.24` minimap sync performance improvement is complete.
- Source implementation for the planned `0.0.24` internal fetch toolbar removal is complete.
- Source implementation for the planned `0.0.24` graph load I/O parallelism improvement is complete.
- Source implementation for the planned `0.0.24` graph load tracing diagnostic is complete.
- Source implementation for the planned `0.0.24` persisted ELK layout cache is complete.
- `npm run build` passed.
- `npm test` passed with 209 tests.
- Focused ELK layout cache tests passed after adding workspace-state persistence.
- Manual Extension Development Host validation against the screenshot repository is not complete.

Release preparation status:

- Source release readiness is complete for the planned `0.0.24` graph layout layering improvement.
- Source release readiness is complete for the planned `0.0.24` checkout metadata patch efficiency improvement.
- Source release readiness is complete for the planned `0.0.24` sync refresh efficiency improvement.
- Source release readiness is complete for the planned `0.0.24` minimap zoom-level improvement.
- Source release readiness is complete for the planned `0.0.24` minimap sync performance improvement.
- Source release readiness is complete for the planned `0.0.24` internal fetch toolbar removal.
- Source release readiness is complete for the planned `0.0.24` graph load I/O parallelism improvement.
- Source release readiness is complete for the planned `0.0.24` graph load tracing diagnostic.
- Source release readiness is complete for the planned `0.0.24` persisted ELK layout cache.
- Version bump to `0.0.24` is complete.
- Release notes for `0.0.24` are complete in `CHANGELOG.md`.
- VSIX packaging is not complete for `0.0.24`.
- Marketplace publishing is not complete for `0.0.24`.

## Deployment Steps
Release commands available in `package.json`:

- `npm run package:vsix`
- `npm run publish:current`
- `npm run publish:patch`
- `npm run publish:minor`
- `npm run publish:major`

Only run packaging or publish commands when explicitly requested.

## Configuration
The extension depends on the built-in `vscode.git` extension and supports VS Code `^1.90.0`.

## Monitoring
Post-release monitoring should use Marketplace feedback, GitHub issues, and regressions reported against compare, checkout, branch, merge, sync, delete, diff, log, and graph rendering workflows.

## Rollback
Rollback options depend on Marketplace state:

- Publish a patch release that reverts or fixes the regression.
- Direct affected users to install a previous VSIX when available.
- Revert the offending code in Git and prepare a follow-up release.

## Approvals
Human approval is required before:

- VSIX release packaging.
- Marketplace publishing.
- Any destructive Git or repository history operation.
