# Release Readiness

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

- `docs/release-0.0.27-prioritization.md`
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
