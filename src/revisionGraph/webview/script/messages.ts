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

    function createRevisionGraphFlowGovernanceOptionsMessage(options) {
      return { type: 'set-flow-governance-options', options };
    }

    function createRevisionGraphValidateReleasePromotionMessage(target) {
      return { type: 'validate-release-promotion', refName: target.name };
    }

    function createRevisionGraphStartFlowBranchMessage(target, branchKind, name, description) {
      const message = {
        type: 'start-flow-branch',
        branchKind: branchKind,
        sourceRefName: target.name,
        name: name
      };
      if (description) {
        message.description = description;
      }
      return message;
    }

    function createRevisionGraphPrepareFlowEqualizationMessage(targetRefName, originRefName, description) {
      return { type: 'prepare-flow-equalization', targetRefName, originRefName, description };
    }

    function createRevisionGraphCopyFlowPullRequestContextMessage(sourceRefName, targetRefName) {
      return { type: 'copy-flow-pr-context', sourceRefName, targetRefName };
    }

    function createRevisionGraphOpenFlowPullRequestUrlMessage(sourceRefName, targetRefName) {
      return { type: 'open-flow-pr-url', sourceRefName, targetRefName };
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

    function createRevisionGraphFocusRangeMessage(base, compare) {
      return createRevisionGraphProjectionOptionsMessage({
        descendantFocus: null,
        revisionRange: {
          baseRevision: base.revision,
          baseLabel: base.label,
          compareRevision: compare.revision,
          compareLabel: compare.label
        }
      });
    }

    function createRevisionGraphFocusDescendantsMessage(target) {
      return createRevisionGraphProjectionOptionsMessage({
        revisionRange: null,
        descendantFocus: {
          anchorRevision: target.hash,
          anchorLabel: target.label
        }
      });
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

    function createRevisionGraphLoadCommitShortStatMessage(commitHash) {
      return { type: 'load-commit-short-stat', commitHash };
    }

    function createRevisionGraphOpenCommitOnGitHubMessage(commitHash) {
      return { type: 'open-commit-on-github', commitHash };
    }

    function createRevisionGraphCopyRefNameMessage(target) {
      return { type: 'copy-ref-name', refName: target.name, refKind: target.kind };
    }

    function createRevisionGraphCheckoutMessage(target) {
      return { type: 'checkout', refName: target.name, refKind: target.kind };
    }

    function createRevisionGraphResetToCommitMessage(target) {
      const message = {
        type: 'reset-to-commit',
        commitHash: target.hash,
        label: target.label,
        targetKind: target.kind
      };
      if (target.kind !== 'commit') {
        message.targetName = target.name;
      }
      return message;
    }

    function createRevisionGraphSyncCurrentHeadMessage() {
      return { type: 'sync-current-head' };
    }

    function createRevisionGraphPullCurrentHeadMessage() {
      return { type: 'pull-current-head' };
    }

    function createRevisionGraphPushCurrentHeadMessage(mode) {
      return { type: 'push-current-head', mode: mode };
    }

    function createRevisionGraphStashSaveMessage() {
      return { type: 'stash-save' };
    }

    function createRevisionGraphStashApplyMessage(target) {
      return { type: 'stash-apply', refName: target.name };
    }

    function createRevisionGraphStashPopMessage(target) {
      return { type: 'stash-pop', refName: target.name };
    }

    function createRevisionGraphStashDropMessage(target) {
      return { type: 'stash-drop', refName: target.name };
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
