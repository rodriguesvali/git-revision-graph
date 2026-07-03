# Release Readiness

Status: Active
Last consolidated: 2026-07-03

## Current State

- Current package version: `1.5.7` in `package.json`.
- Latest recorded published release: `1.5.6`.
- Release cycle status: `1.5.7` is open for small, scoped improvements; packaging and Marketplace
  publication have not started.
- Historical release readiness notes are archived at `project-context/archive/releases/release-readiness-history.md`.

## Active Release: 1.5.7

Status: Open
Opened: 2026-07-03

Focused build artifact:

- `project-context/2.build/features/1.5.7-small-improvements.md`
- Manual smoke matrix: `project-context/3.deliver/extension-host-smoke-matrix.md`

Initial scope:

- Deliver small, independently reviewable improvements agreed with the maintainer during the
  `1.5.7` cycle.
- Preserve existing extension architecture and Marketplace contribution points unless an approved
  improvement explicitly requires a change.

Release constraints and risks:

- Keep each improvement scoped with explicit acceptance criteria and regression coverage where
  behavior changes.
- Preserve multi-repository behavior, empty-state handling, conflict guards, and native VS Code
  workbench ergonomics.
- Keep `package.json`, command registrations, menus, views, README, and tests aligned when a
  contribution point changes.
- Do not package, publish, or bump beyond `1.5.7` without explicit maintainer approval.

Planned verification:

- `npm run build`
- `npm test` for behavior, graph, controller, command, webview, or Git workflow changes.
- `git diff --check`
- Manual Extension Development Host smoke using
  `project-context/3.deliver/extension-host-smoke-matrix.md` for affected user-facing workflows.

Marketplace and rollback notes:

- Marketplace impact is not yet determined; record user-visible changes as scope is approved.
- No packaging or publication action is authorized by opening the release.
- Keep improvements as small, separable changes so a regression can be reverted before packaging.

## Last Completed Release

`1.5.6` was recorded as completed by maintainer confirmation on 2026-07-01.

Completed scope:

- Split native workbench reference-action services into smaller adapter modules while preserving
  existing commands, prompts, confirmations, and user-facing Git workflows.
- Narrowed selected reference-action workflow dependencies to smaller service slices.
- Separated revision graph webview payload validation from state/current-repository authorization.
- Extracted revision graph repository lifecycle and refresh coordination from
  `src/revisionGraph/controller.ts`.
- Extracted revision graph type boundaries and removed the graph parsing / webview shared import
  cycles.
- Added graph fidelity regression coverage for branch, hidden merge, tag, remote, stash, and hidden
  linear-path continuity.
- Added a fixed Extension Development Host smoke matrix for future release-candidate validation.

Recorded verification:

- `npm run build` passed on 2026-07-01 after repository lifecycle extraction.
- Focused webview message validation/dispatcher tests passed on 2026-07-01.
- Focused repository lifecycle, repository state-change, and repository selection tests passed on
  2026-07-01.
- `npm test` passed with 528 tests on 2026-07-01 after adding the graph fidelity regression
  fixture.
- `git diff --check` passed on 2026-07-01 after the type-boundary extraction.
- Final Extension Development Host smoke completed by maintainer confirmation on 2026-07-01 after
  the type-boundary extraction.
- `CHANGELOG.md` release notes for `1.5.6` were prepared on 2026-07-01 before packaging and
  Marketplace publication.
- VSIX packaging and Marketplace publication were confirmed complete by the maintainer on
  2026-07-01.

Known missing metadata:

- VSIX filename, checksum, and size were not supplied.
- Marketplace publication timestamp and installed-version evidence were not supplied.
- Codex did not run packaging or publication commands for `1.5.6`.

## Gate For Opening The Next Release

Before implementation begins for the next release:

- Confirm the target version and baseline package version.
- Create or update a focused feature artifact under `project-context/2.build/features/`.
- Update `project-context/1.define/prd.md` or `project-context/1.define/sad.md` only for durable product or architecture decisions.
- Record release-specific risks, verification plan, manual smoke matrix, Marketplace impact, and rollback notes in this file.
- Do not bump versions, package VSIX, or publish without explicit maintainer approval.

## Completed Release: 1.5.6

Status: Published
Opened: 2026-07-01
Completed: 2026-07-01 by maintainer confirmation

Focused build artifact:

- `project-context/2.build/features/1.5.6-architecture-risk-reduction.md`
- Manual smoke matrix: `project-context/3.deliver/extension-host-smoke-matrix.md`

Completed scope:

- Split `src/workbenchRefActionServices.ts` into smaller native VS Code adapter modules while
  preserving the existing factory and user-facing behavior.
- Narrow touched ref action workflows so they depend on only the service capabilities they use.
- Separate revision graph webview message payload validation from state/current-repository
  authorization rules.
- Extract revision graph repository lifecycle and refresh coordination from
  `src/revisionGraph/controller.ts` without changing graph webview behavior.
- Extract revision graph type boundaries to remove import cycles between Git graph parsing,
  shared graph data, view-state contracts, and webview shared contracts.
- Add a graph fidelity regression fixture for branch, hidden merge, tag, remote, stash, and hidden
  linear-path continuity without changing runtime behavior.
- Add a fixed Extension Development Host smoke matrix for future release candidates.

Release constraints:

- Package baseline has been bumped to `1.5.6`; do not bump again without maintainer approval.
- Do not add commands, menus, views, activation events, settings, or runtime dependencies.
- Preserve multi-repository behavior, empty-state handling, conflict guards, and native VS Code
  workbench ergonomics.
- Preserve current revision graph behavior while changing only internal type/module ownership.
- Do not run packaging or Marketplace publication commands without explicit maintainer approval.

Planned verification:

- `npm run build`
- `npm test`
- `git diff --check`
- Manual Extension Development Host smoke using
  `project-context/3.deliver/extension-host-smoke-matrix.md`.

Recorded verification:

- `npm run build` passed on 2026-07-01 after repository lifecycle extraction.
- Focused webview message validation/dispatcher tests passed on 2026-07-01.
- Focused repository lifecycle, repository state-change, and repository selection tests passed on
  2026-07-01.
- `npm test` passed with 526 tests on 2026-07-01 after repository lifecycle extraction.
- `git diff --check` passed on 2026-07-01 after repository lifecycle extraction.
- Manual Extension Development Host smoke completed by maintainer confirmation on 2026-07-01 before
  repository lifecycle extraction.
- Final Extension Development Host smoke completed by maintainer confirmation on 2026-07-01 after
  repository lifecycle extraction.
- Focused graph type-boundary, graph state, graph model, and webview shared tests passed on
  2026-07-01.
- `npm test` passed with 527 tests on 2026-07-01 after the type-boundary extraction.
- `git diff --check` passed on 2026-07-01 after the type-boundary extraction.
- Final Extension Development Host smoke completed by maintainer confirmation on 2026-07-01 after
  the type-boundary extraction.
- `npm test` passed with 528 tests on 2026-07-01 after adding the graph fidelity regression
  fixture.
- `CHANGELOG.md` release notes for `1.5.6` were prepared on 2026-07-01 before packaging and
  Marketplace publication.
- VSIX packaging and Marketplace publication were confirmed complete by the maintainer on
  2026-07-01.

## Standard Release Verification

- Run `npm run build`.
- Run `npm test` for behavior, graph, controller, command, webview, or Git workflow changes.
- Run `git diff --check` before release-candidate packaging.
- Manually validate in an Extension Development Host for user-visible graph or Git workflows.
- For Marketplace readiness, capture VSIX filename, checksum, size, package version, publication timestamp, and clean-profile installation result when available.

## Rollback Notes

- Marketplace rollback is manual: publish a follow-up patch or unpublish/deprecate according to Marketplace policy and maintainer decision.
- Keep source changes, package metadata changes, and Marketplace publication decisions separate so a release can be stopped before deployment.
- For Git workflow regressions, prioritize disabling or reverting the affected action path over broad architecture changes.
