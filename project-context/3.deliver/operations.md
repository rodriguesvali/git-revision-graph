# Operations

Status: Active
Last consolidated: 2026-10-17

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

## Candidate Watch: 1.7.5

This candidate remains unreleased; the published baseline is 1.7.4. After an
authorized release, monitor these changes:

- VS Code 1.100.0 minimum: clients on 1.90–1.99 cannot install new updates.
- Named detached tags load without a fabricated branch; ref identity remains
  exact when a branch and tag share a name.
- Compare Results Revert is available only for reference-to-worktree comparisons. Restore
  failures recover previous files or identify retained copies; preserve them.
- Actions from replaced repositories/panels/renders have no effects; canceled
  graph loads do not replace fresh results or display retired errors.
- Bisect preserves external replacements, reconciles applied answers after
  interrupted saves and resolves selected targets in their exact namespace.
  Older sessions lacking a verifiable identity may require Detach Controls and
  manual recovery. Never reset external native state to clear an extension error.
- View uses one compact graph policy; removing Show Merge Commits does not
  reconstruct commits omitted by bounded loading/Git simplification. The Flow
  checkbox indicates activation; errors and Saving… remain visible when needed.

No runtime dependency, command or setting was added. Persisted bisect recovery
fields and engine/type changes require care when reverting a source slice; an
older build must not be assumed safe to control a current active search.
Preserve Git state, recovery files and user Flow configuration during rollback.
Before publication, revert a coherent slice; after publication, prepare an
authorized later patch and never reuse 1.7.5. See [release readiness](release.md)
and the [publication review](1.7.5-publication-review.md) for gates and evidence.

## Published Release Watch: 1.7.4

Publication was confirmed by the maintainer on 2026-10-11. Monitor guided bug
search checkout/restoration and compact controls, Show Log expanded-file change
search, Feature/Bug from Package, Package from Main and one-second tooltips.
Known safety corrections for these workflows are included in the 1.7.5 candidate.
Historical package/installation evidence remains recorded in [deployment](deployment.md).

## Published Release Watch: 1.7.3

Final smoke and Marketplace publication were confirmed by the maintainer on
2026-10-04. The local VSIX was inspected; clean-profile installation and exact
published-package equivalence were not recorded. Monitor these behaviors:

- Complete long reference names remain readable in narrow panes; keyboard menus,
  submenu dismissal and focus restoration work after updates.
- Compare Results retains filters and valid selections during updates to the same
  comparison; new comparisons and repositories reset context; actions target current files.
- Show Log shows one centered loading indicator, retaining pagination feedback.
- `file:` matches changed repository-relative paths and `change:` matches literal,
  case-sensitive text in added/removed lines. Combined metadata filters use AND.
  Range/all-branches scope, paging, clear/replacement and repository switching remain usable.
- The search cap remains 2,000 original commits. Partial-history notices must remain
  visible; timeouts, invalid syntax and Git failures must not be reported as no matches.

No persisted schema or runtime dependency migration is needed. For a published
regression, prepare an authorized later patch and never reuse 1.7.3. Preserve Git
state and user Flow Governance files.
Feature rollback boundaries and delivery evidence are in [release readiness](release.md).

## Published Release Watch: 1.7.2

Publication confirmed by the maintainer on 2026-09-22. Monitor these behaviors:

- Toolbar action, icon and tooltip agree with current branch tracking; canceling publication
  leaves Git state unchanged; force-push options are absent in Publish mode.
- Descendant focus restores on the correct repository after window reload and switching;
  Clear and scope/range replacement remove the saved focus. Storage failures are logged as
  `Could not restore Focus Descendants.` or `Could not persist Focus Descendants.`.
- Center on HEAD availability follows the projected graph, including filtered and offscreen HEAD.

Persistence is workspace-local under versioned `gitRevisionGraph.descendantFocus.v1:` keys,
separated by normalized repository path. The saved anchor is a commit hash, not a moving
branch name. If the anchor is outside loaded history, use Clear; an empty focused graph does
not imply lost Git history. No migration, new setting or runtime dependency is introduced.

For rollback, revert the affected feature slice before publication or ship an approved patch
afterward. Old preference keys can remain unused; do not delete Git branches or user Flow files.
Publication evidence and outstanding operational checks are tracked in [release readiness](release.md).

## Historical Published Release Watch: 1.6.1

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
