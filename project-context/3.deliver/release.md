# Release Readiness

## 0.0.39 Release Readiness

Current package baseline: `0.0.38`.

Target release: `0.0.39`.

Status: Define phase is open for `0.0.39`. The target direction is a cohesion and architecture hardening cycle based on the maintainability review of graph orchestration, ref workflows, backend ports, and webview message/runtime boundaries. The package version has been bumped to `0.0.39`; VSIX packaging and Marketplace publication have not been performed for `0.0.39`.

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

Automated verification pending:

- None for the current implemented `0.0.39` slices. Re-run `npm run build`, `npm test`, and `git diff --check` before release preparation.

Manual validation pending:

- Open a Git workspace in the Extension Development Host and confirm the graph opens from Source Control.
- Exercise graph load, repository switching, refresh, fetch, scope changes, search, minimap, scroll, zoom, and `Center HEAD`.
- Exercise compare, compare with worktree, unified diff, Show Log, checkout, branch creation, tag creation, sync, pull, push, merge, delete, reset, and conflict guards.
- Confirm Compare Results and Show Log remain on-demand editor panels and close with the graph panel.
- Repeat key checks in multi-repository and zero-repository workspaces.

Release gates pending:

- Select and approve the next focused `0.0.39` build slice.
- Create or update a focused feature artifact under `project-context/2.build/features/` for each additional implemented slice.
- Re-run full automated verification after additional implementation.
- Run `npm run package:vsix` only after maintainer approval and review generated metadata/package contents.
- Marketplace publication remains with the maintainer and should use `npm run publish:current` only after VSIX/manual smoke validation is acceptable.

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
