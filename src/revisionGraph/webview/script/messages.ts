    function createRevisionGraphWebviewReadyMessage(): RevisionGraphWebviewMessageOf<'webview-ready'> {
      return { type: 'webview-ready' };
    }

    function createRevisionGraphLoadTraceMessage(
      phase: string,
      durationMs: number,
      detail: string | undefined,
      requestId: number | undefined
    ): RevisionGraphWebviewMessageOf<'load-trace'> {
      const message: { type: 'load-trace'; phase: string; durationMs: number; detail?: string; requestId?: number } = { type: 'load-trace', phase, durationMs };
      if (detail !== undefined) {
        message.detail = detail;
      }
      if (requestId !== undefined) {
        message.requestId = requestId;
      }
      return message;
    }

    function createRevisionGraphRefreshMessage(): RevisionGraphWebviewMessageOf<'refresh'> {
      return { type: 'refresh' };
    }

    function createRevisionGraphRefreshWithEmptyCacheMessage(): RevisionGraphWebviewMessageOf<'refresh-with-empty-cache'> {
      return { type: 'refresh-with-empty-cache' };
    }

    function createRevisionGraphFetchCurrentRepositoryMessage(): RevisionGraphWebviewMessageOf<'fetch-current-repository'> {
      return { type: 'fetch-current-repository' };
    }

    function createRevisionGraphChooseRepositoryMessage(): RevisionGraphWebviewMessageOf<'choose-repository'> {
      return { type: 'choose-repository' };
    }

    function createRevisionGraphAbortMergeMessage(): RevisionGraphWebviewMessageOf<'abort-merge'> {
      return { type: 'abort-merge' };
    }

    function createRevisionGraphProjectionOptionsMessage(
      options: RevisionGraphWebviewProjectionOptions
    ): RevisionGraphWebviewMessageOf<'set-projection-options'> {
      return { type: 'set-projection-options', options };
    }

    function createRevisionGraphFlowGovernanceOptionsMessage(
      options: RevisionGraphWebviewFlowGovernanceOptions
    ): RevisionGraphWebviewMessageOf<'set-flow-governance-options'> {
      return { type: 'set-flow-governance-options', options };
    }

    function createRevisionGraphStartFlowBranchMessage(
      target: RevisionGraphWebviewTarget,
      branchKind: 'release' | 'feature' | 'task' | 'bug' | 'hotfix',
      name: string,
      description: string
    ): RevisionGraphWebviewMessageOf<'start-flow-branch'> {
      return {
        type: 'start-flow-branch',
        branchKind: branchKind,
        sourceRefName: target.name,
        name: name,
        description: description
      };
    }

    function createRevisionGraphPrepareFlowEqualizationMessage(
      targetRefName: string,
      originRefName: string,
      description: string
    ): RevisionGraphWebviewMessageOf<'prepare-flow-equalization'> {
      return { type: 'prepare-flow-equalization', targetRefName, originRefName, description };
    }

    function createRevisionGraphCopyFlowPullRequestContextMessage(sourceRefName: string, targetRefName: string): RevisionGraphWebviewMessageOf<'copy-flow-pr-context'> {
      return { type: 'copy-flow-pr-context', sourceRefName, targetRefName };
    }

    function createRevisionGraphCopyFlowPullRequestContextFieldMessage(sourceRefName: string, targetRefName: string, field: 'title' | 'description'): RevisionGraphWebviewMessageOf<'copy-flow-pr-context-field'> {
      return { type: 'copy-flow-pr-context-field', sourceRefName, targetRefName, field };
    }

    function createRevisionGraphOpenFlowPullRequestUrlMessage(sourceRefName: string, targetRefName: string): RevisionGraphWebviewMessageOf<'open-flow-pr-url'> {
      return { type: 'open-flow-pr-url', sourceRefName, targetRefName };
    }

    function createRevisionGraphCompareSelectedMessage(base: RevisionGraphWebviewTarget, compare: RevisionGraphWebviewTarget): RevisionGraphWebviewMessageOf<'compare-selected'> {
      return {
        type: 'compare-selected',
        baseRevision: base.revision,
        baseLabel: base.label,
        compareRevision: compare.revision,
        compareLabel: compare.label
      };
    }

    function createRevisionGraphShowLogRangeMessage(base: RevisionGraphWebviewTarget, compare: RevisionGraphWebviewTarget): RevisionGraphWebviewMessageOf<'show-log'> {
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

    function createRevisionGraphUnifiedDiffMessage(base: RevisionGraphWebviewTarget, compare: RevisionGraphWebviewTarget): RevisionGraphWebviewMessageOf<'open-unified-diff'> {
      return {
        type: 'open-unified-diff',
        baseRevision: base.revision,
        compareRevision: compare.revision
      };
    }

    function createRevisionGraphFocusRangeMessage(base: RevisionGraphWebviewTarget, compare: RevisionGraphWebviewTarget): RevisionGraphWebviewMessageOf<'set-projection-options'> {
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

    function createRevisionGraphFocusDescendantsMessage(target: RevisionGraphWebviewTarget): RevisionGraphWebviewMessageOf<'set-projection-options'> {
      return createRevisionGraphProjectionOptionsMessage({
        revisionRange: null,
        descendantFocus: {
          anchorRevision: target.hash,
          anchorLabel: target.label
        }
      });
    }

    function createRevisionGraphShowLogTargetMessage(target: RevisionGraphWebviewTarget): RevisionGraphWebviewMessageOf<'show-log'> {
      return {
        type: 'show-log',
        source: {
          kind: 'target',
          revision: target.revision,
          label: target.label
        }
      };
    }

    function createRevisionGraphCompareWithWorktreeMessage(target: RevisionGraphWebviewTarget): RevisionGraphWebviewMessageOf<'compare-with-worktree'> {
      return { type: 'compare-with-worktree', revision: target.revision, label: target.label };
    }

    function createRevisionGraphCopyCommitHashMessage(commitHash: string): RevisionGraphWebviewMessageOf<'copy-commit-hash'> {
      return { type: 'copy-commit-hash', commitHash };
    }

    function createRevisionGraphLoadCommitShortStatMessage(commitHash: string): RevisionGraphWebviewMessageOf<'load-commit-short-stat'> {
      return { type: 'load-commit-short-stat', commitHash };
    }

    function createRevisionGraphOpenCommitOnRemoteMessage(commitHash: string): RevisionGraphWebviewMessageOf<'open-commit-on-remote'> {
      return { type: 'open-commit-on-remote', commitHash };
    }

    function createRevisionGraphCopyRefNameMessage(target: RevisionGraphWebviewTarget): RevisionGraphWebviewMessageOf<'copy-ref-name'> {
      assertRevisionGraphWebviewRefKind(target.kind, 'copy a reference name');
      return { type: 'copy-ref-name', refName: target.name, refKind: target.kind };
    }

    function createRevisionGraphCheckoutMessage(target: RevisionGraphWebviewTarget): RevisionGraphWebviewMessageOf<'checkout'> {
      assertRevisionGraphWebviewCheckoutRefKind(target.kind);
      return { type: 'checkout', refName: target.name, refKind: target.kind };
    }

    function createRevisionGraphResetToCommitMessage(target: RevisionGraphWebviewTarget): RevisionGraphWebviewMessageOf<'reset-to-commit'> {
      const message: { type: 'reset-to-commit'; commitHash: string; label: string; targetKind: RevisionGraphWebviewTargetKind; targetName?: string } = {
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

    function createRevisionGraphSyncCurrentHeadMessage(): RevisionGraphWebviewMessageOf<'sync-current-head'> {
      return { type: 'sync-current-head' };
    }

    function createRevisionGraphPullCurrentHeadMessage(): RevisionGraphWebviewMessageOf<'pull-current-head'> {
      return { type: 'pull-current-head' };
    }

    function createRevisionGraphPushCurrentHeadMessage(mode: 'normal' | 'force-with-lease' | 'force'): RevisionGraphWebviewMessageOf<'push-current-head'> {
      return { type: 'push-current-head', mode: mode };
    }

    function createRevisionGraphStashSaveMessage(): RevisionGraphWebviewMessageOf<'stash-save'> {
      return { type: 'stash-save' };
    }

    function createRevisionGraphStashApplyMessage(target: RevisionGraphWebviewTarget): RevisionGraphWebviewMessageOf<'stash-apply'> {
      return { type: 'stash-apply', refName: target.name };
    }

    function createRevisionGraphStashPopMessage(target: RevisionGraphWebviewTarget): RevisionGraphWebviewMessageOf<'stash-pop'> {
      return { type: 'stash-pop', refName: target.name };
    }

    function createRevisionGraphStashDropMessage(target: RevisionGraphWebviewTarget): RevisionGraphWebviewMessageOf<'stash-drop'> {
      return { type: 'stash-drop', refName: target.name };
    }

    function createRevisionGraphPublishBranchMessage(target: RevisionGraphWebviewTarget): RevisionGraphWebviewMessageOf<'publish-branch'> {
      assertRevisionGraphWebviewPublishBranchRefKind(target.kind);
      return {
        type: 'publish-branch',
        refName: target.name,
        label: target.label,
        refKind: target.kind
      };
    }

    function createRevisionGraphCreateBranchMessage(target: RevisionGraphWebviewTarget): RevisionGraphWebviewMessageOf<'create-branch'> {
      return {
        type: 'create-branch',
        revision: target.revision,
        label: target.label,
        refKind: target.kind
      };
    }

    function createRevisionGraphCreateTagMessage(target: RevisionGraphWebviewTarget): RevisionGraphWebviewMessageOf<'create-tag'> {
      return {
        type: 'create-tag',
        revision: target.revision,
        label: target.label,
        refKind: target.kind
      };
    }

    function createRevisionGraphResolveRemoteTagStateMessage(target: RevisionGraphWebviewTarget): RevisionGraphWebviewMessageOf<'resolve-remote-tag-state'> {
      return {
        type: 'resolve-remote-tag-state',
        refName: target.name
      };
    }

    function createRevisionGraphPushTagMessage(target: RevisionGraphWebviewTarget): RevisionGraphWebviewMessageOf<'push-tag'> {
      assertRevisionGraphWebviewTagRefKind(target.kind, 'push a tag');
      return {
        type: 'push-tag',
        refName: target.name,
        label: target.label,
        refKind: target.kind
      };
    }

    function createRevisionGraphDeleteRemoteTagMessage(target: RevisionGraphWebviewTarget): RevisionGraphWebviewMessageOf<'delete-remote-tag'> {
      assertRevisionGraphWebviewTagRefKind(target.kind, 'delete a remote tag');
      return {
        type: 'delete-remote-tag',
        refName: target.name,
        label: target.label,
        refKind: target.kind
      };
    }

    function createRevisionGraphDeleteMessage(target: RevisionGraphWebviewTarget): RevisionGraphWebviewMessageOf<'delete'> {
      assertRevisionGraphWebviewDeletableRefKind(target.kind);
      return { type: 'delete', refName: target.name, refKind: target.kind };
    }

    function createRevisionGraphMergeMessage(target: RevisionGraphWebviewTarget): RevisionGraphWebviewMessageOf<'merge'> {
      if (!isRevisionGraphWebviewMergeRefKind(target.kind)) {
        throw new Error(`Cannot merge revision graph target kind: ${target.kind}`);
      }
      return {
        type: 'merge',
        refName: target.name,
        refKind: target.kind,
        commitHash: target.hash
      };
    }

    function isRevisionGraphWebviewMergeRefKind(
      kind: RevisionGraphWebviewTargetKind
    ): kind is RevisionGraphWebviewMergeRefKind {
      return kind === 'branch' || kind === 'remote' || kind === 'tag';
    }

    function assertRevisionGraphWebviewRefKind(
      kind: RevisionGraphWebviewTargetKind,
      action: string
    ): asserts kind is RevisionGraphWebviewRefKind {
      if (kind === 'commit') {
        throw new Error(`Cannot ${action} for revision graph target kind: ${kind}`);
      }
    }

    function assertRevisionGraphWebviewCheckoutRefKind(
      kind: RevisionGraphWebviewTargetKind
    ): asserts kind is RevisionGraphProtocol.CheckoutRefKind {
      if (kind !== 'head' && kind !== 'branch' && kind !== 'remote') {
        throw new Error(`Cannot checkout revision graph target kind: ${kind}`);
      }
    }

    function assertRevisionGraphWebviewPublishBranchRefKind(
      kind: RevisionGraphWebviewTargetKind
    ): asserts kind is RevisionGraphProtocol.PublishBranchRefKind {
      if (kind !== 'head' && kind !== 'branch') {
        throw new Error(`Cannot publish revision graph target kind: ${kind}`);
      }
    }

    function assertRevisionGraphWebviewTagRefKind(
      kind: RevisionGraphWebviewTargetKind,
      action: string
    ): asserts kind is 'tag' {
      if (kind !== 'tag') {
        throw new Error(`Cannot ${action} for revision graph target kind: ${kind}`);
      }
    }

    function assertRevisionGraphWebviewDeletableRefKind(
      kind: RevisionGraphWebviewTargetKind
    ): asserts kind is RevisionGraphProtocol.DeletableRefKind {
      if (kind !== 'branch' && kind !== 'remote' && kind !== 'tag') {
        throw new Error(`Cannot delete revision graph target kind: ${kind}`);
      }
    }
