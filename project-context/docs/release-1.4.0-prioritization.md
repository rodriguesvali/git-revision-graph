# Release 1.4.0 Prioritization

## Objective

Open `1.4.0` as the next minor release after the completed `1.3.0` graph layout performance and readability release.

The first selected slice adds a `Unified Diff` action to the Compare Results editor panel for ref-to-ref and ref-to-worktree comparisons. Additional launch items remain pending maintainer selection and should be recorded in focused feature artifacts before implementation begins.

## Context

- Current package baseline before opening: `1.3.0`.
- Target release: `1.4.0`.
- Package metadata is now opened at `1.4.0` in `package.json` and `package-lock.json`.
- `1.3.0` shipped adaptive d3-dag Sugiyama layout profile selection and route-aware edge rendering.
- The active product surface remains the Source Control-launched singleton revision graph editor, plus on-demand Compare Results and Show Log editor panels.
- The Compare Results panel already supports file-level diff review, filtering, copy actions, compare-with-worktree, and restore workflows.

## Release Direction

- Preserve the existing extension architecture, command IDs, multi-repository behavior, conflict guards, cancellation paths, worker-thread layout execution, virtualized webview rendering, and native VS Code Git workflows.
- Select `1.4.0` launch items as small, independently verifiable slices.
- Prefer items with clear user value, bounded regression risk, and deterministic verification.
- Keep packaging and Marketplace publication as explicit Deliver actions after implementation and validation.

## Selected Scope

### Priority 0: Compare Results unified diff

- Add a `Unified Diff` button to ref-to-ref Compare Results sessions.
- Reuse the existing unified diff document flow and revision graph document backend.
- Extend the action to ref-to-worktree sessions, including staged, unstaged, and untracked changes.
- Preserve existing Compare Results file-level actions, filtering, selection, context menus, and restore behavior.

Implementation reference:

- `project-context/2.build/features/1.4.0-compare-results-unified-diff.md`

## Candidate Areas

- Revision graph usability, readability, and workflow polish.
- Compare Results and Show Log review efficiency.
- Git workflow parity with VS Code Source Control where the public Git API supports the behavior.
- Release hygiene, package composition, diagnostics, and regression coverage.

## Acceptance Criteria

- Package metadata reports `1.4.0`.
- The release readiness artifact records the cycle as open and not packaged or published.
- Selected implementation items have focused feature artifacts before coding.
- Ref-to-ref and ref-to-worktree Compare Results sessions can open a unified diff from the review panel.
- `npm run build`, `npm test`, and `git diff --check` pass for release-candidate work.
- Manual Extension Development Host validation covers any changed command, graph, review, or Git workflow behavior.
- VSIX packaging and Marketplace publication are not run without explicit maintainer approval.

## Verification Plan

Opening:

- Confirm version metadata in `package.json` and `package-lock.json`.
- `git diff --check`
- `npm run build`
- `npm test`

Feature slices:

- Use focused tests for changed command behavior, graph state shaping, render coordination, webview shell output, or Git workflow boundaries.
- Preserve zero-repository and multi-repository behavior.
- Record manual smoke paths for changed user-facing workflows.

Release candidate:

- `npm run build`
- `npm test`
- `git diff --check`
- `npm run package:vsix` only after explicit approval
- Fresh-profile Extension Development Host smoke validation

## Exclusions

- No dependency additions without separate maintainer approval.
- No new product surface or contribution point unless selected as a focused `1.4.0` feature.
- No VSIX packaging, version re-bump, or Marketplace publication without explicit maintainer approval.

## Risks

- A broad minor-release backlog can overfill the release. Keep slices small and defer lower-confidence work.
- User-facing graph or Git workflow changes can regress multi-repository, conflict, or empty-state behavior without focused validation.
- Changelog and Marketplace copy should describe only implemented, validated improvements.

## Marketplace Notes

- Describe only selected and implemented `1.4.0` improvements.
- Avoid broad performance or workflow claims unless release validation records a reproducible workload.
