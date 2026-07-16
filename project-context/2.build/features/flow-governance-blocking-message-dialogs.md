# Flow Governance Blocking Message Dialogs

Status: Build complete - manual validation pending
Last updated: 2026-07-16
Target: `2.0.0`

## Goal

Keep Flow Governance consistent with the extension's blocking-message policy by
presenting rejected concurrent-repository-operation feedback as an awaited
native VS Code modal warning instead of a transient toast.

## Scope And Acceptance Criteria

- Reuse `showConcurrentRepositoryMutationWarning` rather than duplicating its
  text or presentation options in Flow Governance workflows.
- Cover rejected branch creation, branch-start preflight, equalization, remote
  production verification, and Pull Request source publication preflight.
- Await the modal warning so the workflow does not finish while the dialog is
  still open.
- Preserve successful-operation feedback, benign no-op messages, generic Git
  failures, confirmations, repository routing, and Git mutation behavior.
- Do not change commands, menus, settings, dependencies, versions, packaging,
  or Marketplace behavior.

## Verification

- Integration coverage for Flow Governance and Pull Request workflow rejection
  paths, including modal options and awaited dismissal.
- `npm run quality:check`
- `npm run build`
- `npm test`
- `git diff --check`
- `graphify update .`

Automated verification on 2026-07-16:

- `npm run quality:check` passed with 215 production files and 2,058 functions.
- `npm run build` passed.
- `npm test` passed with 721 tests.
- `git diff --check` passed.
- `graphify update .` completed with 4,288 nodes, 8,520 edges, and 338 communities.

## Manual Smoke

In an Extension Development Host, start one long-running mutation for a
repository and request a Flow Governance branch/equalization or Pull Request
action for the same repository. Verify that an awaited modal warning explains
the concurrent operation and that no second Git mutation starts.
