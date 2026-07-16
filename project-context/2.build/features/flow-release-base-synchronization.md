# Flow Branch Base Synchronization

Status: Build and targeted manual validation complete
Last updated: 2026-07-16
Target: `2.0.0`

## Goal

Prevent governed branch creation from using a stale local source. The extension
must fetch the tracked upstream before checking ahead/behind and apply a policy
that matches the source branch: exact synchronization for branches created from
`main`, and a not-behind requirement for task and bug sources.

## User Workflow

1. The user opens a governed branch creation action: release, feature, hotfix,
   task, or bug.
2. The extension fetches the configured upstream into its remote-tracking ref,
   reloads the local branch, and only then checks ahead/behind.
3. Release, feature, and hotfix require `main` to match its upstream exactly.
   Ahead, behind, or divergent state requires explicit synchronization.
4. Task and bug require their feature or release source not to be behind. An
   ahead-only source proceeds without push; a behind-only source requires
   confirmed synchronization; divergence is blocked for manual reconciliation.
5. Confirmation runs the existing guarded synchronization workflow.
   Cancellation, a dirty/conflicted workspace, divergence, or a Git failure
   keeps the form closed.
6. After the source satisfies its policy, the extension opens the existing
   branch form. Host-side validation creates and checks out the branch.
7. After creation, the existing independent confirmation asks whether to
   publish the new branch and sets upstream tracking when accepted.

## Acceptance Criteria

- Every tracked governed source is fetched before ahead/behind is evaluated; a
  fetch failure keeps the form closed.
- Release, feature, and hotfix require exact synchronization with tracked
  `main`; ahead, behind, or divergent state cannot bypass the confirmation gate.
- Task and bug accept an ahead-only feature or release source without pushing,
  require confirmation and synchronization when it is behind-only, and block a
  divergent source with manual-reconciliation guidance.
- Ahead-only and divergent current `main` use the exact-sync confirmation gate;
  no push occurs without confirmation.
- Declining synchronization, failing synchronization, merge conflicts, or
  workspace readiness failure leaves the form closed and creates no branch.
- A behind-only selected branch that is not current is fast-forwarded from its
  tracked upstream after confirmation without switching the active branch.
  Exact-sync ahead/divergent non-current sources are blocked with guidance to
  check them out first; not-behind ahead-only sources proceed and divergent
  sources remain blocked for manual reconciliation.
- A source satisfying its policy, or a local source without an upstream
  comparison, preserves the current form workflow.
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
  Not-behind ahead-only sources may proceed without mutation; divergent sources
  and exact-sync ahead sources remain blocked while non-current.
- **Unexpected remote write:** exact-sync actions push ahead commits only after
  explicit synchronization confirmation. Not-behind actions never push the
  source during preflight; new-branch publication remains a separate explicit
  confirmation.

## Verification

- Unit coverage for policy selection, fetch-first detection, synchronized,
  ahead-only, behind/accepted, divergent, declined, failed, and non-current
  source branches.
- Protocol validation/authorization and message-handler coverage for the new
  preflight request.
- Rendered-webview coverage for request-before-form and host-triggered form
  display.
- `npm run build`, `npm test`, `git diff --check`, and `graphify update .`.

Automated verification on 2026-07-16:

- `npm run quality:check` passed with 215 production files and 2,060 functions.
- `npm run build` passed, including all isolated webview type checks.
- `npm test` passed with 719 tests.
- `git diff --check` passed.

Targeted Extension Development Host validation was confirmed by the maintainer
on 2026-07-16. The full release-candidate smoke matrix remains a separate
delivery gate.
