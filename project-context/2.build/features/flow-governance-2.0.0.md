# Flow Governance 2.0.0

Status: Build active - policy engine slice complete
Last updated: 2026-07-02
Baseline: `1.5.6` plus completed Flow Governance Phase 1 foundation

## Goal

Ship Flow Governance as an operational governance feature, not as a visual-only
overlay. The 2.0.0 release should help users understand governed branch roles,
see when final integration requires a Pull Request, validate release promotion
readiness, and prepare safe equalization when production changes are missing
from an active release.

## User Workflow

1. The user opens the existing Git Revision Graph.
2. Flow Governance classifies visible branch refs and shows compact badges.
3. The user selects a governed source or target branch.
4. The graph explains applicable governance policy, including whether a PR is
   required.
5. For `release/*` promotion, the user can validate whether production is an
   ancestor of the release.
6. If promotion is blocked, the extension guides the user toward a `sync/*`
   equalization branch and PR handoff.

## Scope

- Keep the completed Phase 1 configuration, classification, toggle, badges, and
  config-file persistence foundation.
- Add a pure transition-policy model for governed source/target pairs.
- Add direct-merge policy support with default `warn`.
- Add release promotion ancestry validation with `ready`, `blocked`, and
  `inconclusive` outcomes.
- Add contextual diagnostics close to the graph surface.
- Add PR handoff through copyable context or recognized GitHub compare/PR URLs.
- Add a first production-to-release equalization assistant that can prepare a
  local `sync/*` branch after confirmation, without pushing automatically.

## Non-Goals

- No branch hiding or branch-type visibility checkboxes.
- No final direct merge into governed destination branches.
- No automatic push.
- No cleanup assistant.
- No GitLab, Azure Repos, Bitbucket, or generic provider API integration.
- No persistent diagnostics panel or separate diagnostics editor.
- No runtime dependency additions without explicit approval.

## Touched Surfaces

- `src/revisionGraph/flow/*` for policy, diagnostics, promotion checks, PR
  context, and sync planning helpers.
- `src/revisionGraph/controller.ts` and message handling boundaries for new
  graph intents.
- Existing revision graph webview context menu and toolbar feedback.
- Existing ref action services only where governance must warn or block
  extension-initiated direct merges.
- `package.json`, README, and CHANGELOG only if user-visible commands, settings,
  or documented workflows change.

## Acceptance Criteria

- Flow Governance never hides branch refs; all refs included by the current
  graph projection remain visible.
- Governed source/target pairs produce deterministic PR-required diagnostics.
- Direct governed merge handling defaults to `warn` and can be configured later
  without changing the policy engine contract.
- Release promotion validation reports `ready`, `blocked`, or `inconclusive`.
- Blocked release promotion explains that production contains commits missing
  from the release.
- PR handoff is available without requiring provider authentication.
- Equalization prepares only a local `sync/*` path after confirmation, never
  pushes automatically, and hands conflicts to VS Code Source Control.
- Existing compare, checkout, branch, merge, sync, delete, diff, log, minimap,
  search, focus, refresh, empty-state, and multi-repository behavior remains
  intact.

## Risks

- False release-readiness results: keep ancestry checks explicit and report
  inconclusive states honestly.
- Governance UX overload: keep feedback contextual and avoid a separate panel
  for 2.0.0.
- Unsafe Git mutation: require confirmation, preserve conflict guards, and avoid
  automatic push or final governed merges.
- Provider scope creep: ship PR handoff before API-based PR creation unless
  GitHub API work receives explicit scope approval.

## Test Plan

- Unit tests for transition-policy matching and direct-merge policy outcomes.
- Unit tests for release promotion readiness states.
- Tests for missing refs, Git command errors, and inconclusive validation.
- Message validation and authorization tests for new graph intents.
- Regression tests proving Flow Governance metadata and diagnostics do not hide
  refs or alter graph topology.
- Ref-action tests for governed merge warning/block boundaries when implemented.

## Verification

- Pure transition-policy model implemented on 2026-07-02 in
  `src/revisionGraph/flow/flowTransitionPolicy.ts`.
- Focused Flow Governance policy tests cover all governed default pairs,
  non-governed pairs, and direct merge policy outcomes for `off`, `warn`, and
  `block`.
- `npm run build` passed on 2026-07-02 after the policy engine slice.
- `npm test -- --test-name-pattern "Flow Governance"` passed on 2026-07-02 with
  563 compiled tests after the policy engine slice.

## Manual Validation

- Open the graph in an Extension Development Host.
- Enable Flow Governance with a repository config file.
- Select governed branch pairs and verify PR-required explanations.
- Validate a ready release and a blocked release.
- Confirm blocked release guidance points to equalization.
- Prepare a sync branch only after confirmation.
- Verify no automatic push happens.
- Verify conflicts are handed to Source Control.
- Re-check existing compare, diff, log, checkout, branch, merge, sync, and
  delete basics.

## Release-Note Impact

2.0.0 should be described as Flow Governance becoming operational: branch
classification, PR-required diagnostics, release readiness, PR handoff, and
safe production-to-release equalization guidance.

## Handoff Notes

The pure transition-policy layer is available for readiness checks, UI wiring,
or Git mutation guardrails. Next implementation slice should add release
promotion readiness before wiring contextual graph actions.
