# Shared Revision Graph Message Protocol

Status: Complete - automated verification passed
Last updated: 2026-07-13
Release target: `2.0.0`

## Goal

Remove protocol drift between the revision-graph browser runtime and extension host by making outbound messages depend on one browser-safe source of truth.

## Scope and Acceptance Criteria

- Define every webview-to-host message and payload once without Node, VS Code, or DOM dependencies.
- Compile the same protocol under the host CommonJS target and browser `module: none` target.
- Remove the duplicated outbound union from the browser ambient contracts.
- Replace broad reference kinds with action-specific kinds and remove handler casts.
- Require compile-time exhaustive coverage in validation, state authorization, repository-scope authorization, and dispatch.
- Preserve message sanitization, stale-state protection, multi-repository behavior, and current UI behavior.

## Architectural Resolution

`src/revisionGraph/protocol.d.ts` owns the ambient `RevisionGraphProtocol` namespace. An ambient declaration is used deliberately because it can be consumed by both the host module compiler and the no-bundler browser script compiler without emitting runtime code or introducing imports into the webview bundle.

The host exports its public `RevisionGraphMessage` alias from this namespace. The browser's `RevisionGraphWebviewMessage` is an alias to the same union. Shared reference capabilities narrow payloads before dispatch: checkout, branch publication, tag operations, deletion, and merge each expose only their supported reference kinds.

Validation owns a `satisfies Record<MessageType, true>` registry and an exhaustive switch. State authorization, repository-scope authorization, and the handler end with explicit `never` checks. Adding a new message therefore fails compilation until all protocol boundaries have made an explicit decision.

## Verification

- `npm run build`: passed for the host and every isolated/full webview target.
- `npm run quality:check`: passed for 203 files and 1,985 functions without baseline changes.
- `npm test`: passed, 684 tests including protocol ownership and invalid-capability regressions.
- `git diff --check`: passed.
- `graphify update .`: passed; graph rebuilt with 3,810 nodes, 7,797 edges, and 313 communities.

## Risks and Rollback

The protocol remains compile-time only; runtime validation continues to treat webview input as untrusted. Projection clear sentinels (`null`) remain part of the wire contract and are normalized to internal `undefined` values before state mutation. Rollback requires reverting the shared declaration, aliases, narrowed validators/builders, exhaustive guards, tests, and this artifact together. No repository data migration is involved.
