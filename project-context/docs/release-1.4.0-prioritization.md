# Release 1.4.0 Prioritization

## Objective

Open `1.4.0` as the next minor release after the completed `1.3.0` graph layout performance and readability release.

The initial release objective is intentionally unselected. The maintainer should choose focused launch items before implementation begins, with each item recorded in a feature artifact under `project-context/2.build/features/`.

## Context

- Current package baseline before opening: `1.3.0`.
- Target release: `1.4.0`.
- Package metadata is now opened at `1.4.0` in `package.json` and `package-lock.json`.
- `1.3.0` shipped adaptive d3-dag Sugiyama layout profile selection and route-aware edge rendering.
- The active product surface remains the Source Control-launched singleton revision graph editor, plus on-demand Compare Results and Show Log editor panels.

## Release Direction

- Preserve the existing extension architecture, command IDs, multi-repository behavior, conflict guards, cancellation paths, worker-thread layout execution, virtualized webview rendering, and native VS Code Git workflows.
- Select `1.4.0` launch items as small, independently verifiable slices.
- Prefer items with clear user value, bounded regression risk, and deterministic verification.
- Keep packaging and Marketplace publication as explicit Deliver actions after implementation and validation.

## Candidate Areas

- Revision graph usability, readability, and workflow polish.
- Compare Results and Show Log review efficiency.
- Git workflow parity with VS Code Source Control where the public Git API supports the behavior.
- Release hygiene, package composition, diagnostics, and regression coverage.

## Acceptance Criteria

- Package metadata reports `1.4.0`.
- The release readiness artifact records the cycle as open and not packaged or published.
- Selected implementation items have focused feature artifacts before coding.
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

