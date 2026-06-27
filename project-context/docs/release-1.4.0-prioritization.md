# Release 1.4.0 Prioritization

## Release Outcome

Status: released. The maintainer confirmed all Deliver gates complete on 2026-06-27, including Extension Development Host smoke validation, VSIX packaging, clean-profile installation, and Marketplace publication. Automated verification completed with 466 passing tests before publication.

## Objective

Deliver `1.4.0` as a focused review-surface improvement release after the completed `1.3.0` graph layout release.

The release scope is frozen to the implemented and maintainer-approved `Unified Diff` action in the Compare Results editor panel for ref-to-ref and ref-to-worktree comparisons. No additional feature, fix, dependency, contribution point, or product-surface change is included in `1.4.0` without reopening scope through explicit maintainer approval.

## Context

- Current package baseline before opening: `1.3.0`.
- Target release: `1.4.0`.
- Package metadata is `1.4.0` in `package.json` and `package-lock.json`.
- `1.3.0` shipped adaptive d3-dag Sugiyama layout profile selection and route-aware edge rendering.
- The active product surface remains the Source Control-launched singleton revision graph editor, plus on-demand Compare Results and Show Log editor panels.
- Scope was frozen on 2026-06-27 after implementation and automated verification of the Compare Results unified diff slice.
- Maintainer approval uses commit `78a80ab427894f2dab5e0636e929c5f9d56f5b08` as the comparison baseline and includes the implemented candidate through `876eecd3b0e986f9a4c843ac6b88d1009b9d83dc`.

## Release Direction

- Preserve the existing extension architecture, command IDs, multi-repository behavior, conflict guards, cancellation paths, worker-thread layout execution, virtualized webview rendering, and native VS Code Git workflows.
- Ship one independently verifiable review-surface slice instead of expanding the minor release backlog.
- Keep VSIX packaging and Marketplace publication as explicit Deliver actions after automated and manual validation.

## Maintainer Approval Record

Approved for `1.4.0` on 2026-06-27:

- Compare Results unified diff for ref-to-ref comparison sessions.
- Compare Results unified diff for ref-to-worktree comparison sessions, covering staged, unstaged, and active untracked changes.
- Correctness hardening required by the worktree capability: refresh immediately before generation, reject stale in-flight responses, and close the panel without opening a diff when the refreshed worktree is aligned with the selected ref.

Approval comparison baseline: `78a80ab427894f2dab5e0636e929c5f9d56f5b08`.

Approved implementation candidate: `876eecd3b0e986f9a4c843ac6b88d1009b9d83dc`.

This approval records feature inclusion only. Manual Extension Development Host validation, VSIX packaging, clean-profile installation, and Marketplace publication remain separate Deliver gates owned by the maintainer.

## Frozen Scope

### Compare Results unified diff

- Add a `Unified Diff` button to ref-to-ref Compare Results sessions.
- Reuse the existing unified diff document flow and revision graph document backend.
- Extend the action to ref-to-worktree sessions, including staged, unstaged, and untracked changes.
- Preserve existing Compare Results file-level actions, filtering, selection, context menus, and restore behavior.
- Keep the action hidden in empty Compare Results state.

Implementation reference:

- `project-context/2.build/features/1.4.0-compare-results-unified-diff.md`

## Deferred Beyond 1.4.0

- Additional revision graph usability or readability changes.
- Additional Compare Results or Show Log review features.
- New Git workflow parity work.
- Package, diagnostics, or dependency changes not required to deliver the frozen slice.
- Any new command, menu, view, setting, dependency, or contribution point.

## Acceptance Criteria

- Package metadata reports `1.4.0`.
- The only user-visible `1.4.0` implementation scope is Compare Results unified diff.
- Ref-to-ref and ref-to-worktree Compare Results sessions can open a unified diff from the review panel.
- Worktree output covers tracked staged and unstaged changes plus active untracked files.
- Ref-to-worktree generation refreshes Compare Results immediately before opening the diff and ignores stale refresh responses.
- Empty state does not expose the action.
- Existing Compare Results file-level workflows remain intact.
- `npm run build`, `npm test`, and `git diff --check` pass on the release-candidate commit.
- The mandatory Extension Development Host smoke matrix is completed and recorded in `project-context/3.deliver/release.md`.
- VSIX packaging and Marketplace publication are not run without explicit maintainer approval.

## Verification Plan

### Automated gate

Run on the exact release-candidate commit:

- `npm run build`
- `npm test`
- `git diff --check`

Current candidate evidence on 2026-06-27:

- `npm run build` passed.
- `npm test` passed with 466 tests.
- `git diff --check` passed.

### Mandatory Extension Development Host smoke gate

Use a fresh Extension Development Host with the built-in `vscode.git` extension active.

1. Open the graph from Source Control and confirm repository selection still works in single- and multi-repository workspaces.
2. Run a non-empty ref-to-ref comparison, open `Unified Diff`, and verify orientation, labels, patch contents, and native diff-language rendering.
3. Run a ref-to-worktree comparison containing staged, unstaged, and untracked files, including a nested path and a path containing spaces; verify every active change appears in the unified output.
4. Confirm empty Compare Results state hides `Unified Diff` and existing file open, filter, selection, copy, compare-with-worktree, context-menu, and restore actions still work.
5. Add and remove untracked files after opening Compare Results; confirm the panel refreshes and the unified output reflects the current comparison without using stale paths.
6. Switch the active comparison between repositories and confirm the unified diff always runs against the repository shown by Compare Results.
7. Resize the editor panel to a narrow width and confirm the toolbar remains usable.
8. Smoke graph reload, Compare Results, and Show Log opening to detect integration regressions around the shared backend instance.

Record the tested VS Code version, operating system, repository fixtures, result of each step, and any accepted limitation in the release-readiness artifact.

### Packaging gate

Only after explicit maintainer approval:

- Run `npm run package:vsix`.
- Record VSIX filename, size, checksum, and package-entry count.
- Install the generated VSIX in a clean profile and repeat the core ref-to-ref and ref-to-worktree smoke paths.
- Inspect the packaged changelog, README, entrypoint, worker output, icons, and runtime dependencies.

## Release Gate Checklist

- Scope freeze: complete.
- Focused implementation: complete.
- Maintainer approval of the implemented `1.4.0` feature scope: complete on 2026-06-27.
- Automated verification: complete on current candidate.
- Manual Extension Development Host smoke: complete by maintainer confirmation on 2026-06-27.
- VSIX packaging and clean-profile installation: complete by maintainer confirmation on 2026-06-27.
- Marketplace publication: complete by maintainer confirmation on 2026-06-27.

## Rollback

- Revert the Compare Results unified diff implementation if manual validation finds incorrect patches, repository selection errors, unacceptable toolbar behavior, or regressions in existing Compare Results actions.
- Restore package metadata to `1.3.0` and remove the `1.4.0` release artifacts if the release candidate is abandoned rather than corrected.

## Marketplace Notes

- Describe `1.4.0` only as adding unified diff access from ref-to-ref and ref-to-worktree Compare Results.
- Do not claim broader graph, performance, Git workflow, or packaging improvements.
