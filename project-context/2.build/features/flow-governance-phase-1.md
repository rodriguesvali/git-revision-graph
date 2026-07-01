# Flow Governance Phase 1

Status: In progress - repository config creation slice implemented
Last updated: 2026-07-01
Target baseline: `1.5.6`

## Scope

Implement the Phase 1 foundation for Flow Governance as a non-mutating metadata overlay over the existing revision graph.

Included:

- Phase 1 Flow Governance types, defaults, config normalization, classification, diagnostics, decorations, and view-state helpers.
- VS Code settings for bootstrap/fallback behavior.
- Optional serializable `RevisionGraphViewState.flowGovernance` contract for later graph-state wiring.
- Repository flow-file resolution with settings fallback and invalid-config diagnostics.
- Runtime graph-state wiring that attaches Flow Governance metadata when enabled or invalid.
- Host-side Flow View message validation, current-repository authorization, and in-memory state updates.
- Webview Flow Governance controls, branch-kind filters, and branch badges backed by host-provided metadata.
- Repository flow-file creation command with confirmation, path validation, existing-file protection, and default Phase 1 template content.
- Deterministic tests for config, classification, inert future fields, unknown diagnostics, sync hiding, and serializable state.

Excluded:

- PR creation, provider authentication, promotion checks, equalization, cleanup, direct merge policy, and governed branch creation forms.
- Git mutations other than explicit repository flow-file creation after confirmation.

## Architecture

Implementation starts in `src/revisionGraph/flow/*` and follows `project-context/1.define/sad.md`.

The first slice intentionally stays pure and host-side:

- no Git CLI calls;
- no provider API calls;
- no webview-side branch-name inference;
- no controller-owned inline classification rules;
- no new menus, views, activation events, or runtime dependencies.

## Acceptance Criteria

- Defaults classify `main`, `master`, `release/*`, `sync/*`, `package`, `package/*`, `feature/*`, `task/*`, `bug/*`, `hotfix/*`, and unknown branches.
- `mainBranches` wins before branch-kind patterns.
- Pattern order is deterministic.
- Invalid schema or regex disables Flow Governance for that config result without throwing.
- Future-phase fields are tracked as ignored and remain inert.
- Generated Phase 1 config contains only Phase 1-supported fields.
- Flow view-state helpers return JSON-serializable metadata.
- The revision graph ready state remains unchanged until Flow Governance is explicitly wired.
- Enabled fallback settings or valid repository flow files attach Flow Governance metadata to ready graph state.
- Invalid repository flow files attach disabled Flow Governance diagnostics without breaking graph load.
- `set-flow-governance-options` accepts only known Flow Governance options and branch kinds.
- Flow Governance option updates require a ready current-repository graph state with Flow Governance metadata.
- Flow Governance option updates do not trigger Git operations or graph rebuilds.
- Webview Flow Governance controls are hidden until host state includes Flow Governance metadata.
- Webview branch-kind filters and default sync/unknown hiding apply only to classified branch refs and preserve graph topology.
- Flow Governance badges and production-trunk highlighting are rendered from host metadata, not client-side branch-name inference.
- `Create Flow Governance Config` writes only inside the selected repository after explicit confirmation.
- Existing repository flow files are opened without overwrite.
- Invalid or escaping `configPath` values are rejected before filesystem writes.
- `package.json` settings remain aligned with the FRD/SAD.

## Verification

- `npm run build`
- `npm test`
- `git diff --check`

Focused tests:

- `test/flowGovernance.test.ts`
- manifest test updates for contributed settings
- `test/revisionGraphState.test.ts` confirms `flowGovernance` is absent by default
- `test/revisionGraphState.test.ts` confirms enabled settings and invalid repository config attach metadata safely
- `test/webviewMessageValidation.test.ts` covers Flow View message payload validation and state authorization
- `test/revisionGraphMessageDispatcher.test.ts` covers stale-repository rejection
- `test/revisionGraphMessageHandler.test.ts` covers host-boundary update routing
- `test/revisionGraphTypeBoundaries.test.ts` confirms the new type contract does not reintroduce import cycles
- `test/revisionGraphWebview.test.ts` covers Flow Governance controls, message posting, badges, and branch-ref filtering
- `test/flowGovernanceCommand.test.ts` covers repository config creation, cancellation, existing files, and path guards

Current results:

- `npm run build` passed on 2026-07-01.
- Focused Flow Governance, manifest, revision graph state, and type-boundary tests passed on 2026-07-01.
- Repository flow-file precedence, settings fallback, path guard, and invalid-config state tests passed on 2026-07-01.
- Focused Flow Governance message validation, dispatcher, handler, and type-boundary tests passed on 2026-07-01.
- Focused revision graph webview tests passed on 2026-07-01.
- Focused Flow Governance config command and package manifest tests passed on 2026-07-01.

## Risks

- README and release notes must describe Phase 1 as metadata, filtering, and config bootstrap only.
- Later governed branch and promotion flows must not infer policy from webview-only state.

## Handoff Notes

Next implementation slice should update release readiness notes and, if desired, add manual Extension Development Host verification steps for Flow Governance.
