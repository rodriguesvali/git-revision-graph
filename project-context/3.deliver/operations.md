# Operations

Status: Active
Last consolidated: 2026-07-09

## Runtime

The extension runs inside VS Code, depends on the built-in `vscode.git` extension, and operates on
local Git repositories.

## Monitoring

Monitor GitHub issues, Marketplace feedback, and maintainer reports after releases. Treat
regressions in graph loading, repository switching, compare/diff, checkout, branch/tag, merge,
sync, delete, reset, stash, restore, and log workflows as release-impacting.

For the published `1.5.9` package, also monitor reference tooltip placement, keyboard focus,
branch descriptions, lazy change-stat loading, Show Log reference badges, and Show Log paging /
`Show All Branches` toggle behavior.

## Runbook

1. Reproduce in an Extension Development Host with a Git repository.
2. Run `npm run build`.
3. Run `npm test` when behavior or regression risk is involved.
4. Check command, view, manifest, README, and test alignment when contribution surfaces are
   affected.
5. Prepare a patch release plan if a published regression is confirmed.

## Published Release Watch: 1.5.9

- Primary user-facing areas: reference tooltips in the revision graph and reference badges in
  Show Log rows/tooltips.
- First rollback candidates: reference-tooltip runtime, branch-description metadata attachment,
  lazy short-stat loading, Show Log badge rendering, and incremental Show Log toolbar sync.
- No settings, data migrations, contribution points, or dependency changes require operational
  migration.

## Ownership

Repository maintainers own release decisions, Marketplace publishing, and rollback approval.

Historical operations notes are archived in `project-context/archive/deliver/operations.md`.
