# Flow Governance Missing Configuration Dialog

Status: Build complete - manual validation pending
Last updated: 2026-07-16
Target: `2.0.0`

## Goal

Present a visible native VS Code dialog when a Flow Governance action is
aborted because its repository configuration is no longer available, including
when the configuration file was deleted while the graph still shows previously
loaded Flow Governance metadata.

## Acceptance Criteria

- `Start New Release` revalidates Flow Governance configuration at the host
  boundary before opening the form.
- If configuration is missing, invalid, or disabled, the action is aborted and
  `Flow Governance is not available for this repository.` is shown as a modal
  warning rather than a transient notification.
- The same modal guard applies if availability changes after the form opens but
  before branch creation is submitted.
- The modal call is awaited so subsequent host UI does not race its dismissal.
- No branch, ref, configuration, command contribution, dependency, version, or
  Marketplace behavior changes as part of this fix.

## Verification

- Unit coverage asserts modal options, exact copy, and awaited dismissal.
- `npm run quality:check`, `npm run build`, `npm test`, `git diff --check`, and
  `graphify update .`.
- Manual Extension Development Host smoke: create and activate a repository
  flow file, delete it, then run `Start New Release`; verify a modal dialog and
  no form or branch creation.

Automated verification on 2026-07-16:

- `npm run quality:check` passed with 214 production files and 2,057 functions.
- `npm run build` passed.
- `npm test` passed with 713 tests.
- `git diff --check` passed.
