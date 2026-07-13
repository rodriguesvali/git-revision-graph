# Flow Governance: Required Start Description

## Goal

Require a non-empty description whenever a Flow Governance branch is started, regardless of
whether the branch kind is release, feature, task, bug, or hotfix.

## Acceptance Criteria

- The start-flow form labels Description as required and blocks empty or whitespace-only values
  for every supported branch kind.
- The webview message contract requires a description.
- Extension-host validation rejects missing, empty, whitespace-only, or overlong descriptions.
- The branch workflow rejects an empty description before creating a branch and persists every
  accepted description as Git branch metadata.
- Automated tests cover the UI contract, message boundary, host handoff, and mutation boundary.

## Implementation Notes

- The description remains bounded to 2,048 characters.
- Validation is intentionally duplicated at the form, message, and mutation boundaries so a
  malformed or stale webview cannot bypass the invariant.

## Verification

- Passed: `npm run build`
- Passed: `npm test` (681 tests)
- Passed: `npm run quality:check` (203 files and 1,969 functions checked)
- Passed: `git diff --check`

## CI Follow-up

- The Windows verification job exposed pre-existing POSIX-only path expectations in
  `flowGovernanceCommand.test.ts`.
- The fixtures now derive expected absolute paths with `node:path`, preserving native Windows,
  Linux, and macOS semantics without changing the production path-safety implementation.
