# Release 1.5.4 Prioritization

## Release Status

Status: Scope closed on 2026-06-29. The release candidate contains the approved remote-error
UX safety correction and Focus Range graph-navigation feature. Package metadata is `1.5.4`,
final automated verification is current, and release artifacts are ready for
maintainer-controlled VSIX packaging and Marketplace publication.

## Objective

Deliver `1.5.4` as a focused graph-navigation and UX safety patch: add a temporary selected-range
focus mode and ensure remote Git authorization failures that block an operation use modal
feedback rather than transient toaster notifications.

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

### Focus selected range

- Add `Focus Range` to the two-revision context menu.
- Reproject the loaded snapshot to the ordered `base..compare` path without opening another
  product surface.
- Show the active endpoints in a removable, accessible indicator at the end of the toolbar.
- Use `Update Focus Range` for a different selected pair and omit the redundant action when the
  selected ordered pair already matches the active range.
- Clear the active range when the main graph scope changes.

Implementation reference:

- `project-context/2.build/features/1.5.4-focus-selected-range.md`

## Deferred Beyond 1.5.4

- Broad Git error taxonomy redesign.
- New commands, contribution points, settings, or dependencies.
- Any release packaging or Marketplace publish step without explicit maintainer approval.
- Graph-driven branching workflow profiles, including a possible Git Flow preset, are reserved
  for the `2.0.0` product cycle.

## Acceptance Criteria

- Permission/protected-branch failures in the listed remote-mutating flows are shown with
  `{ modal: true }`.
- The reported current-branch sync case, where the server rejects the push side for missing
  privileges, waits for the modal error before the action promise resolves.
- Generic Git sync/pull failures remain nonblocking.
- Two selected revisions can activate or update Focus Range, while the active ordered pair does
  not expose a redundant focus action.
- The toolbar indicator exposes the complete active range accessibly, can clear the range, and
  is cleared when the main graph scope changes.
- Automated verification passes: `npm run build`, `npm test`, and `git diff --check`.
- Manual Extension Development Host validation exercises at least the current-branch sync
  missing-server-privileges path before packaging approval.

## Verification Evidence

- `npm run build` passed.
- `npx tsc -p ./tsconfig.test.json` passed.
- `node --test out-test/test/errorDetail.test.js out-test/test/refActions.test.js` passed.
- Final `npm test` passed with 514 tests on 2026-06-29.
- `git diff --check` passed.

## Release Gates

- Scope opened and closed: complete.
- Implementation and final automated verification: complete locally.
- Package version bump to `1.5.4`: complete after maintainer approval.
- Marketplace-facing changelog and README notes: complete.
- Interactive Focus Range behavior review: completed by the maintainer during candidate review.
- Remote permission/protected-branch Extension Development Host smoke validation: pending.
- VSIX packaging and Marketplace publication: pending explicit maintainer approval.

## Rollback

If the classifier over-promotes common Git failures to modal errors, narrow the detection patterns
and keep the action-specific modal handling. Do not remove the existing nonblocking path for
ordinary sync/pull failures.
