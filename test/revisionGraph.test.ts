import test from 'node:test';
import assert from 'node:assert/strict';

import { buildRevisionGraphScene, parseDecorationRefs, parseRevisionGraphLog } from '../src/revisionGraphData';

test('parses git log output into revision graph commits', () => {
  const output = [
    'aaa111\u001fbbb222 ccc333\u001fAda\u001f2026-04-07\u001fMerge feature\u001fHEAD -> main, origin/main, tag: v1.0.0\u001e',
    'bbb222\u001f\u001fLinus\u001f2026-04-06\u001fInitial commit\u001forigin/feature/demo\u001e'
  ].join('');

  const commits = parseRevisionGraphLog(output);

  assert.equal(commits.length, 2);
  assert.deepEqual(commits[0].parents, ['bbb222', 'ccc333']);
  assert.deepEqual(commits[0].refs, [
    { name: 'main', kind: 'head' },
    { name: 'origin/main', kind: 'remote' },
    { name: 'v1.0.0', kind: 'tag' }
  ]);
  assert.deepEqual(commits[1].refs, [{ name: 'origin/feature/demo', kind: 'remote' }]);
});

test('parses decoration labels by type', () => {
  assert.deepEqual(parseDecorationRefs('HEAD -> main, tag: v2.0.0, origin/feature/demo, release'), [
    { name: 'main', kind: 'head' },
    { name: 'v2.0.0', kind: 'tag' },
    { name: 'origin/feature/demo', kind: 'remote' },
    { name: 'release', kind: 'branch' }
  ]);
});

test('builds a ref-centric graph scene with grouped labels and nearest ancestor edges', () => {
  const scene = buildRevisionGraphScene([
    { hash: 'a1', parents: ['b1', 'c1'], author: 'Ada', date: '2026-04-07', subject: 'Merge', refs: [] },
    { hash: 'b1', parents: ['d1'], author: 'Ada', date: '2026-04-06', subject: 'Main', refs: [{ name: 'main', kind: 'head' }, { name: 'origin/main', kind: 'remote' }] },
    { hash: 'c1', parents: ['d1'], author: 'Ada', date: '2026-04-05', subject: 'Feature', refs: [{ name: 'origin/feature/demo', kind: 'remote' }] },
    { hash: 'd1', parents: [], author: 'Ada', date: '2026-04-04', subject: 'Root', refs: [{ name: 'v1.0.0', kind: 'tag' }] }
  ]);

  assert.equal(scene.laneCount, 2);
  assert.deepEqual(
    scene.nodes.map((node) => ({ hash: node.hash, lane: node.lane, row: node.row, refs: node.refs.map((ref) => ref.name) })),
    [
      { hash: 'b1', lane: 0, row: 1, refs: ['main', 'origin/main'] },
      { hash: 'c1', lane: 1, row: 2, refs: ['origin/feature/demo'] },
      { hash: 'd1', lane: 0, row: 3, refs: ['v1.0.0'] }
    ]
  );
  assert.deepEqual(
    scene.edges.map((edge) => [edge.from, edge.to]),
    [
      ['b1', 'd1'],
      ['c1', 'd1']
    ]
  );
});
