import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPrimaryAncestorPaths,
  buildRevisionGraphScene,
  filterRevisionGraphCommitsToAncestors,
  parseDecorationRefs,
  parseRevisionGraphLog
} from '../src/revisionGraphData';

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

test('prefers repository ref kinds for branch names that contain slashes', () => {
  const commits = parseRevisionGraphLog(
    'aaa111\u001f\u001fAda\u001f2026-04-08\u001fFixes\u001fLatam/work/2026-010-Bugs, origin/main\u001e',
    new Map([
      ['Latam/work/2026-010-Bugs', 'branch' as const],
      ['origin/main', 'remote' as const]
    ])
  );

  assert.deepEqual(commits[0].refs, [
    { name: 'Latam/work/2026-010-Bugs', kind: 'branch' },
    { name: 'origin/main', kind: 'remote' }
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
      { hash: 'b1', lane: 0, row: 0, refs: ['main', 'origin/main'] },
      { hash: 'c1', lane: 1, row: 1, refs: ['origin/feature/demo'] },
      { hash: 'd1', lane: 0, row: 2, refs: ['v1.0.0'] }
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

test('builds only one ancestor edge per ref node and prefers first-parent on ties', () => {
  const scene = buildRevisionGraphScene([
    { hash: 'm1', parents: ['a1', 'b1'], author: 'Ada', date: '2026-04-07', subject: 'Merge', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'a1', parents: [], author: 'Ada', date: '2026-04-06', subject: 'Left', refs: [{ name: 'v1.0.0', kind: 'tag' }] },
    { hash: 'b1', parents: [], author: 'Ada', date: '2026-04-05', subject: 'Right', refs: [{ name: 'origin/feature/demo', kind: 'remote' }] }
  ]);

  assert.deepEqual(
    scene.edges.map((edge) => [edge.from, edge.to]),
    [
      ['m1', 'a1']
    ]
  );
});

test('compacts visible lanes so hidden commit columns do not push refs far to the right', () => {
  const scene = buildRevisionGraphScene([
    { hash: 'z1', parents: ['a1', 'b1'], author: 'Ada', date: '2026-04-09', subject: 'Merge tip', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'a1', parents: ['c1', 'd1'], author: 'Ada', date: '2026-04-08', subject: 'Mainline merge', refs: [] },
    { hash: 'b1', parents: ['e1'], author: 'Ada', date: '2026-04-07', subject: 'Side lane', refs: [] },
    { hash: 'c1', parents: ['f1'], author: 'Ada', date: '2026-04-06', subject: 'Mainline work', refs: [] },
    { hash: 'e1', parents: ['g1'], author: 'Ada', date: '2026-04-05', subject: 'Secondary lane', refs: [] },
    { hash: 'd1', parents: ['h1'], author: 'Ada', date: '2026-04-04', subject: 'Visible branch', refs: [{ name: 'origin/feature/demo', kind: 'remote' }] },
    { hash: 'f1', parents: ['root'], author: 'Ada', date: '2026-04-03', subject: 'Carry mainline', refs: [] },
    { hash: 'g1', parents: ['root'], author: 'Ada', date: '2026-04-02', subject: 'Carry side lane', refs: [] },
    { hash: 'h1', parents: ['root'], author: 'Ada', date: '2026-04-01', subject: 'Carry visible lane', refs: [] },
    { hash: 'root', parents: [], author: 'Ada', date: '2026-03-31', subject: 'Release base', refs: [{ name: 'v1.0.0', kind: 'tag' }] }
  ]);

  assert.equal(scene.laneCount, 2);
  assert.deepEqual(
    scene.nodes.map((node) => ({ hash: node.hash, lane: node.lane })),
    [
      { hash: 'z1', lane: 0 },
      { hash: 'd1', lane: 1 },
      { hash: 'root', lane: 0 }
    ]
  );
});

test('prefers a referenced ancestor found on the first-parent chain over a side-parent ref', () => {
  const scene = buildRevisionGraphScene([
    { hash: 'm1', parents: ['x1', 'b1'], author: 'Ada', date: '2026-04-07', subject: 'Merge', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'x1', parents: ['a1'], author: 'Ada', date: '2026-04-06', subject: 'Mainline commit', refs: [] },
    { hash: 'a1', parents: [], author: 'Ada', date: '2026-04-05', subject: 'Previous release', refs: [{ name: 'v1.0.0', kind: 'tag' }] },
    { hash: 'b1', parents: [], author: 'Ada', date: '2026-04-04', subject: 'Merged topic', refs: [{ name: 'origin/feature/demo', kind: 'remote' }] }
  ]);

  assert.deepEqual(
    scene.edges.map((edge) => [edge.from, edge.to]),
    [
      ['m1', 'a1']
    ]
  );
});

test('filters the graph to a reference and its ancestor commits', () => {
  const commits = [
    { hash: 'a1', parents: ['b1', 'c1'], author: 'Ada', date: '2026-04-07', subject: 'Merge', refs: [] },
    { hash: 'b1', parents: ['d1'], author: 'Ada', date: '2026-04-06', subject: 'Main', refs: [{ name: 'main', kind: 'head' as const }] },
    { hash: 'c1', parents: ['d1'], author: 'Ada', date: '2026-04-05', subject: 'Feature', refs: [{ name: 'origin/feature/demo', kind: 'remote' as const }] },
    { hash: 'd1', parents: [], author: 'Ada', date: '2026-04-04', subject: 'Root', refs: [{ name: 'v1.0.0', kind: 'tag' as const }] }
  ];

  const filtered = filterRevisionGraphCommitsToAncestors(commits, 'origin/feature/demo', 'remote');

  assert.deepEqual(
    filtered.map((commit) => commit.hash),
    ['c1', 'd1']
  );
});

test('builds primary ancestor paths from first-parent history through non-referenced commits', () => {
  const commits = [
    { hash: 'm1', parents: ['n1', 's1'], author: 'Ada', date: '2026-04-07', subject: 'Merge feature', refs: [{ name: 'main', kind: 'head' as const }] },
    { hash: 'n1', parents: ['b1'], author: 'Ada', date: '2026-04-06', subject: 'Main work', refs: [] },
    { hash: 's1', parents: ['b1'], author: 'Ada', date: '2026-04-05', subject: 'Side ref', refs: [{ name: 'origin/feature/demo', kind: 'remote' as const }] },
    { hash: 'b1', parents: [], author: 'Ada', date: '2026-04-04', subject: 'Base', refs: [{ name: 'v1.0.0', kind: 'tag' as const }] }
  ];
  const scene = buildRevisionGraphScene(commits);

  assert.deepEqual(buildPrimaryAncestorPaths(commits, scene), {
    m1: ['m1', 'b1'],
    s1: ['s1', 'b1'],
    b1: ['b1']
  });
});
