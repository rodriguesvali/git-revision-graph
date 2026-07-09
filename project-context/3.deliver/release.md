# Release Readiness

Status: Active
Last consolidated: 2026-07-09

## Current State

- Current package version: `1.5.9` in `package.json`.
- Latest recorded published release: `1.5.9`.
- Release cycle status: `1.5.9` was published by maintainer confirmation on 2026-07-09. Flow
  Governance Phase 1 and operational Flow Governance work remain staged for the next release target,
  `2.0.0`, now integrated with the published `1.5.9` baseline.
- Historical release readiness notes are archived at `project-context/archive/releases/release-readiness-history.md`.

## Open Release Candidate: Flow Governance 2.0.0

Status: Build complete; 1.5.9 integration verification and manual operational smoke pending
Opened: 2026-07-01
Baseline package version: `1.5.9`
Target version: `2.0.0`

Focused build artifact:

- `project-context/2.build/features/flow-governance-phase-1.md`
- `project-context/2.build/features/flow-governance-2.0.0.md`
- Manual smoke matrix: `project-context/3.deliver/extension-host-smoke-matrix.md`

Candidate scope:

- Keep Flow Governance Phase 1 as the foundation, not as the final release value.
- Add repository flow-file resolution with VS Code settings fallback and invalid-config diagnostics.
- Classify branch refs into Phase 1 kinds and attach serializable Flow Governance view state.
- Add a Flow Governance webview toggle and branch-kind badges from host-provided metadata.
- Keep all branch refs visible when Flow Governance is enabled; Phase 1 no longer includes
  branch-kind filters, production-trunk highlighting, sync hiding, or unknown-branch visibility
  controls.
- Persist supported Flow Governance webview option changes back to the repository flow file when
  the active source is a valid repository config.
- Add the `Create Flow Governance Config` Command Palette action with repository selection,
  confirmation, repository-relative path validation, existing-file protection, and default
  Phase 1 template content.
- Add PR-required transition diagnostics for governed source/target pairs.
- Add release promotion readiness checks with `ready`, `blocked`, and `inconclusive` outcomes.
- Add PR handoff through copyable context or recognized GitHub compare/PR URLs.
- Add production-to-release equalization guidance using local `sync/*` helper branches without
  automatic push.
- Update README and CHANGELOG notes for the shipped 2.0.0 behavior.

Explicitly out of scope:

- Provider-authenticated PR creation, cleanup actions, bulk branch deletion, full release
  automation, and additional provider APIs.
- Git mutations other than explicit creation of the repository flow config after confirmation.
- Automatic push, final governed direct merges, or automatic conflict resolution.
- New views, menus, activation events, runtime dependencies, packaging, publication, or version bump.

Release constraints:

- Preserve existing graph loading, projection semantics, compare, diff, checkout, branch, merge,
  sync, delete, stash, reset, Show Log, and Compare Results workflows.
- Treat Flow Governance as metadata only; it must not hide refs, alter Git history, graph ancestry,
  or repository state.
- Treat Flow Governance 2.0.0 as operational guidance: diagnostics and handoff may guide actions,
  but final governed integration remains PR-gated.
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
- Branch visibility controls were removed on 2026-07-02 after product feedback; Flow Governance now
  controls only whether branch-kind badges are shown.
- `npm run build` passed on 2026-07-02 after branch visibility simplification.
- `npm test` passed with 558 tests on 2026-07-02 after branch visibility simplification.
- `git diff --check` passed on 2026-07-02 after branch visibility simplification.
- Disabled Flow Governance state now preserves classified references so re-enabling immediately
  renders badges without reopening the graph.
- `npm run build` passed on 2026-07-02 after live re-enable badge rendering fix.
- `npm test` passed with 560 tests on 2026-07-02 after live re-enable badge rendering fix.
- `git diff --check` passed on 2026-07-02 after live re-enable badge rendering fix.
- Targeted Extension Development Host smoke for repository config option persistence was completed
  by maintainer confirmation on 2026-07-02 after live re-enable badge rendering was fixed.
- Manual Extension Development Host Flow Governance smoke completed by maintainer confirmation on
  2026-07-01. Confirmed config creation, activation, invalid-config handling with hidden inert
  controls, session disable/re-enable affordance, and normal graph usability.
- Flow Governance transition policy engine was added on 2026-07-02 with deterministic governed
  pair matching and direct merge policy outcomes.
- `npm run build` passed on 2026-07-02 after the policy engine slice.
- `npm test -- --test-name-pattern "Flow Governance"` passed with 563 compiled tests on
  2026-07-02 after the policy engine slice.
- Flow Governance release promotion readiness was added on 2026-07-02 with
  `ready`, `blocked`, and `inconclusive` outcomes backed by `git merge-base --is-ancestor`.
- `npm run build` passed on 2026-07-02 after the readiness slice.
- `npm test -- --test-name-pattern "Flow Governance"` passed with 566 compiled tests on
  2026-07-02 after the readiness slice.
- Flow Governance contextual diagnostics were expanded on 2026-07-02 for
  PR-required transitions, direct-merge blocking, and release promotion readiness outcomes.
- `npm run build` passed on 2026-07-02 after the diagnostics slice.
- `npm test -- --test-name-pattern "Flow Governance"` passed with 568 compiled tests on
  2026-07-02 after the diagnostics slice.
- Flow Governance `Validate Release Promotion` context action was added on 2026-07-02 for
  release branches in the existing graph context menu.
- `npm run build` passed on 2026-07-02 after the release promotion action slice.
- Focused message/webview/Flow Governance tests passed with 569 compiled tests on
  2026-07-02 after the release promotion action slice.
- `npm test` passed with 569 tests on 2026-07-02 after the release promotion action slice.
- `git diff --check` passed on 2026-07-02 after the release promotion action slice.
- Flow Governance PR handoff was added on 2026-07-02 for governed release-to-main promotion,
  including copyable Pull Request context and GitHub compare URL opening when an eligible remote
  is configured.
- `npm run build` passed on 2026-07-02 after the PR handoff slice.
- Focused message/webview/Flow Governance tests passed with 571 compiled tests on
  2026-07-02 after the PR handoff slice.
- `npm test` passed with 571 tests on 2026-07-02 after the PR handoff slice.
- `git diff --check` passed on 2026-07-02 after the PR handoff slice.
- Flow Governance production-to-release equalization was added on 2026-07-02
  with clean-workspace and confirmation guards, validated local `sync/*`
  naming, no automatic push, and Source Control conflict handoff.
- `npm test` passed with 575 tests on 2026-07-02 after the equalization slice.
- Published `1.5.9` changes were integrated into the `2.0.0` development line on 2026-07-09,
  preserving interactive reference details, lazy commit statistics, hash/GitHub actions, Show Log
  badge alignment, and paging fixes alongside Flow Governance badges and actions.
- Integration verification passed on 2026-07-09 with `npm run build`, `npm test` (590 tests), and
  `git diff --check`.

Marketplace impact:

- User-visible additions are a Command Palette action, new configuration settings, README text, and
  Flow Governance controls inside the existing revision graph webview when Flow Governance metadata
  is present.
- Marketplace copy should describe 2.0.0 as branch classification, PR-required diagnostics,
  release readiness, PR handoff, and safe equalization guidance. It must not claim branch hiding.
- No Marketplace packaging metadata has been captured yet: VSIX filename, checksum, size,
  publication timestamp, and clean-profile installed-version evidence remain pending approval.

Rollback notes:

- Before publication, revert the Flow Governance feature files, command contribution, settings,
  README/CHANGELOG entries, and release artifacts as one feature rollback.
- After publication, prefer a patch release that disables or removes Flow Governance surfaces while
  preserving existing graph workflows.
- Repository config files created by users are user-owned workspace files; rollback must not delete
  them automatically.

## Completed Release: 1.5.9

Status: Published
Opened: 2026-07-07
Published: 2026-07-09 by maintainer confirmation
Baseline: published `1.5.8`

Focused build artifact:

- `project-context/2.build/features/1.5.9-reference-tooltips.md`
- Manual smoke matrix: `project-context/3.deliver/extension-host-smoke-matrix.md`

Approved scope:

- Backport the improved reference-tooltip presentation from development baseline
  `6f3342a90618586b429bc41114231c3bfc0fd9c6`.
- Show a neutral reference kind, full name, optional local Git branch description, commit subject,
  short hash, author, date, and lazily loaded change statistics for the hovered or keyboard-focused
  reference.
- Keep the popover interactive and expose copy-hash and supported GitHub commit actions.
- Exclude the Flow Governance branch-kind badge and all other governance behavior from `1.5.9`.
- Align Show Log reference badges and commit tooltips with the graph card reference presentation,
  including kind icons, matching mixed colors, compact copy-hash actions, and consistent tooltip
  date formatting.
- Treat slash-containing local branch decorations such as `feature/teste03` and `task/1-new-task`
  as local branches when repository ref metadata confirms or fallback parsing has no remote hint.
- Keep Show Log toolbar controls coherent after incremental next-page loading.
- Preserve the published extension architecture, multi-repository behavior, empty states, and
  existing reference actions.

Release constraints and risks:

- No new commands, settings, views, dependencies, activation events, or contribution points.
- Local Git config metadata reads must fail open and remain abort-aware; commit statistics must use
  a bounded, cached, on-demand query rather than slowing the initial graph load.
- Tooltip placement, theme contrast, keyboard focus, Show Log badge contrast, and incremental
  paging require manual Extension Development Host validation.
- Do not package, publish, or bump beyond `1.5.9` without explicit maintainer approval.

Planned verification:

- Focused branch-description, short-stat, message-boundary, GitHub action, graph state, and webview
  shell tests.
- `npm run build`
- `npm test`
- `git diff --check`
- Manual smoke for local/remote/tag/stash references, multi-ref nodes, long names, descriptions,
  pointer transfer into the popover, statistics, clipboard/GitHub actions, viewport edges,
  scrolling, resizing, keyboard selection, GitHub/non-GitHub remotes, and dark/light themes.
- Manual smoke for Show Log row and tooltip badges, `Show All Branches` toggling, and automatic
  next-page loading.

Marketplace and rollback notes:

- Marketplace impact is limited to the reference tooltip, Show Log reference-badge presentation,
  and paging fix documented in README and CHANGELOG.
- No new commands, settings, views, activation events, dependencies, or Marketplace contribution
  points are included.
- Rollback is a focused revert of the reference-tooltip, branch-description metadata loading,
  Show Log badge rendering, and incremental toolbar-sync changes; no persisted extension setting,
  data migration, or contribution-point change is involved.
- VSIX packaging and Marketplace publication were confirmed by the maintainer on 2026-07-09.

Recorded verification:

- Version metadata and release artifacts opened on 2026-07-07.
- `npm run build` passed on 2026-07-07.
- `npm test` passed with 532 tests on 2026-07-07.
- `git diff --check` passed on 2026-07-07.
- SOLID/Clean Code follow-up verification passed on 2026-07-09 with `npm run build`,
  `npm test` (533 tests), and `git diff --check`.
- Show Log badge, branch-classification, color-alignment, and paging follow-up verification passed
  on 2026-07-09 with `npm run build`, focused Show Log/revision graph tests, `npm test`
  (533 tests), and `git diff --check`.
- `README.md`, `CHANGELOG.md`, the `1.5.9` feature artifact, `release.md`, `deployment.md`, and
  `operations.md` were prepared for `1.5.9` publication handoff on 2026-07-09.
- VSIX packaging and Marketplace publication were confirmed by the maintainer on 2026-07-09.
- VSIX filename, checksum, size, Marketplace publication timestamp, clean-profile install result,
  and manual Extension Development Host smoke evidence were not supplied.

## Completed Release: 1.5.8

Status: Published
Opened: 2026-07-03
Development scope closed: 2026-07-03
Published: 2026-07-03 by maintainer confirmation

Focused build artifact:

- `project-context/2.build/features/1.5.8-blocking-warning-visibility.md`
- `project-context/2.build/features/1.5.8-dead-code-cleanup.md`
- `project-context/2.build/features/1.5.8-toolbar-split-buttons.md`
- `project-context/2.build/features/1.5.8-reset-to-reference.md`
- `project-context/2.build/features/1.5.8-show-log-hover-contrast.md`
- `project-context/2.build/features/1.5.8-compare-hover-contrast.md`
- `project-context/2.build/features/1.5.8-context-menu-item-standardization.md`
- Manual smoke matrix: `project-context/3.deliver/extension-host-smoke-matrix.md`

Initial scope:

- Open `1.5.8` from the published `1.5.7` baseline.
- Replace transient warning toasts with native modal warnings when a user-requested Git mutation is
  aborted by a dirty workspace, merge conflict, missing mutation prerequisite, invalid target, or
  concurrent repository mutation.
- Preserve existing destructive confirmations, success notifications, benign no-op messages,
  Source Control reveal behavior, and Git mutation guards.
- Keep the change inside the existing native VS Code UI adapters and scoped workflow modules.
- Replace the toolbar long-press affordances introduced in `1.5.7` with explicit split buttons for
  `Push` force modes and empty-cache `Reload`.
- Expose `Reset to this` from non-HEAD graph references while resetting by the selected commit hash.
- Improve Show Log and Compare Results row/context-menu hover contrast and standardize webview menu
  item styling on `context-menu-item`.
- Remove dead code left behind by earlier graph-surface and workspace-reset changes.

Marketplace and rollback notes:

- Marketplace impact was limited to the recorded revision graph UX changes; there were no new
  commands, settings, views, activation events, or dependencies.
- Marketplace publication was confirmed by the maintainer on 2026-07-03.
- Keep improvements as small, separable rollback candidates for follow-up patches.

Recorded verification:

- `npm run build` passed on 2026-07-03.
- `npm test` passed with 526 tests on 2026-07-03.
- `git diff --check` passed on 2026-07-03.
- `CHANGELOG.md` release notes were prepared on 2026-07-03.
- VSIX packaging and Marketplace publication were confirmed by the maintainer on 2026-07-03.

## Completed Release: 1.5.7

Status: Published
Opened: 2026-07-03
Development scope closed: 2026-07-03
Published: 2026-07-03 by maintainer confirmation

Focused build artifact:

- `project-context/2.build/features/1.5.7-small-improvements.md`
- Manual smoke matrix: `project-context/3.deliver/extension-host-smoke-matrix.md`

Initial scope:

- Deliver small, independently reviewable improvements agreed with the maintainer during the
  `1.5.7` cycle.
- Remove `Reset Workspace to HEAD` and `Reset Workspace and Remove Untracked Files` from the graph
  context menu while preserving commit reset workflows.
- Make toolbar `Push` perform a normal push on short click and expose force-with-lease and force
  modes from the 500 ms long-press menu.
- Replace the ambiguous reset-zoom toolbar glyph with a `1:1` actual-size icon.
- Preserve existing extension architecture and Marketplace contribution points unless an approved
  improvement explicitly requires a change.

Recorded verification:

- `npm run build` passed on 2026-07-03.
- `npm test` passed with 528 tests on 2026-07-03.
- `git diff --check` passed on 2026-07-03.
- `CHANGELOG.md` release notes were prepared on 2026-07-03.
- VSIX packaging and Marketplace publication were confirmed by the maintainer on 2026-07-03.

## Previous Completed Release: 1.5.6

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
