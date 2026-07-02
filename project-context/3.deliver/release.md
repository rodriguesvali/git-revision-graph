# Release Readiness

Status: Active
Last consolidated: 2026-07-02

## Current State

- Current package version: `1.5.6` in `package.json`.
- Latest recorded published release: `1.5.6`.
- Release cycle status: Flow Governance Phase 1 has implementation, automated verification, and
  manual Extension Development Host smoke complete on top of the published `1.5.6` baseline. No
  version bump, VSIX packaging, or Marketplace publication has been run.
- Historical release readiness notes are archived at `project-context/archive/releases/release-readiness-history.md`.

## Open Release Candidate: Flow Governance Phase 1

Status: Ready for targeted Flow Governance persistence smoke, then version decision and release approval
Opened: 2026-07-01
Baseline package version: `1.5.6`
Target version: pending maintainer approval

Focused build artifact:

- `project-context/2.build/features/flow-governance-phase-1.md`
- Manual smoke matrix: `project-context/3.deliver/extension-host-smoke-matrix.md`

Candidate scope:

- Add Flow Governance Phase 1 as a non-mutating metadata overlay over the existing revision graph.
- Add repository flow-file resolution with VS Code settings fallback and invalid-config diagnostics.
- Classify branch refs into Phase 1 kinds and attach serializable Flow Governance view state.
- Add Flow Governance webview controls, branch-kind filters, badges, production-trunk highlighting,
  sync hiding, and unknown-branch visibility controls from host-provided metadata.
- Persist supported Flow Governance webview option changes back to the repository flow file when
  the active source is a valid repository config.
- Add the `Create Flow Governance Config` Command Palette action with repository selection,
  confirmation, repository-relative path validation, existing-file protection, and default
  Phase 1 template content.
- Update README and CHANGELOG notes for the shipped Phase 1 behavior.

Explicitly out of scope:

- PR creation, provider authentication, governed branch forms, promotion checks, equalization,
  cleanup actions, direct merge policy enforcement, and release automation.
- Git mutations other than explicit creation of the repository flow config after confirmation.
- New views, menus, activation events, runtime dependencies, packaging, publication, or version bump.

Release constraints:

- Preserve existing graph loading, projection semantics, compare, diff, checkout, branch, merge,
  sync, delete, stash, reset, Show Log, and Compare Results workflows.
- Treat Flow Governance as metadata and local webview filtering only; it must not alter Git history,
  refs, graph ancestry, or repository state.
- Keep malformed/stale webview messages bounded by the existing message validation and repository
  authorization layers.
- Do not run packaging or Marketplace publication commands without explicit maintainer approval.

Planned verification:

- `npm run build`
- `npm test`
- `git diff --check`
- Manual Extension Development Host smoke using the Flow Governance section of
  `project-context/3.deliver/extension-host-smoke-matrix.md`.

Recorded verification:

- `npm run build` passed on 2026-07-01 during Flow Governance implementation.
- Focused Flow Governance config, state, manifest, message validation, dispatcher, handler,
  type-boundary, webview, and command tests passed on 2026-07-01.
- `npm test` passed with 555 tests on 2026-07-01 after the session-disable smoke feedback fix.
- `git diff --check` passed on 2026-07-01 after the session-disable smoke feedback fix.
- Repository config option persistence was added on 2026-07-02 after smoke feedback that disabling
  Flow Governance did not update `.git-revision-graph-flow.json`.
- `npm run build` passed on 2026-07-02 after repository config option persistence.
- `npm test` passed with 557 tests on 2026-07-02 after repository config option persistence.
- `git diff --check` passed on 2026-07-02 after repository config option persistence.
- Reloaded disabled repository config now keeps only the main Flow Governance toggle visible on
  2026-07-02 after smoke feedback.
- Ready graph state now preserves disabled repository Flow Governance metadata after reload on
  2026-07-02.
- `npm run build` passed on 2026-07-02 after disabled-config visibility refinement.
- `npm test` passed with 558 tests on 2026-07-02 after disabled-config reload metadata preservation.
- `git diff --check` passed on 2026-07-02 after disabled-config visibility refinement.
- Targeted Extension Development Host smoke for repository config option persistence remains pending.
- Manual Extension Development Host Flow Governance smoke completed by maintainer confirmation on
  2026-07-01. Confirmed config creation, activation, invalid-config handling with hidden inert
  controls, session disable/re-enable affordance, and normal graph usability.

Marketplace impact:

- User-visible additions are a Command Palette action, new configuration settings, README text, and
  Flow Governance controls inside the existing revision graph webview when Flow Governance metadata
  is present.
- Marketplace copy should describe Phase 1 as branch classification, filtering, highlighting, and
  config bootstrap only.
- No Marketplace packaging metadata has been captured yet: VSIX filename, checksum, size,
  publication timestamp, and clean-profile installed-version evidence remain pending approval.

Rollback notes:

- Before publication, revert the Flow Governance feature files, command contribution, settings,
  README/CHANGELOG entries, and release artifacts as one feature rollback.
- After publication, prefer a patch release that disables or removes Flow Governance surfaces while
  preserving existing graph workflows.
- Repository config files created by users are user-owned workspace files; rollback must not delete
  them automatically.

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
