import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_WEBVIEW_MESSAGE_ARRAY_LENGTH,
  MAX_WEBVIEW_MESSAGE_STRING_LENGTH,
  isBoundedStringArray
} from '../src/webviewMessageValidation';
import {
  isRevisionGraphMessageAllowedForCurrentRepository,
  isRevisionGraphMessageAllowedForState,
  validateRevisionGraphMessage
} from '../src/revisionGraph/messageValidation';
import { validateCompareResultsWebviewMessage } from '../src/compareResults/messageValidation';
import { validateShowLogWebviewMessage } from '../src/showLog/messageValidation';
import { RevisionGraphViewState } from '../src/revisionGraphTypes';

test('validateRevisionGraphMessage rejects malformed graph messages', () => {
  assert.equal(validateRevisionGraphMessage(undefined), undefined);
  assert.equal(validateRevisionGraphMessage({}), undefined);
  assert.equal(validateRevisionGraphMessage({ type: 'open-source-control' }), undefined);
  assert.equal(validateRevisionGraphMessage({ type: 'checkout', refName: 'main', refKind: 'evil' }), undefined);
  assert.equal(validateRevisionGraphMessage({ type: 'set-projection-options', options: { showTags: 'yes' } }), undefined);
  assert.equal(
    validateRevisionGraphMessage({
      type: 'copy-commit-hash',
      commitHash: 'a'.repeat(MAX_WEBVIEW_MESSAGE_STRING_LENGTH + 1)
    }),
    undefined
  );
  assert.equal(
    validateRevisionGraphMessage({ type: 'copy-ref-name', refName: 'main', refKind: 'commit' }),
    undefined
  );
  assert.equal(
    validateRevisionGraphMessage({ type: 'reset-to-commit', commitHash: 'tag1', label: 'v1.0.0', targetKind: 'evil', targetName: 'v1.0.0' }),
    undefined
  );
  assert.equal(
    validateRevisionGraphMessage({ type: 'reset-to-commit', commitHash: 'tag1', label: 'v1.0.0', targetKind: 'tag' }),
    undefined
  );
  assert.equal(
    validateRevisionGraphMessage({ type: 'load-trace', phase: '', durationMs: 1 }),
    undefined
  );
  assert.equal(
    validateRevisionGraphMessage({ type: 'set-flow-governance-options', options: {} }),
    undefined
  );
  assert.equal(
    validateRevisionGraphMessage({ type: 'validate-release-promotion', refName: '' }),
    undefined
  );
  assert.equal(
    validateRevisionGraphMessage({ type: 'start-flow-branch', branchKind: 'release', sourceRefName: 'main', name: '' }),
    undefined
  );
  assert.equal(
    validateRevisionGraphMessage({ type: 'start-flow-branch', branchKind: 'release', sourceRefName: '', name: '2.0.0' }),
    undefined
  );
  assert.equal(
    validateRevisionGraphMessage({ type: 'start-flow-branch', branchKind: 'task', sourceRefName: 'feature/demo', name: '' }),
    undefined
  );
  assert.equal(
    validateRevisionGraphMessage({
      type: 'start-flow-branch',
      branchKind: 'feature',
      sourceRefName: 'main',
      name: '2.0.0',
      description: 'a'.repeat(2049)
    }),
    undefined
  );
  assert.equal(
    validateRevisionGraphMessage({ type: 'prepare-flow-equalization', releaseRefName: '', productionRefName: 'main' }),
    undefined
  );
  assert.equal(
    validateRevisionGraphMessage({ type: 'copy-flow-pr-context', sourceRefName: '', targetRefName: 'main' }),
    undefined
  );
  assert.equal(
    validateRevisionGraphMessage({ type: 'open-flow-pr-url', sourceRefName: 'release/1.0.0', targetRefName: '' }),
    undefined
  );
  assert.equal(
    validateRevisionGraphMessage({
      type: 'set-flow-governance-options',
      options: { visibleKinds: ['main', 'evil'] }
    }),
    undefined
  );
  assert.equal(
    validateRevisionGraphMessage({
      type: 'set-flow-governance-options',
      options: { hideSyncBranches: 'yes' }
    }),
    undefined
  );
  assert.equal(
    validateRevisionGraphMessage({ type: 'load-trace', phase: 'webview.apply.update-state', durationMs: Infinity }),
    undefined
  );
  assert.equal(
    validateRevisionGraphMessage({
      type: 'load-trace',
      phase: 'webview.apply.update-state',
      durationMs: 1,
      detail: 'a'.repeat(2049)
    }),
    undefined
  );
  assert.equal(
    validateRevisionGraphMessage({
      type: 'set-projection-options',
      options: {
        revisionRange: {
          baseRevision: '',
          baseLabel: 'main',
          compareRevision: 'feature/demo',
          compareLabel: 'feature/demo'
        }
      }
    }),
    undefined
  );
  assert.equal(
    validateRevisionGraphMessage({
      type: 'set-projection-options',
      options: {
        revisionRange: {
          baseRevision: 'main',
          baseLabel: 'main',
          compareRevision: 'a'.repeat(MAX_WEBVIEW_MESSAGE_STRING_LENGTH + 1),
          compareLabel: 'feature/demo'
        }
      }
    }),
    undefined
  );
  assert.equal(
    validateRevisionGraphMessage({
      type: 'set-projection-options',
      options: {
        descendantFocus: {
          anchorRevision: '',
          anchorLabel: 'main'
        }
      }
    }),
    undefined
  );
  assert.equal(
    validateRevisionGraphMessage({
      type: 'set-projection-options',
      options: {
        revisionRange: {
          baseRevision: 'main',
          baseLabel: 'main',
          compareRevision: 'feature/demo',
          compareLabel: 'feature/demo'
        },
        descendantFocus: {
          anchorRevision: 'main',
          anchorLabel: 'main'
        }
      }
    }),
    undefined
  );
});

test('validateRevisionGraphMessage accepts and sanitizes graph messages', () => {
  assert.deepEqual(
    validateRevisionGraphMessage({
      type: 'set-projection-options',
      options: {
        refScope: 'local',
        showTags: false,
        showMergeCommits: true,
        unknown: 'ignored'
      }
    }),
    {
      type: 'set-projection-options',
      options: {
        refScope: 'local',
        showTags: false,
        showMergeCommits: true
      }
    }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({
      type: 'set-projection-options',
      options: {
        descendantFocus: {
          anchorRevision: 'main',
          anchorLabel: 'main'
        }
      }
    }),
    {
      type: 'set-projection-options',
      options: {
        descendantFocus: {
          anchorRevision: 'main',
          anchorLabel: 'main'
        }
      }
    }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({
      type: 'set-projection-options',
      options: {
        descendantFocus: null
      }
    }),
    {
      type: 'set-projection-options',
      options: {
        descendantFocus: undefined
      }
    }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({
      type: 'set-projection-options',
      options: {
        refScope: 'remoteHead'
      }
    }),
    {
      type: 'set-projection-options',
      options: {
        refScope: 'remoteHead'
      }
    }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({
      type: 'set-projection-options',
      options: {
        revisionRange: {
          baseRevision: 'main',
          baseLabel: 'main',
          compareRevision: 'feature/demo',
          compareLabel: 'feature/demo'
        }
      }
    }),
    {
      type: 'set-projection-options',
      options: {
        revisionRange: {
          baseRevision: 'main',
          baseLabel: 'main',
          compareRevision: 'feature/demo',
          compareLabel: 'feature/demo'
        }
      }
    }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({
      type: 'set-projection-options',
      options: {
        revisionRange: null
      }
    }),
    {
      type: 'set-projection-options',
      options: {
        revisionRange: undefined
      }
    }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({ type: 'checkout', refName: 'main', refKind: 'head' }),
    { type: 'checkout', refName: 'main', refKind: 'head' }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({ type: 'abort-merge' }),
    { type: 'abort-merge' }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({ type: 'refresh-with-empty-cache' }),
    { type: 'refresh-with-empty-cache' }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({ type: 'copy-ref-name', refName: 'main', refKind: 'head' }),
    { type: 'copy-ref-name', refName: 'main', refKind: 'head' }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({ type: 'load-commit-short-stat', commitHash: 'head1' }),
    { type: 'load-commit-short-stat', commitHash: 'head1' }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({ type: 'open-commit-on-github', commitHash: 'head1' }),
    { type: 'open-commit-on-github', commitHash: 'head1' }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({
      type: 'reset-to-commit',
      commitHash: 'tag1',
      label: 'v1.0.0',
      targetKind: 'tag',
      targetName: 'v1.0.0'
    }),
    {
      type: 'reset-to-commit',
      commitHash: 'tag1',
      label: 'v1.0.0',
      targetKind: 'tag',
      targetName: 'v1.0.0'
    }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({
      type: 'reset-to-commit',
      commitHash: 'structural1',
      label: 'structural1',
      targetKind: 'commit'
    }),
    {
      type: 'reset-to-commit',
      commitHash: 'structural1',
      label: 'structural1',
      targetKind: 'commit',
      targetName: undefined
    }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({ type: 'stash-save' }),
    { type: 'stash-save' }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({ type: 'stash-apply', refName: 'stash' }),
    { type: 'stash-apply', refName: 'stash' }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({ type: 'stash-pop', refName: 'stash' }),
    { type: 'stash-pop', refName: 'stash' }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({ type: 'stash-drop', refName: 'stash' }),
    { type: 'stash-drop', refName: 'stash' }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({ type: 'pull-current-head' }),
    { type: 'pull-current-head' }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({ type: 'push-current-head', mode: 'force-with-lease' }),
    { type: 'push-current-head', mode: 'force-with-lease' }
  );
  assert.equal(validateRevisionGraphMessage({ type: 'push-current-head' }), undefined);
  assert.equal(validateRevisionGraphMessage({ type: 'push-current-head', mode: 'unsafe' }), undefined);
  assert.deepEqual(
    validateRevisionGraphMessage({
      type: 'set-flow-governance-options',
      options: {
        enabled: true
      }
    }),
    {
      type: 'set-flow-governance-options',
      options: {
        enabled: true
      }
    }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({
      type: 'validate-release-promotion',
      refName: 'release/1.0.0'
    }),
    {
      type: 'validate-release-promotion',
      refName: 'release/1.0.0'
    }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({
      type: 'start-flow-branch',
      branchKind: 'release',
      sourceRefName: 'main',
      name: '2.0.0',
      description: 'Release train'
    }),
    {
      type: 'start-flow-branch',
      branchKind: 'release',
      sourceRefName: 'main',
      name: '2.0.0',
      description: 'Release train'
    }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({
      type: 'start-flow-branch',
      branchKind: 'feature',
      sourceRefName: 'main',
      name: 'checkout-redesign'
    }),
    {
      type: 'start-flow-branch',
      branchKind: 'feature',
      sourceRefName: 'main',
      name: 'checkout-redesign'
    }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({
      type: 'start-flow-branch',
      branchKind: 'task',
      sourceRefName: 'feature/demo',
      name: '4312-adjust-timeout',
      description: 'Keep checkout requests bounded'
    }),
    {
      type: 'start-flow-branch',
      branchKind: 'task',
      sourceRefName: 'feature/demo',
      name: '4312-adjust-timeout',
      description: 'Keep checkout requests bounded'
    }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({
      type: 'copy-flow-pr-context',
      sourceRefName: 'release/1.0.0',
      targetRefName: 'main'
    }),
    {
      type: 'copy-flow-pr-context',
      sourceRefName: 'release/1.0.0',
      targetRefName: 'main'
    }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({
      type: 'open-flow-pr-url',
      sourceRefName: 'release/1.0.0',
      targetRefName: 'main'
    }),
    {
      type: 'open-flow-pr-url',
      sourceRefName: 'release/1.0.0',
      targetRefName: 'main'
    }
  );
  assert.deepEqual(
    validateRevisionGraphMessage({
      type: 'load-trace',
      phase: 'webview.apply.update-state',
      durationMs: 4.6,
      requestId: 7.2,
      detail: 'message=update-state; deliveryMs=3'
    }),
    {
      type: 'load-trace',
      phase: 'webview.apply.update-state',
      durationMs: 5,
      requestId: 7,
      detail: 'message=update-state; deliveryMs=3'
    }
  );
});

test('isRevisionGraphMessageAllowedForState restricts graph actions to known refs and commits', () => {
  const state = createReadyRevisionGraphState();

  assert.equal(
    isRevisionGraphMessageAllowedForState({ type: 'load-trace', phase: 'webview.apply.update-state', durationMs: 1 }, state),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'checkout', refName: 'main', refKind: 'head' },
      state
    ),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'checkout', refName: 'missing', refKind: 'branch' },
      state
    ),
    false
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'create-branch', revision: 'structural1', label: 'structural1', refKind: 'commit' },
      state
    ),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'copy-ref-name', refName: 'main', refKind: 'head' },
      state
    ),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'load-commit-short-stat', commitHash: 'head1' },
      state
    ),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'open-commit-on-github', commitHash: 'missing' },
      state
    ),
    false
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'copy-ref-name', refName: 'missing', refKind: 'branch' },
      state
    ),
    false
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      {
        type: 'reset-to-commit',
        commitHash: 'tag1',
        label: 'v1.0.0',
        targetKind: 'tag',
        targetName: 'v1.0.0'
      },
      state
    ),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      {
        type: 'reset-to-commit',
        commitHash: 'structural1',
        label: 'structural1',
        targetKind: 'commit'
      },
      state
    ),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      {
        type: 'reset-to-commit',
        commitHash: 'head1',
        label: 'main',
        targetKind: 'head',
        targetName: 'main'
      },
      state
    ),
    false
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      {
        type: 'reset-to-commit',
        commitHash: 'tag1',
        label: 'v1.0.0',
        targetKind: 'tag',
        targetName: 'missing'
      },
      state
    ),
    false
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      {
        type: 'reset-to-commit',
        commitHash: 'stash1',
        label: 'stash',
        targetKind: 'stash',
        targetName: 'stash'
      },
      state
    ),
    false
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      {
        type: 'reset-to-commit',
        commitHash: 'head1',
        label: 'main',
        targetKind: 'branch',
        targetName: 'main'
      },
      {
        ...state,
        references: [
          ...state.references,
          { id: 'head1::branch::main', hash: 'head1', name: 'main', kind: 'branch', title: 'main' }
        ]
      }
    ),
    false
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'push-tag', refName: 'main', label: 'main', refKind: 'head' },
      state
    ),
    false
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState({ type: 'abort-merge' }, state),
    false
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'abort-merge' },
      { ...state, hasMergeConflicts: true, hasConflictedMerge: false, isWorkspaceDirty: true }
    ),
    false
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'abort-merge' },
      { ...state, hasMergeConflicts: true, hasConflictedMerge: true, isWorkspaceDirty: true }
    ),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState({ type: 'stash-save' }, state),
    false
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState({ type: 'stash-save' }, { ...state, isWorkspaceDirty: true }),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'stash-save' },
      { ...state, isWorkspaceDirty: true, hasMergeConflicts: true }
    ),
    false
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState({ type: 'stash-apply', refName: 'stash' }, state),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState({ type: 'stash-pop', refName: 'stash' }, state),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState({ type: 'stash-drop', refName: 'stash' }, state),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState({ type: 'stash-apply', refName: 'missing' }, state),
    false
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState({ type: 'pull-current-head' }, state),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState({ type: 'push-current-head', mode: 'normal' }, state),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'push-current-head', mode: 'force-with-lease' },
      { ...state, currentHeadUpstreamName: undefined }
    ),
    false
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'push-current-head', mode: 'force' },
      { ...state, publishedLocalBranchNames: [] }
    ),
    false
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'set-flow-governance-options', options: { enabled: false } },
      state
    ),
    false
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'set-flow-governance-options', options: { enabled: false } },
      {
        ...state,
        flowGovernance: {
          enabled: true,
          configSource: 'workspace',
          diagnostics: [],
          branchKinds: ['main', 'sync', 'unknown'],
          references: []
        }
      }
    ),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'validate-release-promotion', refName: 'release/1.0.0' },
      {
        ...state,
        references: [
          ...state.references,
          { id: 'release1::branch::release/1.0.0', hash: 'release1', name: 'release/1.0.0', kind: 'branch', title: 'release/1.0.0' }
        ],
        flowGovernance: {
          enabled: true,
          configSource: 'workspace',
          diagnostics: [],
          branchKinds: ['main', 'release', 'sync', 'unknown'],
          references: [
            { refName: 'main', kind: 'main', isEphemeral: false, diagnostics: [] },
            { refName: 'release/1.0.0', kind: 'release', isEphemeral: false, diagnostics: [] }
          ]
        }
      }
    ),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'validate-release-promotion', refName: 'main' },
      {
        ...state,
        flowGovernance: {
          enabled: true,
          configSource: 'workspace',
          diagnostics: [],
          branchKinds: ['main', 'release', 'sync', 'unknown'],
          references: [
            { refName: 'main', kind: 'main', isEphemeral: false, diagnostics: [] }
          ]
        }
      }
    ),
    false
  );
  const governedFlowState: RevisionGraphViewState = {
    ...state,
    references: [
      ...state.references,
      { id: 'release1::branch::release/1.0.0', hash: 'release1', name: 'release/1.0.0', kind: 'branch', title: 'release/1.0.0' },
      { id: 'feature1::branch::feature/demo', hash: 'feature1', name: 'feature/demo', kind: 'branch', title: 'feature/demo' }
    ],
    flowGovernance: {
      enabled: true,
      configSource: 'workspace',
      diagnostics: [],
      branchKinds: ['main', 'feature', 'release', 'sync', 'unknown'],
      references: [
        { refName: 'main', kind: 'main', isEphemeral: false, diagnostics: [] },
        { refName: 'release/1.0.0', kind: 'release', isEphemeral: false, diagnostics: [] },
        { refName: 'feature/demo', kind: 'feature', isEphemeral: false, diagnostics: [] }
      ]
    }
  };
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'copy-flow-pr-context', sourceRefName: 'release/1.0.0', targetRefName: 'main' },
      governedFlowState
    ),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'start-flow-branch', branchKind: 'release', sourceRefName: 'main', name: '2.0.0' },
      governedFlowState
    ),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'start-flow-branch', branchKind: 'feature', sourceRefName: 'main', name: 'checkout-redesign' },
      governedFlowState
    ),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'start-flow-branch', branchKind: 'task', sourceRefName: 'feature/demo', name: '4312-adjust-timeout' },
      governedFlowState
    ),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'start-flow-branch', branchKind: 'task', sourceRefName: 'main', name: '4312-adjust-timeout' },
      governedFlowState
    ),
    false
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'start-flow-branch', branchKind: 'release', sourceRefName: 'release/1.0.0', name: '2.0.0' },
      governedFlowState
    ),
    false
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'open-flow-pr-url', sourceRefName: 'feature/demo', targetRefName: 'main' },
      governedFlowState
    ),
    false
  );
  assert.equal(
    isRevisionGraphMessageAllowedForState(
      { type: 'open-flow-pr-url', sourceRefName: 'release/1.0.0', targetRefName: 'missing' },
      governedFlowState
    ),
    false
  );
});

test('isRevisionGraphMessageAllowedForCurrentRepository rejects stale repository-scoped graph actions', () => {
  const state = createReadyRevisionGraphState();

  assert.equal(
    isRevisionGraphMessageAllowedForCurrentRepository(
      { type: 'checkout', refName: 'main', refKind: 'head' },
      state,
      '/workspace/repo'
    ),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForCurrentRepository(
      { type: 'checkout', refName: 'main', refKind: 'head' },
      state,
      '/workspace/other'
    ),
    false
  );
  assert.equal(
    isRevisionGraphMessageAllowedForCurrentRepository(
      { type: 'load-commit-short-stat', commitHash: 'head1' },
      { ...state, loading: true, loadingLabel: 'Refreshing revision graph...' },
      '/workspace/repo'
    ),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForCurrentRepository(
      { type: 'checkout', refName: 'main', refKind: 'head' },
      { ...state, loading: true, loadingLabel: 'Loading revision graph...' },
      '/workspace/repo'
    ),
    false
  );
  assert.equal(
    isRevisionGraphMessageAllowedForCurrentRepository(
      { type: 'refresh' },
      { ...state, loading: true, loadingLabel: 'Loading revision graph...' },
      '/workspace/other'
    ),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForCurrentRepository(
      { type: 'refresh-with-empty-cache' },
      { ...state, loading: true, loadingLabel: 'Loading revision graph...' },
      '/workspace/other'
    ),
    true
  );
  assert.equal(
    isRevisionGraphMessageAllowedForCurrentRepository(
      { type: 'choose-repository' },
      { ...state, loading: true, loadingLabel: 'Loading revision graph...' },
      undefined
    ),
    true
  );
});

test('validateCompareResultsWebviewMessage rejects malformed compare result messages', () => {
  assert.equal(validateCompareResultsWebviewMessage({ type: 'base' }), undefined);
  assert.equal(validateCompareResultsWebviewMessage({ type: 'copyFileName', itemIds: 'file:0' }), undefined);
  assert.equal(
    validateCompareResultsWebviewMessage({
      type: 'copyFileName',
      itemIds: Array.from({ length: MAX_WEBVIEW_MESSAGE_ARRAY_LENGTH + 1 }, (_, index) => `file:${index}`)
    }),
    undefined
  );
  assert.deepEqual(
    validateCompareResultsWebviewMessage({ type: 'copyFullPath', itemIds: ['file:0'] }),
    { type: 'copyFullPath', itemIds: ['file:0'] }
  );
  assert.deepEqual(
    validateCompareResultsWebviewMessage({ type: 'unifiedDiff' }),
    { type: 'unifiedDiff' }
  );
});

test('validateShowLogWebviewMessage rejects malformed show log messages', () => {
  assert.equal(validateShowLogWebviewMessage({ type: 'toggleShowAllBranches', value: 'true' }), undefined);
  assert.equal(validateShowLogWebviewMessage({ type: 'openFile', commitHash: 'abc123' }), undefined);
  assert.equal(validateShowLogWebviewMessage({ type: 'revertFileToCommit', commitHash: 'abc123' }), undefined);
  assert.equal(
    validateShowLogWebviewMessage({
      type: 'setFilterText',
      value: 'a'.repeat(MAX_WEBVIEW_MESSAGE_STRING_LENGTH + 1),
      sourceToken: '1'
    }),
    undefined
  );
  assert.equal(
    validateShowLogWebviewMessage({ type: 'setFilterText', value: 'Ada' }),
    undefined
  );
  assert.equal(
    validateShowLogWebviewMessage({
      type: 'setFilterText',
      value: 'Ada',
      sourceToken: 'a'.repeat(MAX_WEBVIEW_MESSAGE_STRING_LENGTH + 1)
    }),
    undefined
  );
  assert.equal(
    validateShowLogWebviewMessage({
      type: 'openCommitDetails',
      commitHash: 'a'.repeat(MAX_WEBVIEW_MESSAGE_STRING_LENGTH + 1)
    }),
    undefined
  );
  assert.equal(
    validateShowLogWebviewMessage({
      type: 'compareCommits',
      baseCommitHash: 'abc123',
      compareCommitHash: 'a'.repeat(MAX_WEBVIEW_MESSAGE_STRING_LENGTH + 1)
    }),
    undefined
  );
  assert.equal(
    validateShowLogWebviewMessage({
      type: 'compareCommitWithWorktree',
      commitHash: 'a'.repeat(MAX_WEBVIEW_MESSAGE_STRING_LENGTH + 1)
    }),
    undefined
  );
  assert.equal(
    validateShowLogWebviewMessage({
      type: 'resetToCommit',
      commitHash: 'a'.repeat(MAX_WEBVIEW_MESSAGE_STRING_LENGTH + 1)
    }),
    undefined
  );
  assert.equal(
    validateShowLogWebviewMessage({
      type: 'copyCommitHash',
      commitHash: 'a'.repeat(MAX_WEBVIEW_MESSAGE_STRING_LENGTH + 1)
    }),
    undefined
  );
  assert.equal(
    validateShowLogWebviewMessage({
      type: 'copyReferenceName',
      commitHash: 'abc123',
      refName: ''
    }),
    undefined
  );
  assert.equal(
    validateShowLogWebviewMessage({
      type: 'copyReferenceName',
      commitHash: 'abc123',
      refName: 'a'.repeat(MAX_WEBVIEW_MESSAGE_STRING_LENGTH + 1)
    }),
    undefined
  );
  assert.equal(
    validateShowLogWebviewMessage({
      type: 'cherryPickCommits',
      commitHashes: []
    }),
    undefined
  );
  assert.equal(
    validateShowLogWebviewMessage({
      type: 'cherryPickCommits',
      commitHashes: ['abc123', '']
    }),
    undefined
  );
  assert.equal(
    validateShowLogWebviewMessage({
      type: 'cherryPickCommits',
      commitHashes: ['abc123', '   ']
    }),
    undefined
  );
  assert.equal(
    validateShowLogWebviewMessage({
      type: 'cherryPickCommits',
      commitHashes: ['abc123', 'a'.repeat(MAX_WEBVIEW_MESSAGE_STRING_LENGTH + 1)]
    }),
    undefined
  );
  assert.equal(
    validateShowLogWebviewMessage({
      type: 'openCommitOnGitHub',
      commitHash: 'a'.repeat(MAX_WEBVIEW_MESSAGE_STRING_LENGTH + 1)
    }),
    undefined
  );
  assert.deepEqual(
    validateShowLogWebviewMessage({ type: 'openFile', commitHash: 'abc123', changeId: 'abc123:0' }),
    { type: 'openFile', commitHash: 'abc123', changeId: 'abc123:0' }
  );
  assert.deepEqual(
    validateShowLogWebviewMessage({ type: 'revertFileToCommit', commitHash: 'abc123', changeId: 'abc123:1' }),
    { type: 'revertFileToCommit', commitHash: 'abc123', changeId: 'abc123:1' }
  );
  assert.deepEqual(
    validateShowLogWebviewMessage({ type: 'compareCommits', baseCommitHash: 'abc123', compareCommitHash: 'def456' }),
    { type: 'compareCommits', baseCommitHash: 'abc123', compareCommitHash: 'def456' }
  );
  assert.deepEqual(
    validateShowLogWebviewMessage({ type: 'compareCommitWithWorktree', commitHash: 'abc123' }),
    { type: 'compareCommitWithWorktree', commitHash: 'abc123' }
  );
  assert.deepEqual(
    validateShowLogWebviewMessage({ type: 'resetToCommit', commitHash: 'abc123' }),
    { type: 'resetToCommit', commitHash: 'abc123' }
  );
  assert.deepEqual(
    validateShowLogWebviewMessage({ type: 'copyCommitHash', commitHash: 'abc123' }),
    { type: 'copyCommitHash', commitHash: 'abc123' }
  );
  assert.deepEqual(
    validateShowLogWebviewMessage({ type: 'copyReferenceName', commitHash: 'abc123', refName: 'origin/main' }),
    { type: 'copyReferenceName', commitHash: 'abc123', refName: 'origin/main' }
  );
  assert.deepEqual(
    validateShowLogWebviewMessage({ type: 'cherryPickCommits', commitHashes: ['abc123', 'def456'] }),
    { type: 'cherryPickCommits', commitHashes: ['abc123', 'def456'] }
  );
  assert.deepEqual(
    validateShowLogWebviewMessage({ type: 'openCommitOnGitHub', commitHash: 'abc123' }),
    { type: 'openCommitOnGitHub', commitHash: 'abc123' }
  );
  assert.deepEqual(
    validateShowLogWebviewMessage({ type: 'setFilterText', value: 'Ada', sourceToken: '1' }),
    { type: 'setFilterText', value: 'Ada', sourceToken: '1' }
  );
});

test('isBoundedStringArray rejects oversized items', () => {
  assert.equal(isBoundedStringArray(['ok']), true);
  assert.equal(isBoundedStringArray(['a'.repeat(MAX_WEBVIEW_MESSAGE_STRING_LENGTH + 1)]), false);
});

function createReadyRevisionGraphState(): RevisionGraphViewState {
  return {
    viewMode: 'ready',
    hasRepositories: true,
    repositoryPath: '/workspace/repo',
    currentHeadName: 'main',
    currentHeadUpstreamName: 'origin/main',
    publishedLocalBranchNames: ['main'],
    isWorkspaceDirty: false,
    hasMergeConflicts: false,
    hasConflictedMerge: false,
    projectionOptions: {
      refScope: 'all',
      showTags: true,
      showRemoteBranches: true,
      showStashes: true,
      showMergeCommits: false,
      showCurrentBranchDescendants: true,
      revisionRange: undefined,
      descendantFocus: undefined
    },
    mergeBlockedTargets: [],
    primaryAncestorNextByHash: {},
    scene: {
      nodes: [
        {
          hash: 'head1',
          row: 0,
          lane: 0,
          x: 0,
          refs: [{ name: 'main', kind: 'head' }],
          author: 'Ada',
          date: '2026-04-28',
          subject: 'Main'
        },
        {
          hash: 'tag1',
          row: 1,
          lane: 0,
          x: 0,
          refs: [{ name: 'v1.0.0', kind: 'tag' }],
          author: 'Ada',
          date: '2026-04-28',
          subject: 'Tag'
        },
        {
          hash: 'stash1',
          row: 2,
          lane: 0,
          x: 0,
          refs: [{ name: 'stash', kind: 'stash' }],
          author: 'Ada',
          date: '2026-04-28',
          subject: 'Stash'
        },
        {
          hash: 'structural1',
          row: 3,
          lane: 0,
          x: 0,
          refs: [],
          author: 'Ada',
          date: '2026-04-28',
          subject: 'Structural'
        }
      ],
      edges: [],
      laneCount: 1,
      rowCount: 4
    },
    nodeLayouts: [],
    references: [
      { id: 'head1::head::main', hash: 'head1', name: 'main', kind: 'head', title: 'main' },
      { id: 'tag1::tag::v1.0.0', hash: 'tag1', name: 'v1.0.0', kind: 'tag', title: 'v1.0.0' },
      { id: 'stash1::stash::stash', hash: 'stash1', name: 'stash', kind: 'stash', title: 'stash' }
    ],
    sceneLayoutKey: 'head1:0:0|tag1:0:0|stash1:0:0|structural1:0:0',
    baseCanvasWidth: 320,
    baseCanvasHeight: 480,
    emptyMessage: undefined,
    loading: false,
    loadingLabel: undefined,
    errorMessage: undefined
  };
}
