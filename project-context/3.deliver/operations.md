# Operations

Status: Active
Last consolidated: 2026-06-30

## Runtime

The extension runs inside VS Code, depends on the built-in `vscode.git` extension, and operates on
local Git repositories.

## Monitoring

Monitor GitHub issues, Marketplace feedback, and maintainer reports after releases. Treat
regressions in graph loading, repository switching, compare/diff, checkout, branch/tag, merge,
sync, delete, reset, stash, restore, and log workflows as release-impacting.

## Runbook

1. Reproduce in an Extension Development Host with a Git repository.
2. Run `npm run build`.
3. Run `npm test` when behavior or regression risk is involved.
4. Check command, view, manifest, README, and test alignment when contribution surfaces are
   affected.
5. Prepare a patch release plan if a published regression is confirmed.

## Ownership

Repository maintainers own release decisions, Marketplace publishing, and rollback approval.

Historical operations notes are archived in `project-context/archive/deliver/operations.md`.
