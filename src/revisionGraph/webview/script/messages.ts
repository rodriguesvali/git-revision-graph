export function renderRevisionGraphScriptMessageBuilders(): string {
  return `
    function createRevisionGraphWebviewReadyMessage() {
      return { type: 'webview-ready' };
    }

    function createRevisionGraphLoadTraceMessage(phase, durationMs, detail, requestId) {
      const message = { type: 'load-trace', phase, durationMs };
      if (detail !== undefined) {
        message.detail = detail;
      }
      if (requestId !== undefined) {
        message.requestId = requestId;
      }
      return message;
    }

    function createRevisionGraphRefreshMessage() {
      return { type: 'refresh' };
    }

    function createRevisionGraphRefreshWithEmptyCacheMessage() {
      return { type: 'refresh-with-empty-cache' };
    }

    function createRevisionGraphFetchCurrentRepositoryMessage() {
      return { type: 'fetch-current-repository' };
    }

    function createRevisionGraphChooseRepositoryMessage() {
      return { type: 'choose-repository' };
    }

    function createRevisionGraphAbortMergeMessage() {
      return { type: 'abort-merge' };
    }

    function createRevisionGraphProjectionOptionsMessage(options) {
      return { type: 'set-projection-options', options };
    }

    function createRevisionGraphCompareSelectedMessage(base, compare) {
      return {
        type: 'compare-selected',
        baseRevision: base.revision,
        baseLabel: base.label,
        compareRevision: compare.revision,
        compareLabel: compare.label
      };
    }

    function createRevisionGraphShowLogRangeMessage(base, compare) {
      return {
        type: 'show-log',
        source: {
          kind: 'range',
          baseRevision: base.revision,
          baseLabel: base.label,
          compareRevision: compare.revision,
          compareLabel: compare.label
        }
      };
    }

    function createRevisionGraphUnifiedDiffMessage(base, compare) {
      return {
        type: 'open-unified-diff',
        baseRevision: base.revision,
        compareRevision: compare.revision
      };
    }

    function createRevisionGraphShowLogTargetMessage(target) {
      return {
        type: 'show-log',
        source: {
          kind: 'target',
          revision: target.revision,
          label: target.label
        }
      };
    }

    function createRevisionGraphCompareWithWorktreeMessage(target) {
      return { type: 'compare-with-worktree', revision: target.revision, label: target.label };
    }

    function createRevisionGraphCopyCommitHashMessage(commitHash) {
      return { type: 'copy-commit-hash', commitHash };
    }

    function createRevisionGraphCopyRefNameMessage(target) {
      return { type: 'copy-ref-name', refName: target.name, refKind: target.kind };
    }

    function createRevisionGraphCheckoutMessage(target) {
      return { type: 'checkout', refName: target.name, refKind: target.kind };
    }

    function createRevisionGraphSyncCurrentHeadMessage() {
      return { type: 'sync-current-head' };
    }

    function createRevisionGraphPullCurrentHeadMessage() {
      return { type: 'pull-current-head' };
    }

    function createRevisionGraphPushCurrentHeadMessage() {
      return { type: 'push-current-head' };
    }

    function createRevisionGraphResetCurrentWorkspaceMessage(includeUntracked) {
      return { type: 'reset-current-workspace', includeUntracked: !!includeUntracked };
    }

    function createRevisionGraphPublishBranchMessage(target) {
      return {
        type: 'publish-branch',
        refName: target.name,
        label: target.label,
        refKind: target.kind
      };
    }

    function createRevisionGraphCreateBranchMessage(target) {
      return {
        type: 'create-branch',
        revision: target.revision,
        label: target.label,
        refKind: target.kind
      };
    }

    function createRevisionGraphCreateTagMessage(target) {
      return {
        type: 'create-tag',
        revision: target.revision,
        label: target.label,
        refKind: target.kind
      };
    }

    function createRevisionGraphResolveRemoteTagStateMessage(target) {
      return {
        type: 'resolve-remote-tag-state',
        refName: target.name
      };
    }

    function createRevisionGraphPushTagMessage(target) {
      return {
        type: 'push-tag',
        refName: target.name,
        label: target.label,
        refKind: target.kind
      };
    }

    function createRevisionGraphDeleteRemoteTagMessage(target) {
      return {
        type: 'delete-remote-tag',
        refName: target.name,
        label: target.label,
        refKind: target.kind
      };
    }

    function createRevisionGraphDeleteMessage(target) {
      return { type: 'delete', refName: target.name, refKind: target.kind };
    }

    function createRevisionGraphMergeMessage(target) {
      return { type: 'merge', refName: target.name };
    }
  `;
}
