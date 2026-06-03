# Operations

## Runtime
The extension runs inside VS Code and depends on the built-in `vscode.git` extension plus local Git repositories.

## Monitoring
Monitor GitHub issues, Marketplace feedback, and user reports after releases.

Current release-preparation focus for `0.0.36`:

- Large graph loading with `d3-dag` layout and major-operations projection.
- Worker-thread layout execution on uncached graph layouts.
- Webview graph virtualization while scrolling, zooming, searching, and using the minimap.
- Stale render discard behavior after rapid repository events, refreshes, fetches, and scope changes.
- Existing compare, Show Log, checkout, branch, sync, merge, delete, reset, and conflict-guard workflows.
- VSIX contents for compiled worker files under `out/revisionGraph/layout/`.

## Alerts
No automated alerting is configured. Treat regressions in graph loading, repository switching, compare/diff, checkout, branch, merge, sync, delete, and log workflows as release-impacting.

## Runbooks
- Reproduce in an Extension Development Host with a Git repository.
- Run `npm run build` and `npm test`.
- Check manifest/command/view alignment when commands or views are affected.
- Prepare a patch release if a published regression is confirmed.

## Ownership
Repository maintainers own release decisions, Marketplace publishing, and rollback approval.
