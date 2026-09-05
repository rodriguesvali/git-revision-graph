import test from 'node:test';
import assert from 'node:assert/strict';
import { describeFlowFormPreview } from '../src/revisionGraph/flow/flowFormPreview';
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
