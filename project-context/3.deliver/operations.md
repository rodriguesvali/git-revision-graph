# Operations

## Runtime
The extension runs inside VS Code and depends on the built-in `vscode.git` extension plus local Git repositories.

## Monitoring
Monitor GitHub issues, Marketplace feedback, and user reports after releases.

Current post-release monitoring focus for `1.5.0` and its documentation-only `1.5.1`
corrective package:

- Merge conflicts should use the native modal error dialog, refresh conflict state before
  dismissal, and allow `Abort Merge` after the dialog closes.
- Repository mutations should reject overlapping work for the same repository without
  blocking independent repositories.
- Restore operations should preserve tracked-file semantics and reject symlink-ancestor or
  outside-repository targets.
- Git metadata, local mutation, remote-capable, and fallback calls should retain their
  approved timeout, output, cancellation, and process-tree limits.
- Compare Results and Show Log panels should invalidate when their owning repository closes.
- Layout worker failures and ref-content failures should remain bounded and explicit.
- Monitor Marketplace feedback for both the initially published `1.5.0` package and the
  corrected release metadata in the pending `1.5.1` package.

## Alerts
No automated alerting is configured. Treat regressions in graph loading, repository switching, compare/diff, checkout, branch, merge, sync, delete, and log workflows as release-impacting.

## Runbooks
- Reproduce in an Extension Development Host with a Git repository.
- Run `npm run build` and `npm test`.
- Check manifest/command/view alignment when commands or views are affected.
- Prepare a patch release if a published regression is confirmed.

## Ownership
Repository maintainers own release decisions, Marketplace publishing, and rollback approval.
