# Flow Governance Phase 1

Status: In progress - foundation slice implemented
Last updated: 2026-07-01
Target baseline: `1.5.6`

## Scope

Implement the Phase 1 foundation for Flow Governance as a non-mutating metadata overlay over the existing revision graph.

Included:

- Phase 1 Flow Governance types, defaults, config normalization, classification, diagnostics, decorations, and view-state helpers.
- VS Code settings for bootstrap/fallback behavior.
- Optional serializable `RevisionGraphViewState.flowGovernance` contract for later graph-state wiring.
- Deterministic tests for config, classification, inert future fields, unknown diagnostics, sync hiding, and serializable state.

Excluded:

- Webview rendering controls.
- Repository flow-file creation command.
- PR creation, provider authentication, promotion checks, equalization, cleanup, direct merge policy, and governed branch creation forms.
- Git mutations other than future explicit flow-file creation after confirmation.

## Architecture

Implementation starts in `src/revisionGraph/flow/*` and follows `project-context/1.define/sad.md`.

The first slice intentionally stays pure and host-side:

- no Git CLI calls;
- no provider API calls;
- no webview-side branch-name inference;
- no controller-owned inline classification rules;
- no new commands, menus, views, activation events, or runtime dependencies.

## Acceptance Criteria

- Defaults classify `main`, `master`, `release/*`, `sync/*`, `package`, `package/*`, `feature/*`, `task/*`, `bug/*`, `hotfix/*`, and unknown branches.
- `mainBranches` wins before branch-kind patterns.
- Pattern order is deterministic.
- Invalid schema or regex disables Flow Governance for that config result without throwing.
- Future-phase fields are tracked as ignored and remain inert.
- Generated Phase 1 config contains only Phase 1-supported fields.
- Flow view-state helpers return JSON-serializable metadata.
- The revision graph ready state remains unchanged until Flow Governance is explicitly wired.
- `package.json` settings remain aligned with the FRD/SAD.

## Verification

- `npm run build`
- `npm test`
- `git diff --check`

Focused tests:

- `test/flowGovernance.test.ts`
- manifest test updates for contributed settings
- `test/revisionGraphState.test.ts` confirms `flowGovernance` is absent by default
- `test/revisionGraphTypeBoundaries.test.ts` confirms the new type contract does not reintroduce import cycles

Current results:

- `npm run build` passed on 2026-07-01.
- Focused Flow Governance, manifest, revision graph state, and type-boundary tests passed on 2026-07-01.

## Risks

- Adding settings without runtime wiring can look like a complete feature. README and release notes must describe only shipped behavior when UI integration lands.
- Later webview work must preserve graph fidelity and message authorization boundaries.

## Handoff Notes

Next implementation slices should wire the pure flow state into ready graph view-state shaping, add message validation/authorization for Flow View toggles, and then add webview rendering controls.
