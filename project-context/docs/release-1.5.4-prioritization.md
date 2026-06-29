# Release 1.5.4 Prioritization

## Release Status

Status: Opened on 2026-06-29 as a narrow patch release. Implementation for the initial scope
is complete locally. Package metadata is bumped to `1.5.4` after maintainer approval;
packaging, VSIX generation, and Marketplace publication remain pending explicit maintainer
approval.

## Objective

Deliver `1.5.4` as a focused UX safety patch for remote Git authorization failures that block
the requested operation and should not be dismissible as transient toaster notifications.

## Context

- Published package baseline: `1.5.3`.
- Target patch: `1.5.4`.
- Package metadata reports `1.5.4` in `package.json` and `package-lock.json`.
- The active product surface remains unchanged: Source Control-launched revision graph editor,
  Compare Results editor panel, Show Log editor panel, and native VS Code Git workflows.
- The launch item was identified after the `1.5.3` release while reviewing remaining blocking
  alert paths.

## Scope

### Remote permission modal alerts

- Detect remote permission and protected-branch failures from Git error text.
- Show modal errors for server-side authorization failures in remote-mutating workflows:
  - current-branch sync
  - current-branch push
  - branch publish
  - tag push
  - remote tag delete
  - remote branch delete
- Preserve nonblocking notification behavior for ordinary sync and pull failures so graph loading
  state still clears without waiting for notification dismissal.

Implementation reference:

- `project-context/2.build/features/1.5.4-remote-permission-modal-alerts.md`

## Deferred Beyond 1.5.4

- Broad Git error taxonomy redesign.
- New commands, contribution points, settings, or dependencies.
- Any release packaging or Marketplace publish step without explicit maintainer approval.

## Acceptance Criteria

- Permission/protected-branch failures in the listed remote-mutating flows are shown with
  `{ modal: true }`.
- The reported current-branch sync case, where the server rejects the push side for missing
  privileges, waits for the modal error before the action promise resolves.
- Generic Git sync/pull failures remain nonblocking.
- Automated verification passes: `npm run build`, `npm test`, and `git diff --check`.
- Manual Extension Development Host validation exercises at least the current-branch sync
  missing-server-privileges path before packaging approval.

## Verification Evidence

- `npm run build` passed.
- `npx tsc -p ./tsconfig.test.json` passed.
- `node --test out-test/test/errorDetail.test.js out-test/test/refActions.test.js` passed.
- `npm test` passed with 508 tests.
- `git diff --check` passed.

## Release Gates

- Scope opened: complete.
- Initial implementation and automated verification: complete locally.
- Package version bump to `1.5.4`: complete after maintainer approval.
- Changelog candidate notes: drafted.
- Manual Extension Development Host smoke validation: pending.
- VSIX packaging and Marketplace publication: pending explicit maintainer approval.

## Rollback

If the classifier over-promotes common Git failures to modal errors, narrow the detection patterns
and keep the action-specific modal handling. Do not remove the existing nonblocking path for
ordinary sync/pull failures.
