# Operations

## Runtime
The extension runs inside VS Code and depends on the built-in `vscode.git` extension plus local Git repositories.

## Monitoring
Monitor GitHub issues, Marketplace feedback, and user reports after releases.

Current post-release monitoring focus for `1.0.1`:

- Current-branch force push and force-with-lease should route through VS Code Git API authentication/Source Control behavior.
- Current-branch pull failures should clear graph loading feedback before the user closes the error message.
- Normal push, pull success, sync, branch publish, tag push, and remote delete should remain unchanged.
- Marketplace feedback for the published `1.0.1` package.

## Alerts
No automated alerting is configured. Treat regressions in graph loading, repository switching, compare/diff, checkout, branch, merge, sync, delete, and log workflows as release-impacting.

## Runbooks
- Reproduce in an Extension Development Host with a Git repository.
- Run `npm run build` and `npm test`.
- Check manifest/command/view alignment when commands or views are affected.
- Prepare a patch release if a published regression is confirmed.

## Ownership
Repository maintainers own release decisions, Marketplace publishing, and rollback approval.
