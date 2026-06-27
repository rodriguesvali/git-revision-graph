# Release Readiness

## 1.5.0 Release Readiness

Published package baseline: `1.4.0`.

Target release: `1.5.0`.

Status: Release cycle open by maintainer approval on 2026-06-27. Package metadata is `1.5.0`; implementation scope remains proposed and is not frozen or approved. No robustness implementation, dependency change, `1.5.0` packaging, or `1.5.0` publication has been performed.

Opening verification:

- Package metadata confirmed at `1.5.0` in `package.json` and root `package-lock.json` package metadata.
- `git diff --check` passed.
- `npm run build` passed through the `npm test` lifecycle.
- `npm test` passed with 466 tests.

Proposed release direction:

- harden asynchronous webview message boundaries and prevent overlapping or stale repository mutations;
- make restore behavior symlink-safe and preserve tracked-file semantics;
- apply reviewed timeout, output, cancellation, and settlement policies to every targeted Git CLI call;
- use collision-safe Git history framing;
- invalidate repository-dependent review panels when repositories close;
- make layout worker failure recovery bounded and extension-host safe;
- surface ref content failures instead of displaying valid-looking empty documents;
- add fault-injection, cross-platform, and manual Extension Development Host validation before release closure.

Planning references:

- `project-context/docs/release-1.5.0-prioritization.md`
- `project-context/2.build/features/1.5.0-release-opening.md`
- `project-context/2.build/features/1.5.0-robustness-hardening.md`
- `project-context/1.define/open-questions.md`
- `src/graphify-out/GRAPH_REPORT.md`

Entry gates:

- Maintainer confirmation of all `1.4.0` Deliver gates: complete on 2026-06-27.
- `1.5.0` version metadata and cycle opening: complete on 2026-06-27.
- Review and approve the proposed `1.5.0` scope.
- Resolve restore strategy, mutation coordination, Git execution profiles, layout fallback threshold, CI, and dependency-change questions.
- Opening comparison baseline recorded as `0fd5263e5fdbcaaeb9d305abf981f7e01e895936`; record a new implementation baseline if approved Build work starts from a later commit.

Release gates remain distinct: scope approval, implementation, automated verification, manual Extension Development Host validation, VSIX packaging, clean-profile installation, and Marketplace publication require explicit progression.

## 1.4.0 Release Readiness

Current package baseline before opening: `1.3.0`.

Target release: `1.4.0`.

Status: Release completed. The maintainer confirmed on 2026-06-27 that Extension Development Host smoke validation, VSIX packaging, clean-profile installation, and Marketplace publication were all completed for `1.4.0`.

Planning and build references:

- `project-context/docs/release-1.4.0-prioritization.md`
- `project-context/2.build/features/1.4.0-release-opening.md`
- `project-context/2.build/features/1.4.0-compare-results-unified-diff.md`
- `project-context/1.define/prd.md`
- `project-context/1.define/sad.md`
- `project-context/1.define/open-questions.md`

Maintainer feature approval:

- Approval date: 2026-06-27.
- Comparison baseline: `78a80ab427894f2dab5e0636e929c5f9d56f5b08`.
- Approved implementation candidate: `876eecd3b0e986f9a4c843ac6b88d1009b9d83dc`.
- Approved capabilities: ref-to-ref Compare Results unified diff; ref-to-worktree Compare Results unified diff with staged, unstaged, and active untracked changes; and the required pre-generation refresh, aligned-state handling, and stale-response rejection.
- Approval is limited to feature inclusion in `1.4.0`; it does not mark manual validation, VSIX packaging, clean-profile installation, or Marketplace publication complete.

Frozen release scope:

- Ship `1.4.0` as a focused review-surface release containing only the Compare Results unified diff slice.
- Defer all other graph, review-surface, Git workflow, packaging-hygiene, dependency, and contribution-point changes to a later release unless scope is explicitly reopened by the maintainer.
- Preserve the Source Control-launched singleton editor graph, command IDs, multi-repository behavior, conflict guards, cancellation, worker-thread layout execution, virtualized webview rendering, and native VS Code Git workflows.
- Keep VSIX packaging and Marketplace publication as explicit Deliver actions after validation.

Approved implemented slice:

- Added a `Unified Diff` button to ref-to-ref and ref-to-worktree Compare Results sessions.
- Routed the button through validated Compare Results webview messaging.
- Reused the existing unified diff editor flow and revision graph document backend.
- Added a bounded worktree unified diff backend flow covering staged, unstaged, and untracked changes.
- Refreshes the active ref-to-worktree comparison before generation and discards refresh responses when the panel has moved to another state.
- Kept the action hidden for empty Compare Results state.

Automated verification:

- Package metadata confirmed at `1.4.0` in `package.json`, root `package-lock.json`, and root package-lock package metadata.
- Focused Compare Results unified diff validation passed with 44 tests across message dispatch, view state, worktree refresh, webview shell, Git execution, document backend, and webview message validation.
- `npm run build` passed on the frozen release-candidate scope on 2026-06-27.
- Focused worktree refresh validation covers refreshed untracked paths, aligned worktrees, and stale in-flight response rejection.
- `npm test` passed with 466 tests on the frozen release-candidate scope on 2026-06-27.
- `git diff --check` passed on the frozen release-candidate scope on 2026-06-27.

Mandatory manual validation matrix:

Environment record:

- VS Code version: pending.
- Operating system: pending.
- Single-repository fixture: pending.
- Multi-repository fixture: pending.
- Tester and date: pending.

Smoke checklist:

- [ ] Open the graph from Source Control and verify repository selection in single- and multi-repository workspaces.
- [ ] Run a non-empty ref-to-ref comparison; open `Unified Diff`; verify orientation, labels, patch contents, and diff-language rendering.
- [ ] Run a ref-to-worktree comparison containing staged, unstaged, and untracked changes, including a nested path and a path containing spaces; verify all active changes appear.
- [ ] Confirm empty Compare Results state hides `Unified Diff`.
- [ ] Verify existing file open, filters, selection, copy, compare-with-worktree, context-menu, and restore actions remain functional.
- [ ] Add and remove untracked files after opening Compare Results; confirm the panel refreshes and the unified output reflects the current comparison without using stale paths.
- [ ] Switch comparisons between repositories; confirm each unified diff runs against the repository displayed by Compare Results.
- [ ] Resize the editor panel to a narrow width and confirm the toolbar remains usable.
- [ ] Smoke graph reload, Compare Results, and Show Log opening around the shared backend integration.

Manual validation result: complete by maintainer confirmation on 2026-06-27. The detailed environment record was not supplied for this artifact.

Release gates:

- Scope freeze: complete on 2026-06-27.
- Maintainer approval of the implemented `1.4.0` feature scope: complete on 2026-06-27.
- Focused implementation: complete.
- Automated verification: complete on the current candidate.
- Manual Extension Development Host validation: complete by maintainer confirmation on 2026-06-27.
- VSIX packaging and clean-profile installation: complete by maintainer confirmation on 2026-06-27.
- Marketplace publication: complete by maintainer confirmation on 2026-06-27.

Completion record:

- The maintainer confirmed the complete validation, packaging, installation, and publication sequence.
- Exact VSIX filename, size, checksum, package-entry count, and manual environment details were not supplied for this artifact and are not inferred.
- `1.5.0` must record those details directly before publication.

Rollback:

- Revert the Compare Results unified diff slice if validation finds incorrect patches, repository selection errors, unacceptable toolbar behavior, or regressions in existing Compare Results actions.
- Restore package metadata to `1.3.0` and remove the `1.4.0` release artifacts if the candidate is abandoned rather than corrected.

## 1.3.0 Release Readiness

Current package baseline before opening: `1.2.0`.

Target release: `1.3.0`.

Status: Release completed for `1.3.0`. Package metadata is bumped to `1.3.0` in `package.json` and `package-lock.json`; maintainer confirmation records VSIX publication and Marketplace publication as complete.

Planning and build references:

- `project-context/docs/release-1.3.0-prioritization.md`
- `project-context/docs/d3-dag-performance-ux-opportunities.md`
- `project-context/2.build/features/1.3.0-adaptive-sugiyama-layout-plan.md`
- `project-context/2.build/features/1.3.0-d3-dag-edge-routes.md`
- `project-context/1.define/prd.md`
- `project-context/1.define/sad.md`
- `project-context/1.define/open-questions.md`

Release direction:

- Improve revision graph layout responsiveness for large and wide projected graphs.
- Preserve the existing Source Control-launched singleton editor graph, command IDs, multi-repository behavior, conflict guards, cancellation, worker-thread layout execution, virtualized webview rendering, and native VS Code Git workflows.
- Treat adaptive Sugiyama layout as the first `1.3.0` release slice.
- Treat d3-dag edge route preservation as the second `1.3.0` graph readability slice.

Implemented slices:

- Added adaptive d3-dag Sugiyama layout profile selection with `balanced`, `fast-two-layer`, and `dfs-wide` profiles.
- Kept normal graphs on the balanced layout profile.
- Selected `fast-two-layer` for projected graphs with `nodes >= 800` or `edges >= 1000`.
- Selected `dfs-wide` when estimated layer width exceeds `300` nodes and preserved the realized wide-layer DFS guard.
- Moved layout cache identity to `d3-dag-sugiyama-v4`, including selected profile and route-preserving result shape in the cache hash.
- Added selected layout profile metadata to layout worker results.
- Added `profile=...` to the existing `scene.layout.d3DagSugiyama` trace detail.
- Added regression coverage for profile selection, cache identity, worker metadata, trace detail, and graph row direction.
- Preserved d3-dag Sugiyama `link.points` as bounded edge route metadata through layout, worker messages, cache, scene payloads, and webview rendering.
- Render route-aware graph edge paths when valid route points are available.
- Keep endpoint fallback for missing, invalid, stale, or drag-adjusted route data.
- Keep minimap edges straight in this slice.
- Added regression coverage for route extraction, worker route serialization, scene route payloads, route-aware rendering, cache restoration, and shell runtime helpers.
- Package metadata confirmed at `1.3.0` in `package.json`, root `package-lock.json`, and root package-lock package metadata after opening the cycle.
- Added the public `1.3.0` changelog section for release preparation, adaptive layout profiles, and d3-dag routed edge rendering.

Automated verification:

- `npm run build` passed after adaptive layout implementation.
- `npm test` passed with 457 tests after adaptive layout implementation.
- `npm run build` passed after d3-dag edge route implementation.
- `npm test` passed with 459 tests after d3-dag edge route implementation.
- `git diff --check` passed after edge route implementation and artifact updates.
- `npm run build`, `npm test`, and `git diff --check` passed after opening `1.3.0`.

Manual validation focus:

- Enable `gitRevisionGraph.traceLoading`.
- Confirm a small repository reports `profile=balanced`.
- Confirm a large or branch-heavy repository or synthetic equivalent reports the expected adaptive profile.
- Inspect merge-heavy and fan-out graph edges before and after reload; routed edges should remain anchored to card boundaries.
- Drag connected nodes horizontally and confirm affected edges fall back to attached endpoint paths.
- Verify graph loading, repository switching, scope/filter toggles, refresh, empty-cache reload, search, minimap, zoom, Center HEAD, and selection path highlighting.
- Smoke compare, Show Log, checkout, branch creation, sync, merge, delete, reset, and conflict guards.

Release gates:

- Manual Extension Development Host validation is complete by maintainer confirmation.
- VSIX publication is complete by maintainer confirmation.
- Marketplace publication is complete by maintainer confirmation.
- Any additional `1.3.0` scope should receive a focused feature artifact before implementation.

Manual validation completed:

- Maintainer confirmed the `1.3.0` release candidate was validated after automated verification.
- Smoke coverage should be treated as including graph loading, repository switching, scope/filter toggles, refresh, empty-cache reload, search, minimap, zoom, Center HEAD, selection path highlighting, and core Git workflows unless a later regression report narrows the validated scope.

VSIX publication completed:

- Maintainer confirmed the `1.3.0` VSIX was published.

Marketplace publication completed:

- Maintainer confirmed the `1.3.0` Marketplace publication is complete.
- Post-publication monitoring should watch for adaptive layout profile selection, route-aware edge rendering, graph refresh, virtual scrolling, and Git workflow regressions.

Rollback:

- Revert the adaptive layout slice if large real repositories show unacceptable crossing/readability regressions or worker/profile metadata introduces runtime issues.
- Revert the route-aware edge slice if real merge-heavy repositories show confusing edge geometry or drag fallback issues.
- The layout cache namespace bump intentionally invalidates old persisted positions; reverting should restore the previous strategy namespace only if old cache compatibility matters for the chosen rollback.

## 1.2.0 Release Readiness

Current package baseline before opening: `1.1.0`.

Target release: `1.2.0`.

Status: Release completed for `1.2.0`. Package metadata is bumped to `1.2.0`; performance implementation, automated verification, manual validation, VSIX publication, and Marketplace publication are complete.

Planning and build references:

- `project-context/docs/release-1.2.0-prioritization.md`
- `project-context/2.build/features/1.2.0-release-opening.md`
- `project-context/2.build/features/1.2.0-on-demand-command-activation.md`
- `project-context/2.build/features/1.2.0-legacy-visibility-context-removal.md`
- `project-context/2.build/features/1.2.0-deterministic-out-cleanup.md`
- `project-context/2.build/features/1.2.0-vsix-source-map-exclusion.md`
- `project-context/2.build/features/1.2.0-orphaned-output-regression.md`
- `project-context/2.build/features/1.2.0-runtime-performance-backlog.md`
- `project-context/2.build/features/1.2.0-projection-only-refresh.md`
- `project-context/2.build/features/1.2.0-request-scoped-ref-reuse.md`
- `project-context/2.build/features/1.2.0-merge-ancestry-fanout-reduction.md`
- `project-context/2.build/features/1.2.0-indexed-graph-virtualization.md`
- `project-context/2.build/features/1.2.0-nonblocking-current-branch-sync-error.md`
- `project-context/2.build/features/1.2.0-incremental-show-log-updates.md`
- `project-context/2.build/features/1.2.0-copy-hash-menu-polish.md`
- `project-context/1.define/prd.md`
- `project-context/1.define/sad.md`
- `project-context/1.define/open-questions.md`

Release direction:

- Improve activation and package efficiency.
- Reduce repeated Git/ref/snapshot work during graph refreshes.
- Reduce full-scene work in virtual viewport frames.
- Improve Show Log update efficiency where measurement justifies the change.
- Preserve the Source Control-launched singleton editor graph, command IDs, multi-repository behavior, conflict guards, cancellation, webview security, and native VS Code Git workflows.

Approved runtime performance backlog:

1. Projection-only refresh with snapshot reuse.
2. Request-scoped ref reuse during a graph-load request.
3. Reduced Git ancestry process fan-out for merge-blocked target analysis.
4. Indexed virtual viewport candidate selection so scroll frames avoid full-scene scans.
5. Incremental Show Log updates for append, expansion, loading, and cache-hit paths where measurement justifies protocol complexity.

Opening baseline:

- VSIX measurement: approximately 1.3 MB compressed and 718 files.
- Package contents included 132 source maps and 10 compiled JavaScript files without matching current TypeScript sources.
- Full graph construction can read repository refs in both snapshot and overlay stages.
- Virtual graph viewport frames still inspect complete node and edge collections and rebuild topology-derived maps.
- Merge-blocked fallback analysis can spawn one Git ancestry process per unresolved visible reference.
- Show Log state changes rebuild and resend the complete loaded commit list.

Planned sequencing:

1. Activation and deterministic package-output hygiene.
2. Projection-only refresh with snapshot reuse.
3. Request-scoped ref reuse during a graph-load request.
4. Git ancestry fallback consolidation.
5. Indexed virtual viewport candidate selection.
6. Incremental or virtualized Show Log updates.

Opening verification:

- Package metadata confirmed at `1.2.0` in `package.json`, root `package-lock.json`, and root package-lock package metadata.
- `git diff --check` passed after the opening changes.
- `npm run build` passed.
- `npm test` passed with 447 tests.

Implemented performance slices:

- Removed `onStartupFinished` from the manifest so VS Code activates the extension through its five contributed commands. Automated manifest coverage locks the command set and the `^1.90.0` engine baseline; fresh-profile Extension Development Host activation validation is complete.
- Focused package manifest validation passed for implicit command activation.
- `npm run build` passed after the activation change.
- `npm test` passed with 447 tests after the activation change.
- `git diff --check` passed after implementation and artifact updates.
- Removed the unused `gitRefs.revisionGraphVisible` context reset, its activation helper, constant, and isolated legacy test.
- Source search confirmed zero remaining production or test references to the removed visibility context and helper.
- Focused manifest coverage passed for the absence of duplicate side-bar graph views and Source Control routing to the editor panel.
- `npm run build` passed after the legacy visibility cleanup.
- `npm test` passed with 446 tests after the cleanup; one obsolete helper-only test was removed.
- `git diff --check` passed after implementation and artifact updates.
- Editor graph smoke validation is complete.
- Added `clean:out` and an npm `prebuild` lifecycle so every production build removes stale compiled output before TypeScript runs.
- Clean-build measurement reduced `out/` from 256 to 234 files and from approximately 1.8 MB to 1.6 MB.
- Compiled JavaScript files without matching current TypeScript sources decreased from 11 to zero.
- The compiled d3-dag layout worker remained present after cleanup.
- `npm run build` passed after deterministic output cleanup.
- `npm test` passed with 446 tests and exercised the clean-build lifecycle.
- `git diff --check` passed after implementation and artifact updates.
- Updated `.vscodeignore` to exclude source maps recursively from package contents while preserving local TypeScript source maps.
- `vsce ls` decreased from 694 to 573 package entries and from 121 source-map entries to zero.
- Local builds retained 117 source maps totaling 327,540 uncompressed bytes.
- The extension entrypoint and compiled d3-dag layout worker remained listed for packaging.
- `npm run build` passed after source-map exclusion.
- `npm test` passed with 446 tests.
- `git diff --check` passed after implementation and artifact updates.
- Generated VSIX review and publication are complete.
- Added automated package-output coverage that locks the clean-build lifecycle and rejects JavaScript files without matching TypeScript sources.
- Focused package-output validation passed with two tests.
- The full suite increased from 446 to 448 tests.
- `npm run build` passed after adding output regression coverage.
- `npm test` passed with 448 tests.
- `git diff --check` passed after implementation and artifact updates.
- Current clean output contains zero orphaned JavaScript files.
- Added a projection-only refresh intent so compatible projection option changes can reuse the last applied graph snapshot instead of reloading Git history.
- Projection-only reuse is limited to snapshots whose `refScope`, tag, remote-branch, and stash visibility inputs still match the target projection; incompatible changes fall back to full rebuild.
- Projection option changes now request projection-only refreshes, while explicit refresh, repository events, fetches, checkouts, merges, branch/tag/delete operations, and empty-cache reloads retain full-rebuild behavior.
- Focused projection-only refresh validation passed across refresh helpers, ready-state from-snapshot construction, message handling, and view-state workflow tests.
- `npm run build` passed after projection-only refresh implementation.
- `npm test` passed with 451 tests after projection-only refresh implementation.
- `git diff --check` passed after projection-only refresh implementation and artifact updates.
- Added request-scoped repository ref reuse so one graph-load request shares refs between snapshot decoration parsing and repository overlay construction.
- Snapshot loading still runs ref loading and `git log` concurrently, while overlay reuse avoids the second `repository.getRefs()` call during the same ready-state request.
- Projection-only refreshes from older snapshots still perform a new overlay ref read, preserving freshness without introducing a long-lived ref cache.
- Focused request-scoped ref reuse validation passed across backend snapshot loading and ready-state construction.
- `npm run build` passed after request-scoped ref reuse implementation.
- `npm test` passed with 453 tests after request-scoped ref reuse implementation.
- `git diff --check` passed after request-scoped ref reuse implementation and artifact updates.
- Reduced merge-blocked ancestry fallback fan-out by replacing per-ref `merge-base --is-ancestor` checks with one batched `git for-each-ref --merged=<HEAD>` query for unresolved off-snapshot refs.
- The batched ancestry fallback covers local branches, remote branches, tags, and stash refs through full-ref-name normalization.
- The previous per-ref merge-base fallback was intentionally removed so the graph has one merge-blocked Git analysis implementation.
- Focused merge ancestry fan-out validation passed for the batched path.
- `npm run build` passed after merge ancestry fan-out reduction.
- `npm test` passed with 453 tests after merge ancestry fan-out reduction and removal of the per-ref fallback test.
- `git diff --check` passed after merge ancestry fan-out reduction and artifact updates.
- Added webview-side vertical bucket indexes for virtual graph node and edge candidate selection.
- Scroll and zoom frames now collect nearby viewport candidates before applying the existing precise visibility checks instead of filtering the complete graph node and edge lists each frame.
- Focused webview shell validation passed and locks the indexed virtual render path.
- `npm run build` passed after indexed graph virtualization.
- `npm test` passed with 453 tests after indexed graph virtualization.
- `git diff --check` passed after indexed graph virtualization and artifact updates.
- Updated current-branch sync error handling so failed sync attempts clear the graph loading state without waiting for the user to close the Git error notification.
- Focused ref action validation passed for the nonblocking current-branch sync error path.
- `npm run build` passed after nonblocking current-branch sync error handling.
- `npm test` passed with 454 tests after nonblocking current-branch sync error handling.
- `git diff --check` passed after nonblocking current-branch sync error handling and artifact updates.
- Added incremental Show Log append updates for successful `loadMore` paging.
- Show Log still uses full-state messages for initial render, source/filter/scope changes, retained-panel recovery, commit expansion, and stale-patch fallback.
- The Show Log webview now applies aligned append patches by inserting new commit rows and updating the summary/load-more block without rebuilding the full content body.
- Focused Show Log shared-state and webview shell validation passed for incremental append updates.
- `npm run build` passed after incremental Show Log append updates.
- `npm test` passed with 455 tests after incremental Show Log append updates.
- `git diff --check` passed after incremental Show Log append updates and artifact updates.
- Added `Copy Hash` to the Show Log single-commit context menu and shortened graph/Show Log copy labels such as `Copy Hash` and `Copy Ref Name`.
- Focused Show Log and revision graph webview shell validation passed for copy-hash menu polish.
- `npm run build` passed after copy-hash menu polish.
- `npm test` passed with 455 tests after copy-hash menu polish.
- `git diff --check` passed after copy-hash menu polish and artifact updates.

Release gates:

- Runtime performance backlog approved for `1.2.0`; projection-only refresh with snapshot reuse is implemented.
- Request-scoped ref reuse is implemented.
- Git ancestry fallback consolidation is implemented.
- Indexed virtual viewport candidate selection is implemented; manual graph smoke is complete.
- Incremental Show Log append updates are implemented; manual Show Log paging smoke is complete.
- Runtime performance implementation slices are complete for the approved `1.2.0` backlog.
- Bundling or any new build dependency requires separate maintainer approval.
- Pending repeatable benchmark repository or synthetic fixture selection.
- Automated and manual verification for implemented slices is complete.
- VSIX publication is complete.
- Marketplace publication is complete.

Manual validation completed:

- Maintainer Extension Development Host validation completed for the `1.2.0` release candidate.
- Fresh-profile command activation, Source Control graph launch, editor graph smoke, repository switching, refresh, projection option changes, virtual graph scrolling/zooming, search, minimap, and `Center HEAD` were covered.
- Show Log opening and `loadMore` paging were covered, including the incremental append path and copy-hash/copy-ref-name context menu polish.
- Compare, compare with worktree, unified diff, checkout, branch creation, sync, merge, delete, and conflict-guard workflows were covered at smoke level.

VSIX publication completed:

- Maintainer confirmed the `1.2.0` VSIX was published after automated and manual validation.

Marketplace publication completed:

- Maintainer confirmed the `1.2.0` Marketplace publication is complete.
- Post-publication monitoring should watch for activation, graph refresh, virtual scrolling, Show Log paging, and Git workflow regressions.

Rollback:

- Performance slices must be independently reversible. If a slice regresses correctness or workbench behavior, revert that slice while preserving the rest of the `1.2.0` cycle.

## 1.1.0 Release Readiness

Current package baseline: `1.0.1`.

Target release: `1.1.0`.

Status: Release cycle open for `1.1.0`. Package metadata is bumped to `1.1.0` in `package.json` and `package-lock.json`, focused fixes and small functional improvements are implemented and verified, and VSIX packaging and Marketplace publication are not approved or complete.

Planning and build references:

- `project-context/docs/release-1.1.0-prioritization.md`
- `project-context/2.build/features/1.1.0-release-opening.md`
- `project-context/2.build/features/1.1.0-show-log-double-selection-compare.md`
- `project-context/2.build/features/1.1.0-dirty-worktree-branch-creation.md`
- `project-context/2.build/features/1.1.0-dirty-worktree-checkout-pull.md`
- `project-context/2.build/features/1.1.0-graph-drag-release-hardening.md`
- `project-context/2.build/features/1.1.0-reload-with-empty-cache.md`
- `project-context/2.build/features/1.1.0-release-promotion.md`
- `project-context/2.build/features/1.1.0-dirty-worktree-refresh-loop.md`

Release direction:

- Keep the shipped `1.0.1` Source Control/editor graph product surface stable.
- Limit scope to focused fixes and small functional improvements selected by the maintainer.
- Preserve command IDs, contribution points, view types, multi-repository behavior, conflict guards, webview security boundaries, and native VS Code Git workflow alignment.
- Do not package or publish without explicit maintainer approval.

Planned scope:

- Restore the Show Log `Compare` context action when exactly two commits are selected, while preserving `Cherry Pick`-only behavior for larger multi-selections.
- Allow `Create New Branch` to create and check out a new branch with ordinary workspace changes, while still blocking unresolved conflicts.
- Allow checkout and current-branch pull with ordinary workspace changes, while still blocking unresolved conflicts.
- Harden revision graph drag cleanup so pan mode does not remain active after missed mouse release or focus-loss edge cases.
- Stop ordinary workspace changes from repeatedly triggering full revision graph reloads.
- Add a long-press `Reload Revision Graph` option that clears the persisted layout cache before a full rebuild.

Automated verification:

- Package metadata confirmed at `1.1.0` in `package.json`, root `package-lock.json`, and root package-lock package metadata after opening the cycle.
- `git diff --check` passed after opening the `1.1.0` package metadata, changelog, prioritization, feature, and release-readiness artifacts.
- `npm run build` passed after opening the `1.1.0` cycle.
- Focused Show Log webview shell test passed after restoring double-selection compare. This includes `npm run build` and test compilation through the focused command.
- `npm test` passed with 415 tests after restoring double-selection compare. This includes `npm run build` through the test script.
- `git diff --check` passed after restoring double-selection compare and artifact updates.
- Focused ref action tests passed after allowing dirty-worktree branch creation. This includes `npm run build` and test compilation through the focused command.
- `npm test` passed with 417 tests after allowing dirty-worktree branch creation. This includes `npm run build` through the test script.
- `git diff --check` passed after allowing dirty-worktree branch creation and artifact updates.
- Focused ref action tests passed after allowing dirty-worktree checkout and pull. This includes `npm run build` and test compilation through the focused command.
- `npm test` passed with 419 tests after allowing dirty-worktree checkout and pull. This includes `npm run build` through the test script.
- `git diff --check` passed after allowing dirty-worktree checkout and pull and artifact updates.
- Focused revision graph webview shell tests passed after graph drag release hardening. This includes `npm run build` and test compilation through the focused command.
- `npm test` passed with 420 tests after graph drag release hardening. This includes `npm run build` through the test script.
- `git diff --check` passed after graph drag release hardening and artifact updates.
- Focused revision graph webview, message handler, dispatcher, message validation, and layout cache persistence tests passed after adding the long-press reload with empty cache option. This includes `npm run build` and test compilation through the focused command.
- `npm test` passed with 422 tests after adding the long-press reload with empty cache option. This includes `npm run build` through the test script.
- `git diff --check` passed after reload with empty cache implementation and artifact updates.
- Package metadata and active release artifacts were promoted from `1.0.2` to `1.1.0` after the scope grew to include small functional improvements.
- `npm run build` passed after promoting package metadata and active release artifacts to `1.1.0`.
- `git diff --check` passed after the `1.1.0` promotion updates.
- Focused repository state-change, revision graph state, and refresh tests passed after stopping dirty-worktree state events from triggering graph reloads. This includes `npm run build` and test compilation through the focused command.
- `npm test` passed with 425 tests after stopping dirty-worktree state events from triggering graph reloads. This includes `npm run build` through the test script.
- `git diff --check` passed after dirty-worktree refresh loop implementation and artifact updates.
- `npm audit --omit=dev` reported runtime vulnerabilities through the unused `codex` dependency before dependency cleanup.
- Removed unused runtime dependency `codex` from `package.json` and `package-lock.json`.
- Pinned `@types/vscode` to `1.90.0` to match the declared `engines.vscode` baseline.
- Added package manifest regression coverage for the expected runtime dependency set and VS Code API type baseline.
- `npm audit --omit=dev` passed with 0 runtime vulnerabilities after dependency cleanup.
- `npm run build` passed after removing `codex` and pinning `@types/vscode`.
- `npm test` passed with 447 tests after dependency cleanup and manifest regression coverage. This includes `npm run build` through the test script.
- `git diff --check` passed after dependency cleanup, manifest regression coverage, and release artifact updates.

Manual validation focus:

- Confirm graph launch from Source Control and Show Log opening from a revision graph commit or range.
- Ctrl-click two Show Log commits, open the context menu on either selected commit, and confirm both `Compare` and `Cherry Pick` are present.
- Select three Show Log commits, open the context menu on a selected commit, and confirm only `Cherry Pick` is present.
- Confirm the two-commit `Compare` action populates Compare Results as before.
- Modify a file without committing, create a new branch from the revision graph, and confirm the branch is created and checked out while changes remain present.
- Repeat branch creation with unresolved conflicts and confirm the extension opens Source Control and blocks the operation.
- Modify a file without committing, run checkout from the revision graph, and confirm the extension attempts the checkout.
- Modify a file without committing, run current-branch pull, and confirm the extension attempts the pull.
- Repeat checkout and pull with unresolved conflicts and confirm the extension opens Source Control and blocks the operation.
- Drag the revision graph viewport, release the left mouse button inside and outside the graph/webview area, and confirm pan mode clears.
- Start a graph drag, switch focus away from VS Code, return, and confirm pan mode is not stuck.
- Modify a file while the graph is open and confirm the graph does not repeatedly show `Loading Revision Graph...`.
- Hold `Reload Revision Graph` for 500 ms, choose `With Empty Cache`, and confirm the graph reloads without also triggering a normal reload on release.

Release gates:

- Pending maintainer confirmation that no additional launch items are required.
- Automated verification completed for the current `1.1.0` implementation scope.
- Runtime dependency audit completed with 0 vulnerabilities after removing unused `codex`.
- Pending maintainer Extension Development Host smoke validation before publication.
- Pending maintainer VSIX packaging and generated package review.
- Pending maintainer Marketplace publication approval.

Post-release monitoring focus:

- Reports that Show Log two-commit selections still omit `Compare` or route to the wrong Compare Results pair.
- Reports that branch creation, checkout, or pull still block ordinary dirty worktrees or allow operation during unresolved conflicts.
- Reports that graph pan mode stays active after releasing the left mouse button or changing focus.
- Reports that ordinary workspace changes still trigger repeated graph reloads or stale dirty/conflict action state.
- Reports that long-press reload does not show `With Empty Cache`, fails to clear stale layout, or accidentally double-reloads.

Rollback:

- If a published `1.1.0` regression is found, prepare a narrower follow-up patch or direct affected users to the previous `1.0.1` VSIX depending on severity.

## 1.0.1 Release Readiness

Current package baseline: `1.0.0`.

Target release: `1.0.1`.

Status: Release completed for `1.0.1` after maintainer approval. The `1.0.1` hotfix scope closed with exactly two fixes, package metadata is bumped to `1.0.1` in `package.json` and `package-lock.json`, automated verification is complete, VSIX packaging produced `git-revision-graph-1.0.1.vsix`, and Marketplace publication is complete.

Planning and build references:

- `project-context/docs/release-1.0.1-prioritization.md`
- `project-context/2.build/features/1.0.1-hotfix-opening.md`
- `project-context/2.build/features/1.0.1-force-push-vscode-api-hotfix.md`
- `project-context/2.build/features/1.0.1-pull-error-loading-clear-hotfix.md`

Release direction:

- Keep the shipped `1.0.0` Source Control/editor graph product surface stable.
- Limit scope to the two approved hotfixes: current-branch force-push Git API routing and current-branch pull error loading cleanup.
- Preserve command IDs, contribution points, view types, multi-repository behavior, conflict guards, webview security boundaries, and native VS Code Git workflow alignment.
- Do not package or publish without explicit maintainer approval.

Implemented fixes:

- First launch item: fix current-branch force push and force-with-lease push so they use the built-in VS Code Git API force parameter instead of direct non-interactive Git CLI execution. The reported failure is `fatal: could not read Username for 'https://github.com': terminal prompts disabled`; investigation confirmed the local `src/git.ts` API contract omits the official `ForcePushMode` and fourth `Repository.push` parameter available in the VS Code `1.90.0` baseline.
- Fixed current-branch pull failure handling so the graph clears `Pulling current branch...` loading feedback as soon as the pull action returns, without waiting for the user to close the VS Code error message.

Automated verification completed:

- Package metadata confirmed at `1.0.1` in `package.json`, root `package-lock.json`, and root `package-lock.json` package metadata after opening the cycle.
- `git diff --check` passed after opening the `1.0.1` package metadata, changelog, prioritization, feature, and release-readiness artifacts.
- `npm run build` passed after opening the `1.0.1` cycle.
- `npm run build` passed after the force-push Git API hotfix implementation.
- Focused ref action validation passed with 90 tests after the force-push Git API hotfix implementation. This includes `npm run build` and test compilation through the focused command.
- `npm test` passed with 414 tests after the force-push Git API hotfix implementation. This includes `npm run build` through the test script.
- `npm run build` passed after the pull error loading-clear hotfix implementation.
- Focused ref action validation passed with 91 tests after the pull error loading-clear hotfix implementation. This includes `npm run build` and test compilation through the focused command.
- `npm test` passed with 415 tests after the pull error loading-clear hotfix implementation. This includes `npm run build` through the test script.
- `git diff --check` passed after implementation and release-artifact updates.

Manual validation focus:

- Open a Git workspace and launch `View Git Revision Graph` from Source Control.
- Run current-branch normal push, force-with-lease push, and force push against a safe test remote.
- Confirm force modes use VS Code Git authentication/Source Control behavior rather than failing with non-interactive terminal prompt errors.
- Trigger a current-branch pull failure and confirm `Pulling current branch...` clears while the error message remains visible.
- Confirm graph refresh and success/error feedback remain coherent after push.

Release gates completed:

- Maintainer Extension Development Host smoke validation completed before publication.
- Maintainer VSIX packaging and generated package review completed.
- Maintainer Marketplace publication completed for `1.0.1`.

Post-release monitoring focus:

- Reports that current-branch force push or force-with-lease still bypasses VS Code Git authentication.
- Reports that current-branch pull failures leave graph loading feedback visible until the error message is closed.
- Reports of changed behavior in normal push, pull, sync, branch publish, tag push, or remote delete workflows.
- Reports of accidental or unclear force-push flows.

Rollback:

- If the `1.0.1` hotfix regresses Git workflows, prepare a narrower follow-up patch or direct affected users to the previous `1.0.0` VSIX depending on severity.

## 1.0.0 Release Readiness

Current package baseline: `0.0.39`.

Target release: `1.0.0`.

Status: Release completed for `1.0.0` after maintainer approval. The `1.0.0` polish scope is complete, package metadata is bumped to `1.0.0` in `package.json` and `package-lock.json`, automated verification is current, VSIX packaging produced `git-revision-graph-1.0.0.vsix`, and Marketplace publication is complete.

Planning and build references:

- `project-context/docs/release-1.0.0-prioritization.md`
- `project-context/2.build/features/1.0.0-polish-opening.md`
- `project-context/2.build/features/1.0.0-push-choice-loading-polish.md`
- `project-context/2.build/features/1.0.0-push-cancel-refresh-polish.md`
- `project-context/2.build/features/1.0.0-show-merge-commits-view-option.md`
- `project-context/2.build/features/1.0.0-remote-checkout-overwrite-confirmation.md`
- `project-context/2.build/features/1.0.0-show-log-expanded-reference-gap-polish.md`
- `project-context/2.build/features/1.0.0-show-log-comparison-selection-polish.md`
- `project-context/2.build/features/1.0.0-show-log-copy-reference-name.md`
- `project-context/2.build/features/1.0.0-show-log-multi-select-cherry-pick.md`
- `project-context/2.build/features/1.0.0-release-readiness-closure.md`

Release direction:

- Keep the shipped Source Control/editor graph product surface stable.
- Limit scope to small polish adjustments selected one by one.
- Prefer low-risk UX copy, visual consistency, documentation, Marketplace readiness, and release-quality fixes.
- Preserve command IDs, contribution points, view types, multi-repository behavior, conflict guards, webview security boundaries, and the `0.0.39` maintainability boundaries.

Implemented polish:

- The current-branch `Push` toolbar action now opens the push-mode choice without immediately blocking the graph with loading feedback. The existing host-side push workflow and post-push refresh behavior are preserved.
- A canceled current-branch push no longer shows success feedback or schedules a graph reload when the VS Code Git API returns without a remote update.
- The revision graph `View` menu now includes a default-off `Show Merge Commits` option that hides unreferenced merge commits by default while preserving ancestry through graph edges.
- Remote checkout now requires a destructive confirmation before `Override branch if exists` resets an existing local branch.
- Show Log expanded rows now extend the compact graph line through visible reference/stat metadata before the changed-file continuation starts.
- Show Log comparison selections now use matching row emphasis plus a single `Base` badge instead of relying on the left-edge marker alone, and selection now requires `Ctrl` + left-click so plain clicks only expand commits.
- Show Log commit context menus now offer `Copy Reference Name` for commits with loaded references.
- Show Log now allows multi-selection for cherry-pick workflows. When the context-clicked commit is part of a multi-selection, the context menu offers only `Cherry Pick`; the `Base` badge remains constrained to exactly two selected commits. If Git stops on an empty cherry-pick or a previous cherry-pick is still in progress, the extension now offers guarded skip/abort paths or opens Source Control instead of treating the sequence as a generic failure.

Automated verification completed:

- Package metadata confirmed at `1.0.0` in `package.json`, root `package-lock.json`, and root `package-lock.json` package metadata after opening the cycle.
- `git diff --check` passed after opening the `1.0.0` package metadata, changelog, prioritization, feature, and release-readiness artifacts.
- `npm run build` passed after opening the `1.0.0` cycle.
- `npm test` passed with 394 tests after opening the `1.0.0` cycle. This includes `npm run build` through the test script.
- Focused webview shell validation passed with 23 tests after the push loading polish. This includes `npm run build` and test compilation through the focused command.
- `npm test` passed with 394 tests after the push loading polish. This includes `npm run build` through the test script.
- `git diff --check` passed after the push loading polish.
- Focused ref action validation passed with 84 tests after adding the canceled push refresh guard. This includes `npm run build` and test compilation through the focused command.
- `npm test` passed with 395 tests after the canceled push refresh guard. This includes `npm run build` through the test script.
- `git diff --check` passed after the canceled push refresh guard.
- Focused graph, webview shell, and message-validation tests passed with 80 tests after adding the `Show Merge Commits` view option. This includes `npm run build` and test compilation through the focused command.
- `npm test` passed with 396 tests after the `Show Merge Commits` view option. This includes `npm run build` through the test script.
- `git diff --check` passed after the `Show Merge Commits` view option.
- Focused ref action tests passed with 93 tests after adding destructive confirmation before remote checkout overwrites an existing local branch. This includes `npm run build` and test compilation through the focused command.
- `npm test` passed with 398 tests after the remote checkout overwrite confirmation. This includes `npm run build` through the test script.
- `git diff --check` passed after the remote checkout overwrite confirmation.
- Focused Show Log webview shell test passed after extending expanded commit graph lines through visible reference/stat metadata.
- `npm run build` passed after the Show Log expanded-row graph polish.
- `npm test` passed with 398 tests after the Show Log expanded-row graph polish. This includes `npm run build` through the test script.
- `git diff --check` passed after the Show Log expanded-row graph polish.
- Focused Show Log webview shell test passed after adding same-color full-row comparison selection emphasis, a single `Base` badge, and `Ctrl` + left-click-only comparison selection.
- `npm run build` passed after the Show Log comparison selection gesture polish.
- `npm test` passed with 398 tests after the Show Log comparison selection gesture polish. This includes `npm run build` through the test script.
- `git diff --check` passed after the Show Log comparison selection gesture polish.
- Focused Show Log clipboard, message handler, webview shell, and webview message validation tests passed after adding the copy-reference-name context action. This includes `npm run build` and test compilation through the focused command.
- `npm test` passed with 399 tests after the Show Log copy-reference-name context action. This includes `npm run build` through the test script.
- `git diff --check` passed after the Show Log copy-reference-name context action.
- Focused Show Log cherry-pick action, message handler, webview shell, and webview message validation tests passed with 15 tests after adding multi-select cherry-pick support. This includes test compilation through the focused command.
- `npm run build` passed after the Show Log multi-select cherry-pick action.
- `npm test` passed with 403 tests after the Show Log multi-select cherry-pick action. This includes `npm run build` through the test script.
- Focused Git state and Show Log cherry-pick action tests passed with 9 tests after adding the in-progress cherry-pick fallback.
- `npm test` passed with 406 tests after adding the in-progress cherry-pick fallback. This includes `npm run build` through the test script.
- Focused Show Log cherry-pick action tests passed with 10 tests after adding the empty cherry-pick skip fallback.
- `npm test` passed with 410 tests after adding the empty cherry-pick skip fallback. This includes `npm run build` through the test script.
- Package metadata confirmed at `1.0.0` while closing the release.
- `git diff --check` passed after final release-artifact updates.
- VSIX packaging completed after maintainer approval and produced `git-revision-graph-1.0.0.vsix`.
- Marketplace publication for `1.0.0` completed after maintainer approval.

Follow-up verification:

- None for the published `1.0.0` release. Re-run `npm run build`, `npm test`, and `git diff --check` before any follow-up package.

Manual validation completed:

- Maintainer completed final release validation before VSIX packaging and Marketplace publication.

Manual validation focus used for release:

- Confirm graph launch from Source Control, graph load, repository switching, refresh, fetch, scope changes, search, minimap, scroll, zoom, and `Center HEAD`.
- Confirm compare, compare with worktree, unified diff, Show Log, checkout, branch creation, tag creation, sync, pull, push, merge, delete, reset, and conflict guards.
- Confirm Show Log multi-select cherry-pick, empty cherry-pick skip, in-progress cherry-pick abort/open-Source-Control, and normal selection clearing behavior.
- Confirm Compare Results and Show Log remain on-demand editor panels and close with the graph panel.
- Repeat key checks in multi-repository and zero-repository workspaces.

Release gates completed:

- Review of README, CHANGELOG, Marketplace-facing copy, package metadata, and generated VSIX contents completed by the maintainer.
- VSIX packaging completed after maintainer approval.
- Marketplace publication completed after maintainer approval.

Post-release monitoring focus:

- Reports that `1.0.0` polish changed existing graph, Compare Results, Show Log, or Git workflows unexpectedly.
- Reports that version `1.0.0` metadata, README, changelog, screenshots, or Marketplace copy overstate product scope.
- Reports of regressions in areas hardened during `0.0.39`: message routing, ref workflows, backend data loading, webview security, and review-panel actions.

Rollback:

- If a published `1.0.0` regression is found, prepare a narrow `1.0.1` patch or direct affected users to the previous `0.0.39` VSIX depending on severity.
- If Marketplace metadata is incorrect, correct the metadata and publish a follow-up package if required.

## 0.0.39 Release Readiness

Current package baseline: `0.0.38`.

Target release: `0.0.39`.

Status: Release completed for `0.0.39` after maintainer approval. The cohesion, architecture hardening, and coding-practice slices from the maintainability review were implemented, committed, manually smoke-tested in the Extension Development Host, packaged as a VSIX, and published to the Marketplace.

Planning and build references:

- `project-context/docs/release-0.0.39-prioritization.md`
- `project-context/2.build/features/0.0.39-ref-actions-cohesion.md`
- `project-context/2.build/features/0.0.39-revision-graph-backend-cohesion.md`
- `project-context/2.build/features/0.0.39-webview-message-contract-cohesion.md`
- `project-context/2.build/features/0.0.39-show-log-message-cohesion.md`
- `project-context/2.build/features/0.0.39-compare-results-message-cohesion.md`
- `project-context/2.build/features/0.0.39-compare-results-view-state-cohesion.md`
- `project-context/2.build/features/0.0.39-show-log-view-state-cohesion.md`
- `project-context/2.build/features/0.0.39-show-log-load-request-cohesion.md`
- `project-context/2.build/features/0.0.39-show-log-expansion-request-cohesion.md`
- `project-context/2.build/features/0.0.39-show-log-state-lookup-cohesion.md`
- `project-context/2.build/features/0.0.39-show-log-file-action-cohesion.md`
- `project-context/2.build/features/0.0.39-webview-local-resource-roots-hardening.md`
- `project-context/2.build/features/0.0.39-layout-cache-persistence-hardening.md`
- `project-context/2.build/features/0.0.39-webview-security-boundary-hardening.md`
- `project-context/2.build/features/0.0.39-compare-results-item-action-hardening.md`
- `project-context/2.build/features/0.0.39-compare-results-clipboard-boundary-hardening.md`
- `project-context/2.build/features/0.0.39-compare-results-restore-action-hardening.md`
- `project-context/2.build/features/0.0.39-compare-results-worktree-refresh-hardening.md`
- `project-context/2.build/features/0.0.39-show-log-clipboard-boundary-hardening.md`
- `project-context/2.build/features/0.0.39-show-log-remote-commit-action-hardening.md`
- `project-context/2.build/features/0.0.39-show-log-reset-action-hardening.md`
- `project-context/2.build/features/0.0.39-show-log-compare-ui-boundary-hardening.md`
- `project-context/2.build/features/0.0.39-shared-clipboard-writer-code-quality.md`
- `project-context/2.build/features/0.0.39-change-target-path-code-quality.md`
- `project-context/2.build/features/0.0.39-revision-log-entry-test-factory-code-quality.md`
- `project-context/2.build/features/0.0.39-compare-result-item-test-factory-code-quality.md`
- `project-context/2.build/features/0.0.39-abort-error-helper-code-quality.md`
- `project-context/2.build/features/0.0.39-git-error-detail-helper-code-quality.md`
- `project-context/2.build/features/0.0.39-git-exit-code-helper-code-quality.md`
- `project-context/2.build/features/0.0.39-remote-name-normalization-code-quality.md`
- `project-context/2.build/features/0.0.39-short-commit-hash-helper-code-quality.md`
- `project-context/2.build/features/0.0.39-package-manifest-test-helper-code-quality.md`
- `project-context/2.build/features/0.0.39-git-error-test-factory-code-quality.md`
- `project-context/2.build/features/0.0.39-webview-short-commit-hash-helper-code-quality.md`
- `project-context/2.build/features/0.0.39-release-readiness-closure.md`

Candidate direction:

- Improve functional cohesion around `RevisionGraphController` by extracting message dispatch, fetch handling, and tracing where a focused slice can preserve behavior.
- Improve cohesion around ref workflows by splitting broad action families while keeping command-facing APIs stable.
- Improve architectural cohesion around `RevisionGraphBackend` if a slice needs narrower graph snapshot, log, diff/detail, or ancestry ports.
- Introduce shared host/webview message builders or constants before renaming or changing message payloads.
- Reduce review-panel coupling by extracting Show Log message dispatch from panel lifecycle when the slice can preserve existing behavior.
- Reduce review-panel coupling by extracting Compare Results message dispatch from panel lifecycle when the slice can preserve existing behavior.
- Reduce review-panel coupling by extracting Compare Results webview state mapping from panel lifecycle when the slice can preserve existing behavior.
- Reduce review-panel coupling by extracting Show Log webview state mapping from shared state/cache helpers and panel lifecycle when the slice can preserve existing behavior.
- Reduce Show Log load coupling by extracting request sequencing and cancellation from panel lifecycle when the slice can preserve existing behavior.
- Reduce Show Log expansion coupling by extracting commit changed-file request sequencing from panel lifecycle when the slice can preserve existing behavior.
- Reduce Show Log action coupling by extracting state lookup and webview change ID parsing from panel actions when the slice can preserve existing behavior.
- Reduce Show Log file action coupling by extracting file diff, parent-hash fallback, and path selection helpers from panel actions when the slice can preserve existing behavior.
- Harden webview architecture by making local resource access explicit and denying local resource roots where the shipped webviews do not load local files.
- Harden activation architecture by moving revision graph layout cache persistence, debounce, and workspace-state recovery out of the extension entrypoint.
- Harden webview security boundaries by moving nonce and CSP construction out of revision graph renderer internals and into a shared host-facing helper.
- Harden Compare Results panel architecture by moving item diff and clipboard action policy out of the editor panel provider.
- Harden Compare Results clipboard architecture by moving selected-item copy and clipboard access out of the editor panel provider.
- Harden Compare Results restore architecture by moving destructive restore confirmation, execution, and error translation out of the editor panel provider.
- Harden Compare Results post-restore architecture by moving worktree diff refresh loading out of the editor panel provider.
- Harden Show Log remote commit architecture by moving GitHub URL opening and no-remote fallback behavior out of the editor panel provider.
- Harden Show Log reset architecture by moving reset-to-commit workflow setup out of the editor panel provider.
- Harden Show Log compare architecture by moving commit-compare UI adapter setup out of the editor panel provider.
- Harden Show Log clipboard architecture by moving selected file/commit copy and clipboard access out of the editor panel provider.
- Improve clipboard action coding quality by sharing the default VS Code clipboard writer instead of duplicating fallback adapters.
- Improve renamed-file path coding quality by reusing the shared change target URI helper across Compare Results and Show Log helpers.
- Improve Show Log test coding quality by sharing a focused `RevisionLogEntry` factory across repeated fixtures.
- Improve Compare Results test coding quality by sharing a focused `CompareResultItem` factory across repeated fixtures.
- Improve cancellation coding quality by sharing AbortError creation, throwing, and detection helpers.
- Improve Git error coding quality by keeping missing-upstream detection with shared error detail helpers.
- Improve Git error coding quality by keeping exit-code matching with shared error detail helpers.
- Improve ref action coding quality by sharing remote-name normalization across configured remotes and remote-ref fallbacks.
- Improve commit label coding quality by sharing host-side short hash formatting.
- Improve package manifest test coding quality by sharing manifest loading and typing in one helper.
- Improve ref action test coding quality by sharing Git-like error fixtures.
- Improve revision graph webview coding quality by sharing short commit hash formatting in the runtime script.
- Close the `0.0.39` cycle with release-readiness notes, changelog coverage, and final automated verification.
- Preserve current product surface, command IDs, view types, menu contributions, multi-repository behavior, conflict guards, and load-only graph refresh behavior.

Automated verification completed:

- `git diff --check` passed after opening the `0.0.39` planning artifacts and bumping `package.json` / `package-lock.json`.
- `npm run build` passed after the first revision graph controller cohesion slice.
- Focused dispatcher/message/fetch/refresh tests passed with 21 tests after extracting message dispatch, fetch workflow, and load tracing.
- `npm test` passed with 293 tests after the first revision graph controller cohesion slice. This includes `npm run build` through the test script.
- `git diff --check` passed after the first revision graph controller cohesion slice and verification artifact updates.
- `npm run build` passed after the second revision graph controller cohesion slice extracted validated graph action handling.
- Focused handler/dispatcher/message validation tests passed with 12 tests after extracting `RevisionGraphMessageHandler`.
- `npm test` passed with 296 tests after the second revision graph controller cohesion slice. This includes `npm run build` through the test script.
- `git diff --check` passed after the second revision graph controller cohesion slice and verification artifact updates.
- `npm run build` passed after consolidating repository-required handler actions in the third revision graph controller cohesion slice.
- Focused handler/dispatcher/message validation tests passed with 14 tests after adding current-repository guard coverage.
- `npm test` passed with 298 tests after the third revision graph controller cohesion slice. This includes `npm run build` through the test script.
- `git diff --check` passed after the third revision graph controller cohesion slice and verification artifact updates.
- `npm run build` passed after the fourth revision graph controller cohesion slice extracted remote tag publication handling.
- Focused handler/remote-tag/message validation tests passed with 24 tests after extracting `RevisionGraphRemoteTagWorkflow`.
- `npm test` passed with 302 tests after the fourth revision graph controller cohesion slice. This includes `npm run build` through the test script.
- `git diff --check` passed after the fourth revision graph controller cohesion slice and verification artifact updates.
- `npm run build` passed after the fifth revision graph controller cohesion slice extracted current `HEAD` sync/pull/push handling.
- Focused handler/current-head/remote-tag/ref-action/message validation tests passed with 111 tests after extracting `RevisionGraphCurrentHeadWorkflow`.
- `npm test` passed with 306 tests after the fifth revision graph controller cohesion slice. This includes `npm run build` through the test script.
- `git diff --check` passed after the fifth revision graph controller cohesion slice and verification artifact updates.
- `npm run build` passed after the sixth revision graph controller cohesion slice extracted common reference action handling.
- Focused handler/ref-action/current-head/remote-tag/message validation tests passed with 114 tests after extracting `RevisionGraphRefActionWorkflow`.
- `npm test` passed with 309 tests after the sixth revision graph controller cohesion slice. This includes `npm run build` through the test script.
- `git diff --check` passed after the sixth revision graph controller cohesion slice and verification artifact updates.
- `npm run build` passed after the seventh revision graph controller cohesion slice extracted repository picking and projection option handling.
- Focused handler/view-state/ref-action/current-head/remote-tag/message validation tests passed with 117 tests after extracting `RevisionGraphViewStateWorkflow`.
- `npm test` passed with 312 tests after the seventh revision graph controller cohesion slice. This includes `npm run build` through the test script.
- `git diff --check` passed after the seventh revision graph controller cohesion slice and verification artifact updates.
- `npm run build` passed after the first ref actions cohesion slice extracted compare workflows.
- Focused ref action/ref command/revision graph workflow tests passed with 98 tests after extracting compare workflows.
- `npm test` passed with 312 tests after the first ref actions cohesion slice. This includes `npm run build` through the test script.
- `git diff --check` passed after the first ref actions cohesion slice and verification artifact updates.
- `npm run build` passed after the second ref actions cohesion slice extracted tag workflows.
- `npm test` passed with 312 tests after the second ref actions cohesion slice extracted tag workflows. This includes `npm run build` through the test script.
- `git diff --check` passed after the second ref actions cohesion slice extracted tag workflows.
- `npm run build` passed after the third ref actions cohesion slice extracted checkout and branch creation workflows.
- `npm test` passed with 312 tests after the third ref actions cohesion slice extracted checkout and branch creation workflows. This includes `npm run build` through the test script.
- `git diff --check` passed after the third ref actions cohesion slice extracted checkout and branch creation workflows.
- `npm run build` passed after the fourth ref actions cohesion slice extracted branch publication and current branch sync/pull/push workflows.
- `npm test` passed with 312 tests after the fourth ref actions cohesion slice extracted branch publication and current branch sync/pull/push workflows. This includes `npm run build` through the test script.
- `git diff --check` passed after the fourth ref actions cohesion slice extracted branch publication and current branch sync/pull/push workflows.
- `npm run build` passed after the fifth ref actions cohesion slice extracted merge and merge-abort workflows.
- `npm test` passed with 312 tests after the fifth ref actions cohesion slice extracted merge and merge-abort workflows. This includes `npm run build` through the test script.
- `git diff --check` passed after the fifth ref actions cohesion slice extracted merge and merge-abort workflows.
- `npm run build` passed after the sixth ref actions cohesion slice extracted current branch reset workflows.
- `npm test` passed with 312 tests after the sixth ref actions cohesion slice extracted current branch reset workflows. This includes `npm run build` through the test script.
- `git diff --check` passed after the sixth ref actions cohesion slice extracted current branch reset workflows.
- `npm run build` passed after the seventh ref actions cohesion slice extracted delete workflows.
- `npm test` passed with 312 tests after the seventh ref actions cohesion slice extracted delete workflows. This includes `npm run build` through the test script.
- `git diff --check` passed after the seventh ref actions cohesion slice extracted delete workflows.
- `npm run build` passed after the first revision graph backend cohesion slice extracted revision log loading and narrowed backend contracts.
- `npm test` passed with 312 tests after the first revision graph backend cohesion slice extracted revision log loading and narrowed backend contracts. This includes `npm run build` through the test script.
- `git diff --check` passed after the first revision graph backend cohesion slice extracted revision log loading, narrowed backend contracts, and updated verification artifacts.
- Focused backend tests passed with 6 tests after the second revision graph backend cohesion slice extracted unified diff and commit detail document loading.
- `npm test` passed with 314 tests after the second revision graph backend cohesion slice extracted unified diff and commit detail document loading. This includes `npm run build` through the test script.
- `git diff --check` passed after the second revision graph backend cohesion slice extracted unified diff and commit detail document loading and updated verification artifacts.
- Focused backend tests passed with 7 tests after the third revision graph backend cohesion slice extracted merge-blocked target analysis.
- `npm test` passed with 315 tests after the third revision graph backend cohesion slice extracted merge-blocked target analysis. This includes `npm run build` through the test script.
- `git diff --check` passed after the third revision graph backend cohesion slice extracted merge-blocked target analysis and updated verification artifacts.
- Focused backend tests passed with 7 tests after the fourth revision graph backend cohesion slice extracted graph snapshot loading and caching.
- `npm test` passed with 315 tests after the fourth revision graph backend cohesion slice extracted graph snapshot loading and caching. This includes `npm run build` through the test script.
- `git diff --check` passed after the fourth revision graph backend cohesion slice extracted graph snapshot loading and caching and updated verification artifacts.
- Focused host message, view-state workflow, and revision graph webview tests passed with 29 tests after the first webview message contract cohesion slice added host message builders.
- `npm test` passed with 318 tests after the first webview message contract cohesion slice added host message builders. This includes `npm run build` through the test script.
- `git diff --check` passed after the first webview message contract cohesion slice added host message builders and updated verification artifacts.
- Focused revision graph webview and webview message validation tests passed with 30 tests after the second webview message contract cohesion slice added webview-to-host message builders.
- `npm test` passed with 318 tests after the second webview message contract cohesion slice added webview-to-host message builders. This includes `npm run build` through the test script.
- `git diff --check` passed after the second webview message contract cohesion slice added webview-to-host message builders and updated verification artifacts.
- Focused Show Log message handler, webview message validation, and Show Log webview tests passed with 11 tests after extracting Show Log message dispatch from the panel provider. This includes `npm run build` through the focused validation command.
- `npm test` passed with 321 tests after extracting Show Log message dispatch from the panel provider. This includes `npm run build` through the test script.
- `git diff --check` passed after extracting Show Log message dispatch and updating verification artifacts.
- Focused Compare Results message handler, webview message validation, and Compare Results webview tests passed with 11 tests after extracting Compare Results message dispatch from the panel provider. This includes `npm run build` through the focused validation command.
- `npm test` passed with 323 tests after extracting Compare Results message dispatch from the panel provider. This includes `npm run build` through the test script.
- `git diff --check` passed after extracting Compare Results message dispatch and updating verification artifacts.
- Focused Compare Results view-state, shared-state, webview, and message handler tests passed with 13 tests after extracting Compare Results webview state mapping from the panel provider. This includes `npm run build` through the focused validation command.
- `npm test` passed with 327 tests after extracting Compare Results webview state mapping from the panel provider. This includes `npm run build` through the test script.
- `git diff --check` passed after extracting Compare Results webview state mapping and updating verification artifacts.
- Focused Show Log shared-state, view-state, webview, lane, and message handler tests passed with 12 tests after extracting Show Log webview state mapping from shared helpers and the panel provider. This includes `npm run build` through the focused validation command.
- `npm test` passed with 327 tests after extracting Show Log webview state mapping from shared helpers and the panel provider. This includes `npm run build` through the test script.
- `git diff --check` passed after extracting Show Log webview state mapping and updating verification artifacts.
- Focused Show Log load request, shared-state, message handler, and webview tests passed with 15 tests after extracting Show Log load request tracking from the panel provider. This includes `npm run build` through the focused validation command.
- `npm test` passed with 332 tests after extracting Show Log load request tracking from the panel provider. This includes `npm run build` through the test script.
- `git diff --check` passed after extracting Show Log load request tracking and updating verification artifacts.
- Focused Show Log expansion request, load request, shared-state, message handler, and webview tests passed with 18 tests after extracting Show Log commit expansion request tracking from the panel provider. This includes `npm run build` through the focused validation command.
- `npm test` passed with 335 tests after extracting Show Log commit expansion request tracking from the panel provider. This includes `npm run build` through the test script.
- `git diff --check` passed after extracting Show Log commit expansion request tracking and updating verification artifacts.
- Focused Show Log state lookup, shared-state, message handler, and webview tests passed with 14 tests after extracting Show Log state lookup from panel actions. This includes `npm run build` through the focused validation command.
- `npm test` passed with 339 tests after extracting Show Log state lookup from panel actions. This includes `npm run build` through the test script.
- `git diff --check` passed after extracting Show Log state lookup and updating verification artifacts.
- Focused Show Log file action, state lookup, message handler, shared-state, and webview tests passed with 20 tests after extracting Show Log file action helpers from panel actions. This includes `npm run build` through the focused validation command.
- `npm test` passed with 345 tests after extracting Show Log file action helpers from panel actions. This includes `npm run build` through the test script.
- `git diff --check` passed after extracting Show Log file action helpers and updating verification artifacts.
- Focused webview option and webview rendering tests passed with 28 tests after centralizing script-enabled webview options and denying local resource roots. This includes `npm run build` through the focused validation command.
- `npm test` passed with 347 tests after centralizing script-enabled webview options and denying local resource roots. This includes `npm run build` through the test script.
- `git diff --check` passed after centralizing script-enabled webview options and updating verification artifacts.
- Focused revision graph layout cache persistence and graph tests passed with 54 tests after moving layout cache persistence out of `extension.ts`. This includes `npm run build` through the focused validation command.
- `npm test` passed with 352 tests after moving layout cache persistence out of `extension.ts`. This includes `npm run build` through the test script.
- `git diff --check` passed after moving layout cache persistence out of `extension.ts` and updating verification artifacts.
- Focused webview security and webview rendering tests passed with 35 tests after centralizing nonce and CSP construction outside revision graph renderer internals. This includes `npm run build` through the focused validation command.
- `npm test` passed with 353 tests after centralizing nonce and CSP construction outside revision graph renderer internals. This includes `npm run build` through the test script.
- `git diff --check` passed after centralizing nonce and CSP construction and updating verification artifacts.
- Focused Compare Results item action, view-state, message handler, and webview tests passed with 15 tests after moving item diff and clipboard action policy out of the provider. This includes `npm run build` through the focused validation command.
- `npm test` passed with 360 tests after moving Compare Results item diff and clipboard action policy out of the provider. This includes `npm run build` through the test script.
- `git diff --check` passed after moving Compare Results item action policy out of the provider and updating verification artifacts.
- Focused Compare Results restore action, item action, view-state, message handler, and webview tests passed with 21 tests after moving restore confirmation and execution policy out of the provider. This includes `npm run build` through the focused validation command.
- `npm test` passed with 366 tests after moving Compare Results restore confirmation and execution policy out of the provider. This includes `npm run build` through the test script.
- `git diff --check` passed after moving Compare Results restore action policy out of the provider and updating verification artifacts.
- Focused Show Log remote commit action, remote URL, state lookup, message handler, and webview tests passed with 13 tests after moving GitHub external-open behavior out of the provider. This includes `npm run build` through the focused validation command.
- `npm test` passed with 368 tests after moving Show Log GitHub external-open behavior out of the provider. This includes `npm run build` through the test script.
- `git diff --check` passed after moving Show Log remote commit action behavior out of the provider and updating verification artifacts.
- Focused Show Log reset action, message handler, state lookup, and webview tests passed with 13 tests after moving reset-to-commit workflow setup out of the provider. This includes `npm run build` through the focused validation command.
- `npm test` passed with 373 tests after moving Show Log reset-to-commit workflow setup out of the provider. This includes `npm run build` through the test script.
- `git diff --check` passed after moving Show Log reset-to-commit workflow setup out of the provider and updating verification artifacts.
- Focused Show Log commit compare, message handler, and webview tests passed with 11 tests after moving commit-compare UI adapter setup out of the provider. This includes `npm run build` through the focused validation command.
- `npm test` passed with 375 tests after moving Show Log commit-compare UI adapter setup out of the provider. This includes `npm run build` through the test script.
- `git diff --check` passed after moving Show Log commit-compare UI adapter setup out of the provider and updating verification artifacts.
- Focused Compare Results worktree refresh, shared-state, restore action, message handler, and webview tests passed with 18 tests after moving post-restore worktree diff refresh loading out of the provider. This includes `npm run build` through the focused validation command.
- `npm test` passed with 378 tests after moving Compare Results post-restore worktree diff refresh loading out of the provider. This includes `npm run build` through the test script.
- `git diff --check` passed after moving Compare Results post-restore worktree diff refresh loading out of the provider and updating verification artifacts.
- Focused Compare Results clipboard, item action, message handler, and webview tests passed with 14 tests after moving selected-item copy and clipboard access out of the provider. This includes `npm run build` through the focused validation command.
- `npm test` passed with 381 tests after moving Compare Results selected-item copy and clipboard access out of the provider. This includes `npm run build` through the test script.
- `git diff --check` passed after moving Compare Results selected-item copy and clipboard access out of the provider and updating verification artifacts.
- Focused Show Log clipboard, file action, state lookup, message handler, and webview tests passed with 18 tests after moving selected file/commit copy and clipboard access out of the provider. This includes `npm run build` through the focused validation command.
- `npm test` passed with 385 tests after moving Show Log selected file/commit copy and clipboard access out of the provider. This includes `npm run build` through the test script.
- `git diff --check` passed after moving Show Log selected file/commit copy and clipboard access out of the provider and updating verification artifacts.
- Focused Compare Results clipboard, Show Log clipboard, and message handler tests passed with 12 tests after consolidating the default VS Code clipboard writer. This includes `npm run build` through the focused validation command.
- `npm test` passed with 385 tests after consolidating the default VS Code clipboard writer. This includes `npm run build` through the test script.
- `git diff --check` passed after consolidating the default VS Code clipboard writer and updating verification artifacts.
- Focused Compare Results item action, Compare Results view-state, Compare Results clipboard, Show Log file action, and Show Log clipboard tests passed with 24 tests after reusing the shared change target URI helper. This includes `npm run build` through the focused validation sequence.
- `npm test` passed with 385 tests after reusing the shared change target URI helper. This includes `npm run build` through the test script.
- `git diff --check` passed after reusing the shared change target URI helper and updating verification artifacts.
- Focused Show Log commit compare, clipboard, reset, lane, and file action tests passed with 24 tests after sharing the `RevisionLogEntry` test factory. This includes `npm run build` through the focused validation sequence.
- `npm test` passed with 385 tests after sharing the `RevisionLogEntry` test factory. This includes `npm run build` through the test script.
- `git diff --check` passed after sharing the `RevisionLogEntry` test factory and updating verification artifacts.
- Focused Compare Results item action, restore action, clipboard, and message handler tests passed with 18 tests after sharing the `CompareResultItem` test factory. This includes `npm run build` through the focused validation sequence.
- `npm test` passed with 385 tests after sharing the `CompareResultItem` test factory. This includes `npm run build` through the test script.
- `git diff --check` passed after sharing the `CompareResultItem` test factory and updating verification artifacts.
- Focused error helper, Git exec, render coordinator, revision graph layout/backend, and Show Log load request tests passed with 72 tests after sharing AbortError helpers. This includes `npm run build` through the focused validation sequence.
- `npm test` passed with 388 tests after sharing AbortError helpers. This includes `npm run build` through the test script.
- `git diff --check` passed after sharing AbortError helpers and updating verification artifacts.
- Focused error detail and ref action tests passed with 87 tests after moving missing-upstream detection into the shared error detail helper module. This includes `npm run build` through the focused validation sequence.
- `npm test` passed with 392 tests after moving missing-upstream detection. This includes `npm run build` through the test script.
- `git diff --check` passed after moving missing-upstream detection and updating verification artifacts.
- Focused error detail and revision graph backend tests passed with 12 tests after centralizing Git exit-code matching. This includes `npm run build` through the focused validation sequence.
- `npm test` passed with 393 tests after centralizing Git exit-code matching. This includes `npm run build` through the test script.
- `git diff --check` passed after centralizing Git exit-code matching and updating verification artifacts.
- Focused ref action, ref command, and revision graph ref workflow tests passed with 97 tests after centralizing remote-name normalization. This includes `npm run build` through the focused validation sequence.
- `npm test` passed with 393 tests after centralizing remote-name normalization. This includes `npm run build` through the test script.
- `git diff --check` passed after centralizing remote-name normalization and updating verification artifacts.
- Focused commit hash, ref presentation, ref action, Show Log reset, revision graph message handler, and revision graph webview helper tests passed with 107 tests after centralizing host-side short commit hash formatting. This includes `npm run build` through the focused validation sequence.
- `npm test` passed with 394 tests after centralizing host-side short commit hash formatting. This includes `npm run build` through the test script.
- `git diff --check` passed after centralizing host-side short commit hash formatting and updating verification artifacts.
- Focused package manifest tests passed with 10 tests after sharing manifest loading and typing in the manifest test suite. This includes `npm run build` through the focused validation sequence.
- `npm test` passed with 394 tests after sharing package manifest test loading. This includes `npm run build` through the test script.
- `git diff --check` passed after sharing package manifest test loading and updating verification artifacts.
- Focused ref action and error detail tests passed with 88 tests after sharing Git-like error fixtures. This includes `npm run build` through the focused validation sequence.
- `npm test` passed with 394 tests after sharing Git-like error fixtures. This includes `npm run build` through the test script.
- `git diff --check` passed after sharing Git-like error fixtures and updating verification artifacts.
- Focused revision graph webview, webview helper, and message handler tests passed with 35 tests after sharing short commit hash formatting in the webview runtime. This includes `npm run build` through the focused validation sequence.
- `npm test` passed with 394 tests after sharing webview short commit hash formatting. This includes `npm run build` through the test script.
- `git diff --check` passed after sharing webview short commit hash formatting and updating verification artifacts.
- `npm run build` passed after adding the `0.0.39` changelog and release-readiness closure notes.
- `npm test` passed with 394 tests after adding the `0.0.39` changelog and release-readiness closure notes. This includes `npm run build` through the test script.
- `git diff --check` passed after adding the `0.0.39` changelog and release-readiness closure notes.

Automated verification pending:

- None for the released `0.0.39` state. Re-run `npm run build`, `npm test`, and `git diff --check` if additional source or documentation changes are made for a follow-up release.

Manual validation completed:

- Extension Development Host smoke validation completed before publication.
- Graph launch from Source Control was verified in a Git workspace.
- Graph load, repository switching, refresh, fetch, scope changes, search, minimap, scroll, zoom, and `Center HEAD` were covered by the smoke pass.
- Compare, compare with worktree, unified diff, Show Log, checkout, branch creation, tag creation, sync, pull, push, merge, delete, reset, and conflict guards were covered by the smoke pass.
- Compare Results and Show Log were verified as on-demand editor panels that close with the graph panel.
- Multi-repository and zero-repository checks were included in the smoke pass.

Release gates completed:

- Maintainer approval was granted before packaging and publication.
- VSIX packaging completed and generated metadata/package contents were reviewed before upload.
- Marketplace publication for `0.0.39` completed.

Post-release monitoring focus:

- Reports of graph actions not routing after controller/message dispatch extraction.
- Reports of duplicate or missing full graph loads after Git operations.
- Reports of command, graph, Compare Results, or Show Log workflows drifting after ref action splits.
- Reports of stale graph, log, diff, or commit detail data after backend port changes.
- Reports of host/webview message validation rejecting valid shipped actions.
- Reports of Show Log panel actions not routing after message dispatch extraction.
- Reports of Compare Results panel actions not routing after message dispatch extraction.
- Reports of Compare Results labels, rename paths, or item actions drifting after webview state mapping extraction.
- Reports of Show Log summaries, reference labels, inline changes, or lane topology drifting after webview state mapping extraction.
- Reports of stale Show Log results, stuck loading states, or missing cancellation after load request tracking extraction.
- Reports of stale Show Log changed-file expansion data after commit expansion request tracking extraction.
- Reports of Show Log file actions, commit detail actions, or clipboard actions ignoring valid selected commits/files after state lookup extraction.
- Reports of Show Log file diffs using the wrong parent ref, worktree ref, copied filename, or copied full path after file action helper extraction.
- Reports of Show Log copy file name, copy full path, or copy commit hash actions writing stale or missing values after clipboard boundary extraction.
- Reports of Compare Results or Show Log copy actions failing after shared clipboard writer cleanup.
- Reports of graph, Compare Results, or Show Log webviews failing to render after local resource roots were denied.
- Reports of revision graph layout cache not restoring across extension sessions or writing too often after cache persistence extraction.
- Reports of graph, Compare Results, or Show Log webview scripts being blocked by CSP after nonce/CSP helper extraction.
- Reports of Compare Results file actions using the wrong diff ref, copied filename, or copied full path after item action helper extraction.
- Reports of Compare Results copy file name or copy full path actions writing stale, missing, or incorrectly ordered values after clipboard boundary extraction.
- Reports of Compare Results restore confirmation, restore execution, or post-restore refresh drifting after restore action helper extraction.
- Reports of Compare Results post-restore refresh not closing when aligned or not retaining remaining worktree differences after worktree refresh extraction.
- Reports of Show Log GitHub commit links not opening or no-GitHub-remote feedback drifting after remote commit action extraction.
- Reports of Show Log reset-to-commit prompts, commit labels, or post-reset refresh behavior drifting after reset action extraction.
- Reports of Show Log commit compare no-difference messages or compare-error feedback drifting after compare UI boundary extraction.

Rollback:

- If a behavior-preserving extraction causes shipped workflow regressions, revert the narrow extraction while preserving unrelated tests and documentation.
- If backend port extraction changes cancellation or Git command timing, restore the previous shared backend path for the affected operation.
- If shared message builders cause host/webview compatibility drift, restore the previous literal message contract and reintroduce shared typing in a smaller slice.
- If Show Log dispatch extraction causes review-panel action regressions, restore the previous provider-local switch while preserving message validation tests.
- If Compare Results dispatch extraction causes review-panel action regressions, restore the previous provider-local switch while preserving message validation tests.
- If Compare Results state mapping extraction causes review-panel display or action lookup regressions, restore the previous provider-local mapping while preserving view-state tests.
- If Show Log state mapping extraction causes review-panel display regressions, restore the previous shared mapping while preserving view-state tests.
- If Show Log load request extraction causes stale response or cancellation regressions, restore the previous provider-local request counters while preserving load request tests.
- If Show Log expansion request extraction causes stale changed-file response regressions, restore the previous provider-local expansion counter while preserving expansion request tests.
- If Show Log state lookup extraction causes file or commit action regressions, restore the previous provider-local lookup logic while preserving state lookup tests.
- If Show Log file action extraction causes file diff or clipboard regressions, restore the previous provider-local file action logic while preserving file action tests.
- If Show Log clipboard boundary extraction causes copy regressions, restore the previous provider-local clipboard writes while preserving clipboard action tests.
- If shared clipboard writer cleanup causes copy regressions, restore the previous per-module default clipboard adapters while preserving clipboard action tests.
- If local resource root hardening blocks a required shipped webview asset, explicitly grant the narrow asset root or temporarily restore the previous webview options while preserving helper tests.
- If layout cache persistence extraction causes cache restore or save regressions, restore the previous activation-local persistence flow while preserving focused cache persistence tests.
- If webview security helper extraction causes CSP regressions, restore the previous per-webview CSP literals while preserving nonce and CSP tests.
- If Compare Results item action extraction causes diff or clipboard regressions, restore the previous provider-local item action logic while preserving item action tests.
- If Compare Results clipboard boundary extraction causes copy regressions, restore the previous provider-local clipboard writes while preserving clipboard action tests.
- If Compare Results restore action extraction causes restore or refresh regressions, restore the previous provider-local restore logic while preserving restore action tests.
- If Compare Results worktree refresh extraction causes post-restore refresh regressions, restore the previous provider-local diff refresh logic while preserving worktree refresh tests.
- If Show Log remote commit action extraction causes GitHub link regressions, restore the previous provider-local external-open logic while preserving remote commit action tests.
- If Show Log reset action extraction causes reset prompt or refresh regressions, restore the previous provider-local reset setup while preserving reset action tests.
- If Show Log compare UI boundary extraction causes compare feedback regressions, restore the previous provider-local UI adapter setup while preserving compare helper tests.

## 0.0.38 Release Readiness

Current package baseline: `0.0.37`.

Target release: `0.0.38`.

Status: Deliver phase is open for `0.0.38`. The maintainer-approved load-only revision graph refresh simplification is implemented, the package version has been bumped to `0.0.38`, and automated verification is current. VSIX packaging and Marketplace publication have not been performed for `0.0.38`.

Planning and build references:

- `project-context/2.build/features/0.0.38-load-only-revision-graph-refresh.md`

Candidate change set:

- Remove incremental revision graph update paths so repository changes, graph actions, scope changes, and manual reloads all use the full graph load path.
- Remove host/webview `patch-metadata` and `patch-workspace-state` message handling.
- Prepare repository event suppression before explicit Git mutations so a single graph action does not schedule an early event-driven load plus a later explicit load.
- Keep prepared repository event suppression active through the suppression window so repeated `state` or `checkout` events from one operation do not schedule extra graph loads.
- Update tests to assert load-only refresh behavior and absence of incremental patch handlers.
- Update `CHANGELOG.md` with the `0.0.38` release notes.

Automated verification completed:

- `npm run build` passed after removing incremental revision graph update paths.
- Focused `revisionGraphRefresh` and `refActions` tests passed after verifying prepared event suppression before explicit Git mutations.
- `npm test` passed with 291 tests after routing revision graph refreshes through the full load path and completing the duplicate-load suppression review. This includes `npm run build` through the test script.
- `git diff --check` passed after the load-only refresh and version `0.0.38` updates.

Automated verification pending:

- None for the implemented `0.0.38` candidate.

Manual validation pending:

- Open a Git workspace in the Extension Development Host and confirm the graph loads with `Loading revision graph...`.
- Exercise manual reload, scope/filter changes, sync, push, pull, merge, abort merge, reset workspace, branch/tag create/delete, and fetch; confirm each operation produces one full graph load rather than a load followed by an update.
- Confirm trace output remains useful with `gitRevisionGraph.traceLoading` enabled.

Release gates pending:

- Run `npm run package:vsix` only after maintainer approval and review generated metadata/package contents.
- Marketplace publication remains with the maintainer and should use `npm run publish:current` only after VSIX/manual smoke validation is acceptable.

Post-release monitoring focus:

- Reports of duplicate `Loading revision graph...` events for one Git operation.
- Reports of slower refreshes after metadata-only changes now that those paths intentionally run the full graph load.
- Reports of stale graph state after rapid repository events, scope changes, refreshes, or fetches.
- Reports of extension-host freezes during large uncached graph loads.

Rollback:

- If the load-only refresh policy causes unacceptable large-repository latency, prepare a patch that restores a narrowly scoped incremental path only for the confirmed low-risk operation.
- If duplicate loads still appear for a specific Git action, prepare a patch that tightens the prepared follow-up suppression window or the action-specific refresh timing.

## 0.0.37 Release Readiness

Current package baseline: `0.0.36`.

Target release: `0.0.37`.

Status: `0.0.37` has been released. The maintainer-selected visual, functional, and cohesion improvements were implemented, verified, packaged, and published before the current `0.0.38` candidate work.

Planning and build references:

- `project-context/docs/release-0.0.37-prioritization.md`
- `project-context/2.build/features/0.0.37-toolbar-visual-harmonization.md`
- `project-context/2.build/features/0.0.37-search-toolbar-icons.md`
- `project-context/2.build/features/0.0.37-zoom-toolbar-icons.md`
- `project-context/2.build/features/0.0.37-central-review-panels.md`
- `project-context/2.build/features/0.0.37-merge-node-and-top-edge-polish.md`
- `project-context/2.build/features/0.0.37-show-log-hover-tooltip.md`
- `project-context/2.build/features/0.0.37-compare-results-review-ux.md`
- `project-context/2.build/features/0.0.37-remove-workspace-led.md`
- `project-context/2.build/features/0.0.37-remote-checkout-current-branch-overwrite.md`
- `project-context/2.build/features/0.0.37-cohesion-cleanup.md`

Candidate direction:

- Treat `0.0.37` as a post-`0.0.36` product-polish and regression-control cycle.
- Implement small visual and functional improvements from maintainer review as individually scoped feature slices.
- Harmonize the revision graph toolbar by giving search and main graph zoom controls the same grouped slot visual treatment as repository actions.
- Replace search navigation and clear glyphs with SVG toolbar icons aligned to the repository-action controls.
- Replace main graph zoom glyphs with SVG toolbar icons aligned to the repository-action and search controls.
- Move Compare Results and Show Log from left-side Activity Bar review views into on-demand editor panels.
- Distinguish merge commits from normal commits in the Show Log compact graph, use solid simple commit markers, and make the top visible Show Log commit read as a graph endpoint.
- Add a Source Control-style hover tooltip for Show Log commit rows using loaded commit metadata, with copy-hash and GitHub commit actions.
- Redesign Compare Results as a compact review queue with explicit comparison context, status filters, rename paths, and visible diff actions.
- Remove the revision graph toolbar workspace-status LED and its redundant Source Control shortcut while preserving dirty-workspace guards.
- Add an explicit `Override branch if exists` option for remote checkout before resetting an existing local branch.
- Remove legacy Compare Results and Show Log visibility contexts and unneeded hide command registrations after the review surfaces moved to editor panels.
- Align active README and AAMAD planning references with the current `project-context/docs/` document location.
- Validate and harden virtualized graph rendering across scroll, zoom, minimap, search, selection, metadata patches, and repository refresh paths.
- Validate and harden worker-thread layout execution, cancellation, synchronous fallback, and packaged worker availability.
- Preserve stale render result guards during rapid refreshes, scope changes, repository events, and manual reloads.
- Add focused regression coverage for any confirmed issue found during `0.0.36` smoke validation.
- Keep the Source Control-launched singleton editor graph and close dependent editor review panels when the graph panel closes.

Automated verification completed:

- `npm run build` passed for the toolbar visual harmonization slice.
- `npm run clean:test && npm run build && tsc -p ./tsconfig.test.json && node --test out-test/test/revisionGraphWebview.test.js` passed for focused webview coverage.
- `npm test` passed with 306 tests for the toolbar visual harmonization, search toolbar icon, and zoom toolbar icon slices. This includes `npm run build` through the test script.
- `npm run clean:test && npm run build && tsc -p ./tsconfig.test.json && node --test out-test/test/packageManifest.test.js out-test/test/viewLayout.test.js out-test/test/revisionGraphWebview.test.js out-test/test/showLogWebview.test.js out-test/test/compareResultsWebview.test.js out-test/test/showLogCommitCompare.test.js` passed for the central review panels slice.
- `npm test` passed with 301 tests after moving Compare Results and Show Log to editor panels and removing obsolete side-view layout tests. This includes `npm run build` through the test script.
- `npm run clean:test && npm run build && tsc -p ./tsconfig.test.json && node --test out-test/test/showLogShared.test.js out-test/test/showLogWebview.test.js out-test/test/showLogLanes.test.js` passed for the Show Log compact graph merge marker and top-lane endpoint correction.
- `npm test` passed with 302 tests after the Show Log compact graph correction. This includes `npm run build` through the test script.
- `git diff --check` passed after the Show Log compact graph correction.
- `npm run clean:test && npm run build && tsc -p ./tsconfig.test.json && node --test out-test/test/showLogShared.test.js out-test/test/showLogWebview.test.js out-test/test/showLogLanes.test.js` passed after solid simple commit markers.
- `npm test` passed with 302 tests after solid simple commit markers. This includes `npm run build` through the test script.
- `git diff --check` passed after solid simple commit markers.
- `npm run clean:test && npm run build && tsc -p ./tsconfig.test.json && node --test out-test/test/showLogShared.test.js out-test/test/showLogWebview.test.js out-test/test/showLogLanes.test.js` passed after reverting all main Revision Graph changes.
- `npm test` passed with 301 tests after reverting all main Revision Graph changes. This includes `npm run build` through the test script.
- `git diff --check` passed after reverting all main Revision Graph changes.
- `npm run clean:test && npm run build && tsc -p ./tsconfig.test.json && node --test out-test/test/showLogShared.test.js out-test/test/showLogWebview.test.js out-test/test/showLogLanes.test.js` passed for the Show Log hover tooltip slice.
- `npm test` passed with 301 tests after the Show Log hover tooltip slice. This includes `npm run build` through the test script.
- `git diff --check` passed after the Show Log hover tooltip slice.
- `npm run clean:test && npm run build && tsc -p ./tsconfig.test.json && node --test out-test/test/showLogShared.test.js out-test/test/showLogWebview.test.js out-test/test/showLogLanes.test.js out-test/test/showLogRemoteCommitUrl.test.js out-test/test/webviewMessageValidation.test.js` passed after making the Show Log hover tooltip interactive.
- `npm test` passed with 304 tests after making the Show Log hover tooltip interactive. This includes `npm run build` through the test script.
- `git diff --check` passed after making the Show Log hover tooltip interactive.
- `npm run clean:test && npm run build && tsc -p ./tsconfig.test.json && node --test out-test/test/compareResultsShared.test.js out-test/test/compareResultsWebview.test.js out-test/test/refPresentation.test.js out-test/test/compareResultRestore.test.js out-test/test/webviewMessageValidation.test.js` passed for the Compare Results review UX slice.
- `npm test` passed with 305 tests after redesigning Compare Results as a compact review queue. This includes `npm run build` through the test script.
- `git diff --check` passed after the Compare Results review UX slice.
- Focused Compare Results verification, `npm test` with 305 tests, and `git diff --check` passed after removing the visible `Open Diff` row button and centering the `...` actions menu.
- `npm run clean:test && npm run build && npx tsc -p ./tsconfig.test.json && node --test out-test/test/revisionGraphWebview.test.js out-test/test/webviewMessageValidation.test.js out-test/test/revisionGraphState.test.js` passed with 50 tests after removing the workspace-status LED and its graph webview Source Control shortcut.
- `npm test` passed with 305 tests and `git diff --check` passed after removing the workspace-status LED and its graph webview Source Control shortcut.
- `npm run clean:test && npm run build && npx tsc -p ./tsconfig.test.json && node --test out-test/test/refActions.test.js out-test/test/refCommands.test.js` passed with 90 tests after adding the remote checkout `Override branch if exists` option.
- `npm test` passed with 307 tests and `git diff --check` passed after adding the remote checkout `Override branch if exists` option.
- `npm run build` passed after the delivery cohesion cleanup.
- `npm test` passed with 307 tests after the delivery cohesion cleanup. This includes `npm run build` through the test script.
- `git diff --check` passed after the delivery cohesion cleanup.
- Version bump to `0.0.37` was applied in `package.json` and `package-lock.json`.
- `git diff --check` passed after the `0.0.37` version bump and release artifact updates.
- `npm run build` passed after the `0.0.37` version bump and release artifact updates.
- `npm test` passed with 307 tests after the `0.0.37` version bump and release artifact updates. This includes `npm run build` through the test script.

Automated verification pending:

- None for the implemented `0.0.37` slices.

Manual validation and release gates:

- Completed for the released `0.0.37` package outside the current Codex turn.

Post-release monitoring focus:

- Reports of blank, partially rendered, or incorrectly virtualized graph regions while scrolling, zooming, searching, or navigating through the minimap.
- Reports of graph layout regressions on branch-heavy, merge-heavy, or wide fan-out repositories.
- Reports of stale graph state after rapid repository events, scope changes, refreshes, or fetches.
- Reports of extension-host freezes during large uncached graph loads.
- Reports that packaged worker files are missing or worker fallback is silently masking runtime failures.

Rollback:

- If a published regression is isolated to worker execution, prepare a patch that routes affected cache-miss layout calls through the synchronous `calculateD3DagSugiyamaLayout` path while preserving the rest of the `d3-dag` layout stack.
- If a published regression is isolated to virtualized rendering, prepare a patch that corrects viewport-window calculations or temporarily disables the problematic virtualized path while preserving graph layout correctness.
- If a published regression is layout correctness-related, prepare a patch that adjusts the `d3-dag` strategy or reverts the affected layout slice while keeping unrelated render coordination fixes if safe.

## 0.0.36 Release Readiness

Current package baseline: `0.0.35`.

Target release: `0.0.36`.

Source baseline for this release review: `c4746ffe2b55a130183def5e95d366efaa4e17fd`.

Status: Release artifacts are prepared for `0.0.36`. The implemented change set since the source baseline focuses on graph layout readability, large-graph webview responsiveness, extension-host responsiveness during layout, and stale render result hardening. Version bump to `0.0.36` has been applied after the maintainer release-prep request. VSIX packaging has generated `git-revision-graph-0.0.36.vsix`. Marketplace publication has not been performed and remains with the maintainer.

Planning and build references:

- `project-context/docs/release-0.0.36-prioritization.md`
- `project-context/2.build/features/alternative-revision-graph-layout-viability.md`
- `project-context/2.build/features/0.0.35-webview-virtualized-rendering.md`
- `project-context/2.build/features/0.0.35-render-request-stale-guard.md`
- `project-context/2.build/features/0.0.35-d3-dag-layout-worker.md`

Candidate change set:

- Replace the prior Git-aware layout implementation with a `d3-dag` Sugiyama layout over the major-operations projection.
- Preserve visible refs, merge commits, fork commits, roots, tips, and compressed hidden linear paths in the projected graph.
- Tune the `d3-dag` decrossing phase with fewer default two-layer passes and a faster DFS decross path for very wide layers.
- Move cache-miss `d3-dag` layout calculation to a Node worker thread and propagate render cancellation through the layout path.
- Add virtualized webview graph rendering so large scenes render the visible node and edge window rather than the full DOM at once.
- Add render request stale guards so obsolete async refreshes cannot apply state or snapshot side effects after a newer refresh supersedes them.
- Rename `projectTortoiseMajorOpsGraph` to `projectMajorOperationsGraph` to remove projection API coupling to TortoiseGit.
- Add regression coverage for the `d3-dag` layout path, worker-thread execution, cache identity, render coordination, and virtualized graph rendering.
- Update README and CHANGELOG for the `0.0.36` release candidate.

Automated verification completed:

- `npm run build` passed after the `0.0.36` version bump and release artifact edits.
- `npm test` passed with 306 tests after the `0.0.36` version bump and release artifact edits. This includes `npm run build` through the test script.
- `git diff --check` passed after the release artifact edits.
- `npm run package:vsix` generated `git-revision-graph-0.0.36.vsix`.
- Generated VSIX SHA-256: `4813c8615967142931cb38b3163a6464b5c5d2237082bff39d66b09b12cff876`.
- Generated VSIX package contents include compiled worker files under `out/revisionGraph/layout/`.

Manual validation pending:

- Install `git-revision-graph-0.0.36.vsix` in an Extension Development Host or local VS Code profile.
- Open a branch-heavy and merge-heavy repository and confirm graph loading, scope changes, search, minimap, scroll, zoom, and `Center HEAD` behavior.
- Confirm the extension host remains responsive during a large uncached graph layout.
- Confirm compare, compare with worktree, unified diff, Show Log, checkout, branch creation, tag creation, sync, merge, delete, reset, and conflict guards still work.
- Confirm `gitRevisionGraph.traceLoading` reports layout and webview timing on a large repository.
- Review generated VSIX metadata before Marketplace upload.

Release gates pending:

- Complete manual Extension Development Host smoke validation.
- Review generated VSIX metadata/package contents before upload.
- Marketplace publication remains with the maintainer and should use `npm run publish:current` only after VSIX/manual smoke validation is acceptable.

Post-release monitoring focus:

- Reports of blank, partially rendered, or incorrectly virtualized graph regions while scrolling or zooming.
- Reports of graph layout regressions on branch-heavy, merge-heavy, or wide fan-out repositories.
- Reports of stale graph state after rapid repository events, scope changes, refreshes, or fetches.
- Reports of extension-host freezes during large uncached graph loads.
- Reports that compiled worker files are missing from packaged installations.

Rollback:

- If a published regression is isolated to worker execution, prepare a patch release that temporarily routes cache-miss layout back through the synchronous `calculateD3DagSugiyamaLayout` path.
- If a published regression is isolated to virtualized rendering, prepare a patch release that fixes viewport-window calculations or disables the problematic virtualized path while preserving the `d3-dag` layout.
- If a published regression is layout correctness-related, prepare a patch release that adjusts the `d3-dag` strategy or reverts the `0.0.36` layout slice while keeping unrelated render coordination fixes if safe.

## 0.0.35 Release Readiness

Current package baseline: `0.0.34`.

Target release: `0.0.35`.

Status: Delivery phase opened for the Git-aware row monotonicity patch. The implementation is complete and verified locally, but the package version has not been bumped yet. VSIX packaging and Marketplace publication are intentionally pending explicit maintainer approval after the version bump.

Planning and build references:

- `project-context/2.build/features/0.0.35-git-aware-row-monotonicity.md`

Candidate change set:

- Enforce topological row order after initial Git-aware row assignment so every projected edge renders descendants above visible parents.
- Prevent shared structural ancestor commits, such as an unlabeled `94...` connector, from appearing above one descendant and below another.
- Move the layout cache namespace to `git-aware-v3` to avoid reusing persisted positions from the previous row strategy.
- Add regression coverage for the structural ancestor row monotonicity case.
- Update CHANGELOG notes for the patch candidate.

Automated verification completed:

- `npm run build` passed for the row monotonicity patch.
- `npm test` passed with 302 tests for the row monotonicity patch. This includes `npm run build` through the test script.
- `git diff --check` passed before release artifact updates.

Manual validation pending:

- Install the `0.0.35` VSIX in an Extension Development Host or local VS Code profile after the version bump.
- Open the private repository that exposed the divergence.
- Confirm the structural `94...` commit renders below both descendant refs that point to it.
- Compare the same region against TortoiseGit and confirm the remaining difference is limited to horizontal lane/routing quality, not inverted ancestry.
- Confirm graph loading, scope changes, search, minimap, and selection still behave normally on the same repository.

Release gates pending:

- Apply the version bump to `0.0.35` in `package.json` and `package-lock.json` after maintainer approval.
- Re-run `npm run build`, `npm test`, and `git diff --check` after the version bump.
- Run `npm run package:vsix` after the version bump and review generated metadata/package contents.
- Marketplace publication remains with the maintainer and should use `npm run publish:current` only after the VSIX/manual smoke check is acceptable.

Post-release monitoring focus:

- Reports of revision graph ancestors appearing above descendants or between descendant refs.
- Reports of new vertical spacing regressions in merge-heavy histories.
- Reports that the graph still differs from TortoiseGit due to horizontal lane assignment or edge crossings around structural commits.

Rollback:

- If a published regression is confirmed, prepare a patch release that reverts the row monotonicity pass and returns the layout cache namespace to the previous strategy only if needed.
- If the issue is limited to a layout readability regression, prefer a follow-up patch that adjusts horizontal placement of structural commits while keeping descendant-above-parent ordering.

## 0.0.34 Release Readiness

Current package baseline: `0.0.33`.

Target release: `0.0.34`.

Status: Release artifacts are prepared for `0.0.34`. The current release candidate is based on the same `0.0.33` implementation baseline, with the version bump to `0.0.34` applied after maintainer release-prep request. Marketplace publication has not been performed and remains with the maintainer.

Automated verification completed:

- `npm run build` passed after the `0.0.34` version bump and release artifact edits.
- `npm test` passed with 288 tests after the `0.0.34` version bump and release artifact edits. This includes `npm run build` through the test script.
- `git diff --check` passed after the `0.0.34` release artifact edits.
- `npm run package:vsix` generated `git-revision-graph-0.0.34.vsix`.

Manual validation pending:

- Confirm the editor graph, Show Log, Compare Results, and Remote workflows behave as expected after the version update.
- Confirm VSIX package contents and metadata before upload.

Release gates pending:

- Complete manual Extension Development Host smoke validation.
- Review the generated VSIX metadata and package contents before upload.
- Marketplace publishing remains with the maintainer.

Post-release monitoring focus:

- Reports of graph layout regressions on branch-heavy repositories.
- Reports of missing or confusing Show Log context-menu actions.
- Reports of accidental or unclear force-push flows.
- Large-repository performance regressions around graph loading, minimap rendering, or edge density.
- Source Control focus restoration after closing secondary review views.

Rollback:

- If a published regression is confirmed, prepare a patch release that reverts the affected `0.0.34` slice while preserving the `0.0.32` editor graph baseline.
- Keep the previous `0.0.32` VSIX available for manual rollback guidance if Marketplace publication has already occurred.

## 0.0.33 Release Readiness

Current package baseline: `0.0.32`.

Target release: `0.0.33`.

Source baseline for this release review: `e6655f586818d1b01cfe40d928600c1b1059f352`.

Status: Release artifacts are prepared for `0.0.33`. The implemented change set since the `0.0.32` baseline focuses on graph performance, Git-aware layout readability, Show Log reset/compare workflows, tracked-branch remote actions, and smaller graph navigation polish. Version bump to `0.0.33` has been applied after maintainer release-prep request. Marketplace publication has not been performed and remains with the maintainer.

Planning and build references:

- `project-context/2.build/features/revision-graph-performance-tortoisegit-analysis.md`
- `project-context/2.build/features/revision-graph-git-aware-layout.md`
- `project-context/2.build/features/0.0.33-show-log-reset-to-commit.md`

Candidate change set:

- Replace the generic ELK layout path with deterministic Git-aware graph layout.
- Remove the `elkjs` runtime dependency.
- Replace full primary-ancestor path precomputation with compact next-pointer state.
- Reduce initial large-graph webview rendering work by removing automatic coordinate mutation and using delegated graph event handling.
- Replace `Reorganize` with `Center HEAD`.
- Add reset zoom controls to the graph toolbar and minimap.
- Center cards with different widths on the same lane coordinate.
- Preserve graph state when returning from secondary review views where no graph refresh is required.
- Add `Reset to this` to Show Log commit context menus with clean-worktree and confirmation guards.
- Add Show Log commit `Compare with Worktree` for unambiguous single-commit actions and show only `Compare` during two-commit selections.
- Add graph `Remote` submenu actions for the tracked current local `HEAD`: pull, push, and sync.
- Add normal, force-with-lease, and force push choices for tracked local branches, with destructive confirmation for force modes.
- Clarify the Marketplace README access path: since `0.0.31`, the graph is launched from VS Code Source Control rather than a dedicated primary Activity Bar icon.
- Exclude internal AAMAD/agent working artifacts from the VSIX package while preserving README, CHANGELOG, docs, media, and compiled extension output.

Automated verification completed:

- `npm run build` passed after the `0.0.33` version bump and release artifact edits.
- `npm test` passed with 288 tests after the `0.0.33` version bump and release artifact edits. This includes `npm run build` through the test script.
- `git diff --check` passed after the `0.0.33` release artifact edits.
- `npm run package:vsix` generated `git-revision-graph-0.0.33.vsix`.
- Generated VSIX SHA-256: `febbc4904a4e8f6fbd89239e38d64e4ef849a4c8b192cae2903e35fc1236dc59`.
- Final VSIX package contents include README, CHANGELOG, docs, media, compiled `out/`, and extension metadata; internal `project-context/`, `AGENTS.md`, and `CHECKLIST.md` are excluded.

Manual validation pending:

- Open TensorFlow, TortoiseGit, Git, VS Code, and another large repository in the Extension Development Host and confirm graph load performance remains acceptable.
- Confirm `Center HEAD` recenters without changing graph coordinates.
- Confirm graph and minimap reset zoom buttons return to the default zoom while preserving the viewport center.
- Confirm cards of different widths remain visually centered on the same lane.
- Confirm closing Show Log or Compare Results restores Source Control without unnecessarily reloading the graph.
- In Show Log, right-click a single commit and confirm `Compare with Worktree`, `Open Commit Details`, and `Reset to this` are available.
- In Show Log, Ctrl/Cmd-click two commits and confirm the commit menu shows only `Compare`.
- Reset a clean local branch from Show Log, then use graph `Remote > Push` with force-with-lease to intentionally propagate the rewritten branch.
- Confirm pull and sync remain available under graph `Remote` for a tracked current local `HEAD`.
- Repeat reset/pull/push flows with dirty workspace or conflicted merge state and confirm guards preserve Source Control handoff.

Release gates pending:

- Complete manual Extension Development Host smoke validation.
- Review the generated VSIX metadata and package contents before upload.
- Marketplace publishing remains with the maintainer.

Post-release monitoring focus:

- Reports of graph layout regressions on branch-heavy repositories.
- Reports of missing or confusing Show Log context-menu actions.
- Reports of accidental or unclear force-push flows.
- Large-repository performance regressions around graph loading, minimap rendering, or edge density.
- Source Control focus restoration after closing secondary review views.

Rollback:

- If a published regression is confirmed, prepare a patch release that reverts the affected `0.0.33` slice while preserving the `0.0.32` editor graph baseline.
- Keep the previous `0.0.32` VSIX available for manual rollback guidance if Marketplace publication has already occurred.

## 0.0.32 Release Readiness

Current package baseline: `0.0.31`.

Target release: `0.0.32`.

Status: Delivery phase opened for the first `0.0.32` candidate slice. The editor panel `Reload` toolbar action is implemented. Version bump to `0.0.32` has been applied after maintainer approval. VSIX packaging and Marketplace publication have not been performed and remain pending explicit maintainer approval.

Release direction:

- Consolidate the Source Control toolbar and singleton editor graph product surface introduced in `0.0.31`.
- Restore any graph toolbar actions that became unavailable after the move from `WebviewView` title actions to the editor `WebviewPanel`, starting with `Reload`.
- Treat the final `0.0.31` manual smoke matrix as the starting regression checklist.
- Patch any discovered editor graph panel, secondary review view, focus restoration, zero-repository, or multi-repository issues.
- Select one bounded graph-parity groundwork slice before implementation.

Planning and build references:

- `project-context/docs/release-0.0.32-prioritization.md`
- `project-context/2.build/features/0.0.32-editor-panel-reload-button.md`

Candidate change set:

- Restore `Reload` in the editor graph toolbar using the existing full-rebuild refresh path.
- Keep `Reload` disabled while blocking toolbar actions are running.
- Update README feature copy and CHANGELOG notes for the restored editor panel action.

Automated verification completed:

- `npm run build` passed for the editor panel `Reload` toolbar action.
- `npm test` passed with 274 tests for the editor panel `Reload` toolbar action.
- `git diff --check` passed for the editor panel `Reload` toolbar action.
- Version bump to `0.0.32` has been applied in `package.json` and `package-lock.json`.
- `npm run build` passed after the `0.0.32` version bump.
- `npm test` passed with 274 tests after the `0.0.32` version bump. This includes `npm run build` through the test script.
- `git diff --check` passed after the `0.0.32` version bump.

Release blockers:

- Manual Extension Development Host validation is still pending for the restored `Reload` toolbar action.
- Final `0.0.32` scope is still open if additional candidate slices are approved.
- VSIX packaging and Marketplace publication are pending explicit maintainer approval.

Manual validation pending:

- Open a Git workspace in the Extension Development Host and click `View Git Revision Graph` in the Source Control toolbar.
- Confirm the editor graph panel shows `Reload` in the graph toolbar.
- Click `Reload` and confirm the graph reloads with loading feedback.
- Confirm `Reload` is disabled while another blocking toolbar action is running.
- Confirm the existing Source Control launch, singleton reveal, repository selection, Compare Results, and Show Log workflows still behave normally.

Post-release monitoring focus:

- Reports that users still cannot find a manual graph reload path in the editor panel.
- Reports that `Reload` does not reflect current repository state after the graph moved to the editor panel.
- Toolbar crowding or layout issues in narrower editor widths.

Release gates pending:

- Confirm final `0.0.32` scope and non-goals.
- Complete manual Extension Development Host smoke validation.
- Run `npm run package:vsix` only after maintainer approval.
- Marketplace publishing remains with the maintainer.

Rollback:

- If a published regression is confirmed, prepare a patch release that reverts the affected `0.0.32` slice while preserving the `0.0.31` Source Control/editor graph baseline when possible.

## 0.0.31 Release Readiness

Current package baseline: `0.0.30`.

Target release: `0.0.31`.

Source baseline for this release review: `c2bd300edcadf0207e6f6cf472c939a33ed164b5`.

Current implementation head reviewed: `f9fdb7539a9756fa606eccd6f61744d6cecb0b7a`.

Status: Release documentation is prepared for `0.0.31`. The implemented change set since the baseline is focused on Source Control workbench integration, the editor graph panel, secondary review view lifecycle, Compare Results/Show Log interaction polish, and the persisted minimap toggle. Version bump, VSIX packaging, and Marketplace publication have not been executed and remain with the maintainer.

Candidate change set:

- Make Source Control the primary workbench entry point through `View Git Revision Graph` in the Source Control toolbar.
- Open or reveal the revision graph as a singleton editor `WebviewPanel`.
- Keep `gitRefs.openRevisionGraph` as a compatibility alias for the editor graph path.
- Remove the dedicated primary graph Activity Bar contribution and the temporary Source Control companion graph view contribution.
- Keep Compare Results and Show Log as on-demand secondary review views while the editor graph panel is open.
- Rename Activity Bar review containers to `Git Revision Graph - Compare` and `Git Revision Graph - Show Logs`.
- Close Compare Results and Show Log when the editor graph panel closes.
- Return focus to Source Control after the last secondary review view is closed.
- Add light and dark Source Control toolbar icon variants.
- Improve Compare Results file interactions with primary diff double-click behavior and clearer context-menu action labels.
- Improve Show Log changed-file interactions with double-click file diff opening.
- Add a persisted `Show Minimap` graph view option.
- Guard graph layout-state reuse with a scene layout key check.

Planning and build references:

- `project-context/1.define/source-control-integration-viability.md`
- `project-context/1.define/source-control-companion-view.md`
- `project-context/1.define/prd.md`
- `project-context/1.define/sad.md`
- `project-context/2.build/features/source-control-companion-view.md`
- `project-context/2.build/features/source-control-editor-panel.md`
- `project-context/2.build/features/source-control-product-surface.md`

Automated verification completed:

- `npm run build` passed for Source Control companion implementation.
- `npm test` passed with 270 tests for Source Control companion implementation.
- `npm run build` passed for Source Control editor panel implementation.
- `npm test` passed with 270 tests for Source Control editor panel implementation.
- `git diff --check` passed for Source Control editor panel implementation.
- `npm run build` passed for Source Control product surface cleanup.
- `npm test` passed with 273 tests for Source Control product surface cleanup.
- `git diff --check` passed for Source Control product surface cleanup.
- `npm run build` passed on 2026-05-17 after the final `0.0.31` documentation review edits.
- `npm test` passed with 273 tests on 2026-05-17 after the final `0.0.31` documentation review edits. This includes `npm run build` through the test script.
- `git diff --check` passed on 2026-05-17 after the final `0.0.31` documentation review edits.

Release blockers:

- Manual Extension Development Host validation is still pending for the final Source Control/editor graph product surface.
- Version bump to `0.0.31` in `package.json` and `package-lock.json` is pending explicit maintainer approval.
- VSIX packaging and Marketplace publication are pending explicit maintainer approval.

Manual validation pending:

- Open a Git workspace in the Extension Development Host and click `View Git Revision Graph` in the Source Control toolbar.
- Re-run the command and confirm it reveals the existing editor graph panel instead of creating duplicates.
- Confirm the editor graph supports refresh, fetch, repository selection, scope changes, search, compare, worktree compare, unified diff, Show Log, checkout, branch creation, tag creation, sync, merge, delete, reset, and conflict recovery workflows.
- Confirm no primary `Git Revision Graph` graph Activity Bar entry appears on a fresh workspace.
- Confirm no Source Control companion `Revision Graph` view appears below native Source Control changes.
- Confirm Compare Results opens only after compare results exist and uses the `Git Revision Graph - Compare` Activity Bar label.
- Confirm Show Log opens from the graph context menu and uses the `Git Revision Graph - Show Logs` Activity Bar label.
- Confirm double-clicking Compare Results file rows opens the primary file diff.
- Confirm double-clicking Show Log changed-file rows opens the expected file diff.
- Confirm Compare Results file context menus show `Compare`, show `Compare with Worktree` only for ref-to-ref results, and omit redundant worktree comparison for worktree result sets.
- Confirm closing Compare Results or Show Log returns the workbench to Source Control without reopening the graph unexpectedly.
- Confirm closing the editor graph panel hides Compare Results and Show Log.
- Toggle `Show Minimap` off and on, then refresh or change graph state and confirm the preference persists without resetting layout unexpectedly.
- Validate zero-repository and multi-repository workspaces.

Release gates pending:

- Complete manual Extension Development Host smoke validation.
- Apply the `0.0.31` version bump only after maintainer approval.
- Run fresh `npm run build` and `npm test` after any version bump.
- Run `npm run package:vsix` only after maintainer approval.
- Marketplace publishing remains with the maintainer.

Post-release monitoring focus:

- Source Control toolbar discoverability and singleton editor panel reveal behavior.
- Reports that the old side-bar graph disappeared unexpectedly for users upgrading from the Activity Bar graph surface.
- Secondary review view lifecycle after graph panel close.
- Focus restoration after closing Compare Results and Show Log.
- Compare Results and Show Log double-click diff routing.
- Minimap toggle persistence and layout-state reuse.

Rollback:

- If a published regression is confirmed, prepare a patch release that reverts the affected `0.0.31` surface change or temporarily restores the previous graph entry point.
- Keep the previous `0.0.30` VSIX available for manual rollback guidance if Marketplace publication has already occurred.

## 0.0.30 Release Readiness

Current package baseline: `0.0.29`.

Target release: `0.0.30`.

Status: Release notes and version bump are complete for `0.0.30`. Source verification passed and the code-quality blockers found during review have been corrected. Package generation and Marketplace publishing remain with the maintainer.

Candidate change set:

- Refresh the revision graph with a full rebuild after local branch deletion so destructive ref mutations do not leave stale graph topology behind.
- Refresh the revision graph with a full rebuild after pull-based sync so visible topology and `HEAD` can advance beyond the current snapshot.
- Keep push-only sync on the lighter metadata-patch path.
- Add Show Log text filtering across commit metadata, hashes, authors, messages, and references.
- Add kind-aware Show Log reference badges for `HEAD`, branches, remotes, tags, and stash refs.
- Add Show Log commit comparison through the existing Compare Results view.
- Add Show Log commit-to-worktree comparison through the existing Compare Results view.
- Coordinate the graph, Show Log, and Compare Results views so secondary views can take focus while the graph is temporarily hidden.

Planning references:

- `project-context/1.define/show-log-commit-context-menu.md`
- `project-context/1.define/show-log-text-filter.md`
- `project-context/2.build/features/0.0.30-reference-deletion-refresh.md`
- `project-context/2.build/features/0.0.30-sync-pull-refresh.md`
- `project-context/2.build/features/0.0.30-show-log-text-filter.md`
- `project-context/2.build/features/0.0.30-show-log-reference-badges.md`
- `project-context/2.build/features/0.0.30-show-log-commit-compare.md`

Automated verification completed:

- `npm run build` passed during the 2026-05-09 code-quality review.
- `npm run build` passed after the 2026-05-09 blocker fixes.
- `npm test` passed with 269 tests after the 2026-05-09 blocker fixes. This includes `npm run build` through the test script.
- `npm run build` passed after the `0.0.30` version bump.
- `npm test` passed with 269 tests after the `0.0.30` version bump. This includes `npm run build` through the test script.
- `git diff --check fdc571eb3f1e1b50bafe01dbc38243615fd92daa..HEAD` passed during the 2026-05-09 code-quality review.
- `git diff --check` passed after the 2026-05-09 blocker fixes.
- `git diff --check` passed after the `0.0.30` version bump.
- `CHANGELOG.md` now includes `0.0.30` release notes.
- Version bump to `0.0.30` has been applied in `package.json` and `package-lock.json`.

Release blockers:

- Manual Extension Development Host validation is still pending.

Resolved blockers:

- Show Log normal-click and keyboard activation now update the commit comparison selection while preserving expand/collapse behavior.
- Debounced Show Log filter messages are scoped to the active Show Log source token, so stale filter text is ignored after source switches.
- `CHANGELOG.md` now contains `0.0.30` release notes.
- `package.json` and `package-lock.json` now declare `0.0.30`.

Manual validation pending:

- Delete a local branch that is visible in the graph and confirm the graph rebuild removes stale branch labels and topology.
- Sync a pull-only branch and a diverged branch, then confirm `HEAD`, visible refs, graph topology, and Compare Results state are fresh.
- Sync a push-only branch and confirm the lighter metadata patch path still updates ahead/behind state without a full graph rebuild.
- Open Show Log for a target and range, filter by author, subject, hash, body text, branch ref, remote ref, tag, and `HEAD`, then clear the filter.
- Scroll filtered Show Log results and confirm `Load More` continues paging through matching commits.
- Confirm Show Log reference badges render legibly in the active VS Code theme.
- Normal-click and Ctrl-click Show Log commits, then verify context-menu availability for `Open Commit Details`, `Compare`, and `Compare with Worktree`.
- Open Compare Results from Show Log and confirm hiding Compare Results returns focus to Show Log.
- Hide Show Log and Compare Results in different orders and confirm the graph view returns without stale empty states.
- Smoke test multi-repository behavior for graph refresh, Show Log source selection, and Compare Results focus restoration.

Release gates pending:

- Complete manual Extension Development Host smoke validation.
- Run `npm run package:vsix` when the maintainer is ready to package.
- Marketplace publishing remains with the maintainer.

Post-release monitoring focus:

- Reports of stale graph topology after branch deletion or pull-based sync.
- Show Log filter correctness and responsiveness on large repositories.
- Show Log context-menu discoverability for compare workflows.
- Focus restoration between Graph, Show Log, and Compare Results.
- Theme contrast for kind-aware reference badges.

Rollback:

- If a published regression is confirmed, prepare a patch release that reverts the affected `0.0.30` slice or disables the affected Show Log workflow.
- Keep the previous `0.0.29` VSIX available for manual rollback guidance if Marketplace publication has already occurred.

## 0.0.29 Release Readiness

Current package baseline: `0.0.28`.

Target release: `0.0.29`.

Status: Release candidate packaged for `0.0.29`. Version bump and VSIX packaging are complete. Marketplace publishing remains with the maintainer.

Candidate change set:

- Add an `origin/HEAD` graph scope that focuses the graph on the default remote trunk and its descendant refs without changing the current branch.
- Ensure local current-branch tips descending from `origin/HEAD`, such as `master-copy`, appear in the `origin/HEAD` scope.
- Make descendant refs core behavior for `Current Branch` and remove the former `Show Current Branch Descendants` view option.
- Keep conflicted merge handling inside the graph surface until the user chooses Source Control: merge conflicts now update the conflict LED and `Abort Merge` action without automatically opening Source Control.
- Add current-branch context menu actions to reset the workspace to `HEAD`, with a separate confirmed option to remove untracked files.

Planning references:

- `project-context/2.build/features/0.0.29-origin-head-scope.md`
- `project-context/2.build/features/0.0.29-reset-current-workspace.md`

Verification completed:

- `npm run build` passed for the `0.0.29` release candidate.
- `npm test` passed with 253 tests for the `0.0.29` release candidate. This includes `npm run build` through the test script.
- `npm run package:vsix` passed and generated `git-revision-graph-0.0.29.vsix`.

Manual validation pending:

- Select `origin/HEAD` in a real repository whose remote default branch is `origin/main`.
- Confirm the graph remains scoped to the remote trunk while the current local branch is a feature branch.
- Confirm visible descendant refs from `origin/HEAD` appear without a separate toggle.
- Confirm a checked-out local branch descended from `origin/HEAD` appears as a descendant in the `origin/HEAD` scope.
- Confirm visible descendant refs from `Current Branch` appear without a separate toggle.
- Trigger a merge conflict, confirm the conflict LED and `Abort Merge` action appear, and confirm Source Control opens only when the user clicks the LED or another explicit Source Control path.
- Create tracked, staged, and untracked changes; validate both current-branch workspace reset actions and their confirmations.
- Confirm repositories missing symbolic `origin/HEAD` still behave through the `origin/main` or `origin/master` fallback when available.
- Toggle remote branch visibility and confirm the scoped graph remains coherent.

Release gates pending:

- Changelog update completed.
- Fresh build and test verification completed after final release edits.
- Marketplace publishing by the maintainer.

## 0.0.28 Release Readiness

Current package baseline: `0.0.27`.

Released version: `0.0.28`.

Status: Publication completed after human approval. Version bump to `0.0.28` has been applied in `package.json` and `package-lock.json`. VSIX packaging and Marketplace publishing were completed by the maintainer outside this Codex turn.

Published change set:

- Add an `Abort Merge` graph toolbar action for real conflicted merge state only.
- Hide `Abort Merge` outside conflicted merge state instead of showing it disabled in clean workspaces.
- Align the conflicted workspace LED and `Abort Merge` button colors, with a brighter hover state.
- Update merge conflict detection and successful merge abort flows through lightweight workspace-state patches instead of graph refreshes.
- Optimize local branch checkout metadata updates so visible branch colors can change without graph topology rebuilds.
- Optimize local branch deletion by removing the deleted local branch line from the existing card through a direct reference patch.
- Add `Copy ref name to clipboard` to context menus for visible graph references.
- Add the `Current Branch` descendant-reference view option.
- Remove the low-value `Show Branchings & Merges` graph view option.
- Add five more main graph zoom-out levels.
- Continue graph cache architecture work for safer snapshot reuse and metadata freshness.

Planning references:

- `project-context/2.build/features/0.0.28-abort-conflicted-merge.md`
- `project-context/2.build/features/0.0.28-copy-ref-name.md`
- `project-context/2.build/features/0.0.28-current-scope-descendant-refs.md`
- `project-context/2.build/features/0.0.28-graph-cache-architecture.md`
- `project-context/2.build/features/0.0.28-graph-zoom-out-levels.md`
- `project-context/2.build/features/0.0.28-remove-branchings-merges-view-option.md`
- `project-context/2.build/features/0.0.24-checkout-metadata-patch-efficiency.md`

Verification completed:

- Fresh `npm run build` passed after the `0.0.28` version bump.
- Fresh `npm test` passed with 246 tests after the `0.0.28` version bump. This includes `npm run build` through the test script.
- `git diff --check` passed after the latest feature edits.

Release gates completed:

- Version bump to `0.0.28`.
- Release notes confirmed in `CHANGELOG.md`.
- Fresh build and test verification completed.
- VSIX packaging completed after approval.
- Marketplace publishing completed after approval.

Post-release monitoring focus:

- Clean workspaces should keep `Abort Merge` hidden and show clean workspace status.
- Conflicted merges should show conflict LED/abort action, require confirmation, and update toolbar state without graph rebuild after abort.
- Local checkout between visible branches should update previous/current branch colors without graph rebuild.
- Local branch deletion should remove the branch line quickly without a long `Updating revision graph...` wait.
- Reference context menus should copy exact local, remote, tag, and `HEAD` ref labels.
- Structural commit context menus should not show the ref-name copy action.
- `Current Branch` descendant refs should appear by default in `0.0.29`; in `0.0.28`, they appeared only when the option was enabled.
- Added zoom-out levels should remain usable on large graphs and should not blank the graph.

Residual risks:

- Some refresh paths now intentionally avoid graph rebuilds; manual validation should watch for stale ref labels after Git operations.
- Conflicted merge UI depends on both unresolved merge changes and `MERGE_HEAD`; worktree edge cases should be tested in normal repositories and worktrees.
- Direct branch-line removal assumes the deleted local branch is visible in the current scene; hidden/off-snapshot branches should continue to rely on later normal refresh behavior.

## Version / Change Set

Previous package baseline: `0.0.26`.

Target release: `0.0.27`.

Planned publishable change set:

- Harden targeted Git CLI calls with safer revision argument handling.
- Add timeout and output-budget safeguards to expensive Git command paths.
- Guard compare restore writes/deletes so they remain inside the selected repository.
- Tighten graph, compare-results, and show-log webview message validation with payload size budgets.
- Preserve the current graph viewport when using toolbar zoom actions.
- Improve cache observability and bounded cache behavior for snapshot, layout persistence, and Show Log expanded changes.
- Stabilize graph layout refresh paths so fan-out balancing does not reuse stale browser-side offsets after topology or layout-rule changes.
- Simplify the default refs-only graph after merges by hiding unreferenced merge connectors while preserving merged-branch lines from visible merge commits.
- Start new revision graph sessions in `Current Branch` scope by default. This was later reversed during `0.0.28` development so new sessions start with `All Refs` again.
- Remove the `Show Branchings & Merges` view option during `0.0.28` development after it proved low-value and introduced graph blanking risk in large repositories.
- Add an `Abort Merge` graph toolbar action during `0.0.28` development for conflicted merge recovery.
- Add five more main graph zoom-out levels during `0.0.28` development for large graph navigation.
- Record production and dev-tooling audit status for release readiness.

Publication completed after human approval.

Version bump to `0.0.27` has been applied in `package.json` and `package-lock.json`.

Planning references:

- `project-context/docs/release-0.0.27-prioritization.md`
- `project-context/2.build/features/0.0.27-stabilization-hardening.md`
- `project-context/2.build/features/0.0.27-cache-stabilization.md`
- `project-context/2.build/features/0.0.27-graph-layout-stabilization.md`
- `project-context/2.build/features/0.0.27-refs-only-merge-simplification.md`

## Verification Summary

- Required for meaningful changes: `npm run build`.
- Required for behavior, command, graph, controller, Git workflow, or user-visible changes: `npm test`.
- Recommended for release candidates: manual Extension Development Host smoke test.

Current verification:

- Source stabilization hardening for Git CLI bounds, revision option terminators, compare restore path guards, and webview message budgets is complete.
- Graph zoom viewport preservation fix is complete.
- Cache stabilization for snapshot trace/reuse, layout persistence deduplication, and Show Log cached-change bounding is complete.
- Graph layout stabilization for topology-aware scene keys and stale-offset invalidation is complete.
- Refs-only merge simplification for default graph readability is complete.
- Default graph scope was changed to `Current Branch` in `0.0.27`; `0.0.28` development has since restored the default to `All Refs`.
- Main graph zoom-out levels were expanded during `0.0.28` development.
- `npm run build` passed.
- `npm test` passed with 239 tests.
- `npm audit --omit=dev --json` passed with 0 production vulnerabilities.
- `npm audit --json` reported 2 moderate dev-tooling vulnerabilities through `@vscode/vsce -> @azure/msal-node -> uuid`; dependency remediation requires explicit approval.
- Manual Extension Development Host validation was recommended before Marketplace publication; post-publication monitoring should watch for real-workspace graph regressions.

Release preparation status:

- Source release readiness is complete for the implemented stabilization hardening, cache stabilization, graph layout stabilization, and refs-only merge simplification slices.
- Version bump to `0.0.27` is complete.
- Release notes for `0.0.27` are complete in `CHANGELOG.md`.
- VSIX packaging is complete for `0.0.27`.
- Marketplace publishing is complete for `0.0.27`.

## Deployment Steps

Release commands available in `package.json`:

- `npm run package:vsix`
- `npm run publish:current`
- `npm run publish:patch`
- `npm run publish:minor`
- `npm run publish:major`

Packaging and publishing for `0.0.27` have been completed.

## Configuration

The extension depends on the built-in `vscode.git` extension and supports VS Code `^1.90.0`.

Runtime dependency audit status for `0.0.27` stabilization is clean. Dev-tooling audit remediation is pending approval.

## Monitoring

Post-release monitoring should prioritize Git command timeout/output-limit reports, option-like ref handling, compare restore failures, ref-backed diff content loading, cache freshness or stale graph reports, layout-offset/fan-out disposition regressions, refs-only merge simplification feedback, Marketplace feedback, and regressions reported against graph/show-log/compare workflows.

## Rollback

Rollback options depend on Marketplace state:

- Publish a patch release that reverts or fixes the regression.
- Direct affected users to install a previous VSIX when available.
- Revert the offending code in Git and prepare a follow-up release.

## Approvals

Human approval is required before:

- Future VSIX release packaging.
- Future Marketplace publishing.
- Any destructive Git or repository history operation.
