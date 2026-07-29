# Operations

Status: Active
Last consolidated: 2026-07-29

## Runtime

The extension runs inside VS Code, depends on the built-in `vscode.git` extension, and operates on
local Git repositories.

## Monitoring

Monitor GitHub issues, Marketplace feedback, and maintainer reports after releases. Treat
regressions in graph loading, repository switching, compare/diff, checkout, branch/tag, merge,
sync, delete, reset, stash, restore, and log workflows as release-impacting.

For the published `1.6.1` release, also monitor Flow Governance classification, branch forms,
remote-host handoff, AI text assistance, Compare Briefing, cancellation, modal failures, and
multi-repository ownership.

## Runbook

1. Reproduce in an Extension Development Host with a Git repository.
2. Run `npm run build`.
3. Run `npm test` when behavior or regression risk is involved.
4. Check command, view, manifest, README, and test alignment when contribution surfaces are
   affected.
5. Prepare a patch release plan if a published regression is confirmed.

## Published Release Watch: 1.6.1

- Publication was confirmed complete by the maintainer on 2026-07-29.
- Monitor bounded Flow config loading and persistence failures, stale Compare
  Results suppression, large untracked worktree comparisons, Show Log truncation copy, timed-out
  Git cleanup, and AI start/stop behavior across Compare Results and every governed branch form.
- First rollback candidates are the focused `1.6.1` correction slices recorded in
  `project-context/2.build/features/1.6.1-reliability-security-hardening.md`,
  `project-context/2.build/features/1.6.1-ai-request-cancellation.md`, and
  `project-context/2.build/features/1.6.1-branch-ai-descriptions.md`.
- If a regression is discovered after publication, do not reuse `1.6.1`; restore the last known-good
  behavior in a new patch. Never delete user-owned `.git-revision-graph-flow.json` files during
  rollback.

## Published Baseline Watch: 1.6.0

- Primary user-facing areas: Flow Governance workflows and diagnostics, hosted-Git URL handoff,
  Compare Briefing, AI PR/release text assistance, graph interaction, Compare Results, and Show Log.
- The published `1.6.1` release adds no setting, command, view, contribution point, runtime
  dependency, or data migration requiring operational migration.

## Ownership

Repository maintainers own release decisions, Marketplace publishing, and rollback approval.

Historical operations notes are archived in `project-context/archive/deliver/operations.md`.
