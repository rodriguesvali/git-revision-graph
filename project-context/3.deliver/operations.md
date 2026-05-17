# Operations

## Runtime
The extension runs inside VS Code and depends on the built-in `vscode.git` extension plus local Git repositories.

## Monitoring
Monitor GitHub issues, Marketplace feedback, and user reports after releases.

Current release-preparation focus for `0.0.31`:

- Source Control toolbar launch and singleton editor graph reveal behavior.
- Removed side-bar graph contributions after upgrade from the old Activity Bar graph surface.
- Compare Results and Show Log lifecycle after editor graph panel close.
- Focus restoration after closing the last secondary review view.
- Compare Results and Show Log double-click diff routing.
- Persisted `Show Minimap` behavior and layout-state reuse.

## Alerts
No automated alerting is configured. Treat regressions in graph loading, repository switching, compare/diff, checkout, branch, merge, sync, delete, and log workflows as release-impacting.

## Runbooks
- Reproduce in an Extension Development Host with a Git repository.
- Run `npm run build` and `npm test`.
- Check manifest/command/view alignment when commands or views are affected.
- Prepare a patch release if a published regression is confirmed.

## Ownership
Repository maintainers own release decisions, Marketplace publishing, and rollback approval.
