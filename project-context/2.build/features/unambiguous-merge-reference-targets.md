# Unambiguous Merge Reference Targets

Status: Complete - automated verification passed
Last updated: 2026-07-13
Release target: `2.0.0`

## Goal

Guarantee that merge actions select the exact reference shown by the revision graph or reference picker when a branch, remote branch, or tag shares the same short name.

## Scope and Acceptance Criteria

- Carry reference name, reference kind, and selected commit hash across the revision-graph webview boundary.
- Reject malformed, stale, or mismatched merge identities before repository mutation.
- Resolve branch, remote, and tag merge targets to their fully qualified Git names.
- Preserve current-branch, ancestry, workspace, confirmation, conflict, refresh, and multi-repository guards.
- Apply the same qualified-reference behavior to the command-palette merge entrypoint.
- Add regression coverage for colliding branch/tag names and protocol validation.

## Architectural Resolution

The browser sends `{ refName, refKind, commitHash }`. The host validates the payload and authorizes it only when all three fields match one reference in the current ready graph state. The workflow retains the selected kind, and the shared merge action converts it immediately before Git execution:

- local branch: `refs/heads/<name>`
- remote branch: `refs/remotes/<name>`
- tag: `refs/tags/<name>`

The commit hash authenticates the exact graph selection and detects stale or forged messages. The fully qualified reference remains the operational merge input so Git preserves reference semantics without applying its ambiguous short-name precedence.

## Verification

- `npm run build`: passed.
- `npm run quality:check`: passed for 203 files and 1,973 functions.
- `npm test`: passed, 683 tests.
- `graphify update .`: passed; the code graph was rebuilt with 3,771 nodes, 7,740 edges, and 322 communities.

## Risks and Rollback

Existing custom callers that construct merge targets without a reference kind now fail at compile time, preventing silent ambiguity. Fully qualified refs are accepted unchanged to avoid double-prefixing. Before publication, rollback consists of reverting the protocol, workflow, shared merge action, tests, and this artifact together; no repository data migration is involved.
