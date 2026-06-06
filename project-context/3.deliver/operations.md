# Operations

## Runtime
The extension runs inside VS Code and depends on the built-in `vscode.git` extension plus local Git repositories.

## Monitoring
Monitor GitHub issues, Marketplace feedback, and user reports after releases.

Current post-release monitoring focus for `1.0.0`:

- Current-branch push mode selection and canceled-push refresh behavior.
- Default-off `Show Merge Commits` graph view option.
- Remote checkout overwrite confirmation with `Override branch if exists`.
- Show Log expanded-row graph spacing, comparison selection styling, copy-reference-name action, and multi-select cherry-pick flows.
- Cherry-pick conflict/in-progress handling, including empty cherry-pick skip and guarded abort/open-Source-Control fallbacks.
- Existing compare, Show Log, checkout, branch, sync, merge, delete, reset, and conflict-guard workflows.
- Marketplace feedback for the published `1.0.0` package.

## Alerts
No automated alerting is configured. Treat regressions in graph loading, repository switching, compare/diff, checkout, branch, merge, sync, delete, and log workflows as release-impacting.

## Runbooks
- Reproduce in an Extension Development Host with a Git repository.
- Run `npm run build` and `npm test`.
- Check manifest/command/view alignment when commands or views are affected.
- Prepare a patch release if a published regression is confirmed.

## Ownership
Repository maintainers own release decisions, Marketplace publishing, and rollback approval.
