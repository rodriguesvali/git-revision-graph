# Flow Release Base Synchronization

Status: Build complete - manual validation pending
Last updated: 2026-07-13
Target: `2.0.0`

## Goal

Prevent `Start New Release` from creating a release branch from a stale local
`main`. The branch-creation form must open only after the selected production
branch is synchronized with its tracked upstream, or after the user explicitly
confirms and completes synchronization.

## User Workflow

1. The user opens `Flow Governance > Start New Release` on `main`.
2. The extension checks the local branch's ahead/behind state against its
   configured upstream before opening the form.
3. If the branch is already synchronized, the release form opens immediately.
4. If it is ahead, behind, or divergent, the extension describes that state and
   asks the user to `Synchronize and Continue`.
5. Confirmation runs the existing guarded current-branch synchronization
   workflow. Cancellation, a dirty/conflicted workspace, or a Git failure keeps
   the form closed.
6. After successful synchronization, the extension opens the existing release
   form. Host-side validation creates and checks out the release branch.
7. After creation, the existing independent confirmation asks whether to
   publish the new branch and sets upstream tracking when accepted.

## Acceptance Criteria

- A current `main` with `behind > 0` cannot open the release form until the user
  confirms synchronization and pull succeeds.
- Ahead-only and divergent current branches use the same explicit sync gate;
  no push occurs without confirmation.
- Declining synchronization, failing synchronization, merge conflicts, or
  workspace readiness failure leaves the form closed and creates no branch.
- A behind-only selected branch that is not current is fast-forwarded from its
  tracked upstream after confirmation without switching the active branch.
  Ahead or divergent non-current branches are blocked with guidance to check
  them out first.
- A synchronized branch, or a local branch without an upstream comparison,
  preserves the current form workflow.
- Form validation, branch naming, per-repository mutation coordination, refresh,
  and the post-creation optional publication confirmation remain intact.
- Webview requests remain validated and authorized against the current
  repository and Flow Governance source-kind policy.

## Risks and Controls

- **Stale webview intent:** the host authorizes the source ref against current
  state before running the preflight and again on form submission.
- **Concurrent Git mutation:** synchronization runs through the existing
  per-repository mutation coordinator.
- **Unexpected branch switch:** a non-current behind-only branch is updated by
  an explicit fetch refspec; the workflow never checks it out automatically.
  Non-current ahead/divergent branches remain blocked.
- **Unexpected remote write:** ahead commits are pushed only after the explicit
  synchronization confirmation; release publication remains a second explicit
  confirmation.

## Verification

- Unit coverage for synchronized, behind/accepted, declined, failed, and
  non-current base branches.
- Protocol validation/authorization and message-handler coverage for the new
  preflight request.
- Rendered-webview coverage for request-before-form and host-triggered form
  display.
- `npm run build`, `npm test`, `git diff --check`, and `graphify update .`.

Automated verification on 2026-07-13:

- `npm run quality:check` passed with 213 production files and 2,056 functions.
- `npm run build` passed, including all isolated webview type checks.
- `npm test` passed with 712 tests.
- `git diff --check` passed.

Manual Extension Development Host validation remains pending through the release
smoke matrix.
