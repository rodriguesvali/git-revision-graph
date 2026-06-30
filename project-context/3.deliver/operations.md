# Operations

## Runtime
The extension runs inside VS Code and depends on the built-in `vscode.git` extension plus local Git repositories.

## Monitoring
Monitor GitHub issues, Marketplace feedback, and user reports after releases.

Ongoing post-release monitoring focus for the published `1.5.5` scope:

- Focus Descendants must use Git ancestry from one visible anchor, not visual row or timestamp.
- The anchor, descendant references, and structurally required paths must remain visible while
  older and unrelated history is excluded.
- Focus Descendants and Focus Range must remain mutually exclusive in the first implementation.
- Clearing focus or changing the main graph scope must restore a correct ordinary projection.
- Snapshot reuse must not hide fresh refs or cross repository boundaries.
- Search, selection, context menus, minimap, zoom, persisted offsets, and virtualized rendering
  must continue to work on the focused scene.

Ongoing post-release monitoring focus for the published `1.5.4` scope:

- Focus Range should keep the ordered base/compare endpoints visible in the toolbar, replace
  the active range when a different pair is selected, and clear when the main graph scope changes.
- The already-active ordered range should not expose a redundant `Focus Range` context action.
- Current-branch sync failures caused by missing remote write privileges should use a modal
  error instead of a transient toaster.
- Current-branch push, branch publish, tag push, remote tag delete, and remote branch delete
  should also use modal errors for permission/protected-branch failures.
- Generic sync and pull failures should still clear the graph action/loading state without
  waiting for the user to dismiss the notification.
- Existing conflict handling and Source Control reveal behavior should remain unchanged.

Ongoing post-release monitoring focus for the published `1.5.3` UX patch:

- Large ref-to-ref and ref-to-worktree comparisons should open Compare Results immediately
  with a centered `Loading results...` dialog, then replace it with the result list.
- Compare loading should restore the previous Compare Results state, or close the panel when
  there was no previous state, if the comparison has no differences or fails.
- Blocking compare and unified diff failures, including output-limit errors, should use modal
  error dialogs instead of transient toasts.
- Compare Results `Unified Diff` should show `Generating Diff...` immediately and ignore
  duplicate clicks while generation is in flight.
- Existing Compare Results filtering, selection, context actions, file diffs, worktree
  restore, and Unified Diff behavior should remain unchanged after results load.

Ongoing post-release monitoring focus for earlier reliability releases:

- The Node 20 verification matrix should remain green on `ubuntu-latest`, `windows-latest`,
  and `macos-latest` using the shell-independent compiled test runner.
- Watch for regressions in repository-relative path presentation, Compare Results path IDs,
  Show Log path state, fake Git fixtures, bounded Git process termination, and content-sensitive
  restore fixtures after the Windows portability hardening.
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
- Monitor Marketplace feedback for the published package and prepare a follow-up
  patch if a published regression is confirmed.

## Alerts
No automated alerting is configured. Treat regressions in graph loading, repository switching, compare/diff, checkout, branch, merge, sync, delete, and log workflows as release-impacting.

## Runbooks
- Reproduce in an Extension Development Host with a Git repository.
- Run `npm run build` and `npm test`.
- Check manifest/command/view alignment when commands or views are affected.
- Prepare a patch release if a published regression is confirmed.

## Ownership
Repository maintainers own release decisions, Marketplace publishing, and rollback approval.
