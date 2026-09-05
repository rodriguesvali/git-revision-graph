import test from 'node:test';
import assert from 'node:assert/strict';
import { describeFlowFormPreview } from '../src/revisionGraph/flow/flowFormPreview';
import { RefType } from '../src/git';
import { createRepository } from './fakes';
import { findKnownFlowBranchNameCollision } from '../src/revisionGraph/flow/flowBranchNameCollision';
import { DEFAULT_FLOW_CONFIG } from '../src/revisionGraph/flow/flowDefaults';

for (const branchKind of ['release', 'feature', 'task', 'bug', 'hotfix', 'package'] as const) {
  test(`Flow ${branchKind} preview uses configured canonical naming and explains checkout`, () => {
    const result = describeFlowFormPreview({ type: 'start-flow-branch', branchKind, sourceRefName: 'main', name: '42-payment' }, {
      ...DEFAULT_FLOW_CONFIG, patterns: { ...DEFAULT_FLOW_CONFIG.patterns, [branchKind]: `^Team/${branchKind}/.+` }
    });
    assert.equal(result.status, 'ready');
    assert.match(result.text, new RegExp(`Expected branch: Team/${branchKind}/42-payment`));
    assert.match(result.text, /Source branch: main/);
    assert.match(result.text, /check it out.*Publishing/);
  });
}

test('equalization preview uses the target as the new branch base and preserves merge direction', () => {
  const result = describeFlowFormPreview({ type: 'prepare-flow-equalization', targetRefName: 'Team/release/2.0', originRefName: 'main' }, {
    ...DEFAULT_FLOW_CONFIG, patterns: { ...DEFAULT_FLOW_CONFIG.patterns, release: '^Team/[rR]elease/.+', sync: '^Team/[sS]ync/.+' }
  });
  assert.equal(result.status, 'ready');
  assert.match(result.text, /Origin to merge: main/);
  assert.match(result.text, /Target \/ base branch: Team\/release\/2.0/);
  assert.match(result.text, /Expected branch: Team\/sync\/2.0/);
  assert.match(result.text, /from the target, then merge the origin into the new branch. No automatic push/);
});

test('incomplete and invalid previews do not invent a branch name', () => {
  for (const name of ['', 'invalid name']) {
    const result = describeFlowFormPreview({ type: 'start-flow-branch', branchKind: 'release', sourceRefName: 'main', name }, DEFAULT_FLOW_CONFIG);
    assert.equal(result.status, 'unavailable');
    assert.match(result.text, /Expected branch: —/);
    assert.match(result.text, /Source branch: main/);
  }
  const equalization = describeFlowFormPreview({ type: 'prepare-flow-equalization', targetRefName: 'unclassified', originRefName: 'main' }, DEFAULT_FLOW_CONFIG);
  assert.equal(equalization.status, 'unavailable');
  assert.match(equalization.text, /does not have a deterministic/);
});

for (const remote of [false, true]) {
  for (const equalization of [false, true]) {
    test(`preview detects ${remote ? 'remote case-only' : 'local'} collisions for ${equalization ? 'equalization' : 'creation'}`, () => {
      const name = equalization ? 'sync/2.0' : 'release/2.0';
      const repository = createRepository({ root: '/repo', refs: [{
        type: remote ? RefType.RemoteHead : RefType.Head,
        name: remote ? `origin/${name.toUpperCase()}` : name, remote: remote ? 'origin' : undefined
      }] });
      const action: RevisionGraphProtocol.FlowFormPreviewAction = equalization
        ? { type: 'prepare-flow-equalization', targetRefName: 'release/2.0', originRefName: 'main' }
        : { type: 'start-flow-branch', branchKind: 'release', sourceRefName: 'main', name: '2.0' };
      const lookup = (branch: string) => findKnownFlowBranchNameCollision(repository, branch);
      const result = describeFlowFormPreview(action, DEFAULT_FLOW_CONFIG, lookup);
      assert.equal(result.status, 'unavailable');
      assert.match(result.text, remote ? /origin\/.*names differ only by letter case/ : /already exists/);
      const corrected = describeFlowFormPreview(equalization
        ? { ...action, type: 'prepare-flow-equalization', targetRefName: 'release/3.0', originRefName: 'main' }
        : { type: 'start-flow-branch', branchKind: 'release', sourceRefName: 'main', name: '3.0' }, DEFAULT_FLOW_CONFIG, lookup);
      assert.equal(corrected.status, 'ready');
      assert.match(corrected.text, /No conflict in known local or remote-tracking branches/);
      assert.match(corrected.text, /checked again when you submit/);
    });
  }
}

test('incomplete names show only examples accepted by the repository configuration', () => {
  const action = { type: 'start-flow-branch', branchKind: 'release', sourceRefName: 'main', name: '' } as const;
  const custom = { ...DEFAULT_FLOW_CONFIG, patterns: { ...DEFAULT_FLOW_CONFIG.patterns, release: '^Team/Release/.+' } };
  assert.match(describeFlowFormPreview(action, custom).text, /Example branch: Team\/Release\/1.7.1/);
  const restricted = { ...custom, patterns: { ...custom.patterns, release: '^release/special$' } };
  const result = describeFlowFormPreview(action, restricted);
  assert.doesNotMatch(result.text, /Example branch:/);
  assert.match(result.text, /Required pattern: \^release\/special\$/);
});
