import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPrimaryAncestorPaths,
  buildRevisionGraphScene,
  parseDecorationRefs,
  parseRevisionGraphLog
} from '../src/revisionGraphData';
import { buildNodeLayouts } from '../src/revisionGraph/webview/shared';
import { getMergeBlockedTargetsFromGraph } from '../src/revisionGraph/backend';
import { buildCommitGraph, buildCommitGraphWithSimplification } from '../src/revisionGraph/model/commitGraph';
import { collectAncestorHashes, findCommitHashesByRef } from '../src/revisionGraph/model/commitGraphQueries';
import {
  projectDecoratedCommitGraph
} from '../src/revisionGraph/projection/graphProjection';
import {
  buildRevisionGraphGitLogArgs,
  buildRevisionLogGitArgs,
  parseRevisionLogEntries
} from '../src/revisionGraph/source/graphGit';
import {
  buildProjectedGraphLayoutCacheKey,
  clearProjectedGraphLayoutCache,
  getProjectedGraphLayoutCacheStats,
  PROJECTED_GRAPH_LAYOUT_CACHE_PERSIST_MAX_POSITIONS,
  restoreProjectedGraphLayoutCache,
  serializeProjectedGraphLayoutCache
} from '../src/revisionGraph/layout/layeredLayout';
import { createDefaultRevisionGraphProjectionOptions } from '../src/revisionGraphTypes';

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
  assert.deepEqual(parseDecorationRefs('HEAD -> main, refs/stash, tag: v2.0.0, origin/feature/demo, release'), [
    { name: 'main', kind: 'head' },
    { name: 'stash', kind: 'stash' },
    { name: 'v2.0.0', kind: 'tag' },
    { name: 'origin/feature/demo', kind: 'remote' },
    { name: 'release', kind: 'branch' }
  ]);
});

test('builds git log args aligned with tortoisegit simplify-by-decoration defaults', () => {
  assert.deepEqual(
    buildRevisionGraphGitLogArgs(6000, createDefaultRevisionGraphProjectionOptions()),
    [
      'log',
      '--all',
      '--topo-order',
      '--simplify-by-decoration',
      '--decorate=short',
      '--date=short',
      '--max-count=6000',
      '--pretty=format:%H\u001f%P\u001f%an\u001f%ad\u001f%s\u001f%D\u001e'
    ]
  );
});

test('builds git log args that exclude tags and scope to local branches', () => {
  assert.deepEqual(
    buildRevisionGraphGitLogArgs(12000, {
      refScope: 'local',
      showTags: false,
      showRemoteBranches: false,
      showStashes: false,
      showBranchingsAndMerges: true
    }),
    [
      'log',
      '--branches',
      '--topo-order',
      '--simplify-by-decoration',
      '--sparse',
      '--decorate=short',
      '--decorate-refs-exclude=refs/tags/*',
      '--decorate-refs-exclude=refs/remotes/*',
      '--decorate-refs-exclude=refs/stash',
      '--date=short',
      '--max-count=12000',
      '--pretty=format:%H\u001f%P\u001f%an\u001f%ad\u001f%s\u001f%D\u001e'
    ]
  );
});

test('builds show log git args for a target revision', () => {
  assert.deepEqual(
    buildRevisionLogGitArgs(
      {
        kind: 'target',
        revision: 'feature/demo',
        label: 'feature/demo'
      },
      51,
      100
    ),
    [
      'log',
      '--topo-order',
      '--decorate=short',
      '--date=short',
      '--max-count=51',
      '--skip=100',
      '--pretty=format:%x1e%H\u001f%P\u001f%an\u001f%ad\u001f%D\u001f%s\u001f%b',
      '--shortstat',
      '--first-parent',
      '--end-of-options',
      'feature/demo'
    ]
  );
});

test('builds show log git args for a target revision with all branches enabled', () => {
  assert.deepEqual(
    buildRevisionLogGitArgs(
      {
        kind: 'target',
        revision: 'feature/demo',
        label: 'feature/demo'
      },
      51,
      0,
      true
    ),
    [
      'log',
      '--topo-order',
      '--decorate=short',
      '--date=short',
      '--max-count=51',
      '--skip=0',
      '--pretty=format:%x1e%H\u001f%P\u001f%an\u001f%ad\u001f%D\u001f%s\u001f%b',
      '--shortstat',
      '--all'
    ]
  );
});

test('builds show log git args for a revision range', () => {
  assert.deepEqual(
    buildRevisionLogGitArgs(
      {
        kind: 'range',
        baseRevision: 'main',
        baseLabel: 'main',
        compareRevision: 'feature/demo',
        compareLabel: 'feature/demo'
      },
      51
    ),
    [
      'log',
      '--topo-order',
      '--decorate=short',
      '--date=short',
      '--max-count=51',
      '--skip=0',
      '--pretty=format:%x1e%H\u001f%P\u001f%an\u001f%ad\u001f%D\u001f%s\u001f%b',
      '--shortstat',
      '--end-of-options',
      'main..feature/demo'
    ]
  );
});

test('builds show log git args with an option terminator before option-like revisions', () => {
  assert.deepEqual(
    buildRevisionLogGitArgs(
      {
        kind: 'target',
        revision: '-malicious',
        label: '-malicious'
      },
      51
    ),
    [
      'log',
      '--topo-order',
      '--decorate=short',
      '--date=short',
      '--max-count=51',
      '--skip=0',
      '--pretty=format:%x1e%H\u001f%P\u001f%an\u001f%ad\u001f%D\u001f%s\u001f%b',
      '--shortstat',
      '--first-parent',
      '--end-of-options',
      '-malicious'
    ]
  );
});

test('parses show log entries with refs and short stats', () => {
  const output = [
    '\u001eaaa111\u001fbbb222 ccc333\u001fAda\u001f2026-04-17\u001fHEAD -> main, origin/main, tag: v0.0.17\u001fAdd show log\u001fBody line 1\nBody line 2\n 3 files changed, 11 insertions(+), 2 deletions(-)\u001e',
    '\u001ebbb222\u001f\u001fLinus\u001f2026-04-16\u001forigin/topic/demo\u001fBootstrap\u001f\u001e'
  ].join('');

  const entries = parseRevisionLogEntries(output);

  assert.equal(entries.length, 2);
  assert.deepEqual(entries[0].parentHashes, ['bbb222', 'ccc333']);
  assert.equal(entries[0].subject, 'Add show log');
  assert.equal(entries[0].message, 'Add show log\n\nBody line 1\nBody line 2');
  assert.deepEqual(entries[0].references, [
    { name: 'main', kind: 'head' },
    { name: 'origin/main', kind: 'remote' },
    { name: 'v0.0.17', kind: 'tag' }
  ]);
  assert.deepEqual(entries[0].shortStat, {
    files: 3,
    insertions: 11,
    deletions: 2
  });
  assert.equal(entries[1].shortStat, undefined);
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

test('builds a commit graph with child links and boundary commits for missing parents', () => {
  const graph = buildCommitGraph([
    {
      hash: 'a1',
      parents: ['missing-parent'],
      author: 'Ada',
      date: '2026-04-08',
      subject: 'Tip',
      refs: [{ name: 'main', kind: 'head' }]
    }
  ]);

  assert.deepEqual(graph.orderedCommits.map((commit) => commit.hash), ['a1', 'missing-parent']);
  assert.equal(graph.commitsByHash.get('a1')?.isBoundary, false);
  assert.equal(graph.commitsByHash.get('missing-parent')?.isBoundary, true);
  assert.deepEqual(graph.commitsByHash.get('missing-parent')?.children, ['a1']);
});

test('keeps merge parent lines while hiding merge-only cards in refs-only projection', () => {
  const graph = buildCommitGraph([
    { hash: 'm1', parents: ['x1', 'b1'], author: 'Ada', date: '2026-04-07', subject: 'Merge', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'x1', parents: ['a1'], author: 'Ada', date: '2026-04-06', subject: 'Mainline commit', refs: [] },
    { hash: 'a1', parents: [], author: 'Ada', date: '2026-04-05', subject: 'Release', refs: [{ name: 'v1.0.0', kind: 'tag' }] },
    { hash: 'b1', parents: [], author: 'Ada', date: '2026-04-04', subject: 'Topic tip', refs: [{ name: 'origin/feature/demo', kind: 'remote' }] }
  ]);

  const projection = projectDecoratedCommitGraph(graph);

  assert.deepEqual(projection.nodes.map((node) => node.hash), ['m1', 'a1', 'b1']);
  assert.deepEqual(
    projection.edges.map((edge) => ({ from: edge.from, to: edge.to, through: edge.through })),
    [
      { from: 'm1', to: 'a1', through: ['x1'] },
      { from: 'm1', to: 'b1', through: [] }
    ]
  );
});

test('keeps all merge parents when branching and merge commits are visible', () => {
  const graph = buildCommitGraph([
    { hash: 'm1', parents: ['x1', 'b1'], author: 'Ada', date: '2026-04-07', subject: 'Merge', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'x1', parents: ['a1'], author: 'Ada', date: '2026-04-06', subject: 'Mainline commit', refs: [] },
    { hash: 'a1', parents: [], author: 'Ada', date: '2026-04-05', subject: 'Release', refs: [{ name: 'v1.0.0', kind: 'tag' }] },
    { hash: 'b1', parents: [], author: 'Ada', date: '2026-04-04', subject: 'Topic tip', refs: [{ name: 'origin/feature/demo', kind: 'remote' }] }
  ]);

  const projection = projectDecoratedCommitGraph(graph, {
    ...createDefaultRevisionGraphProjectionOptions(),
    showBranchingsAndMerges: true
  });

  assert.deepEqual(projection.nodes.map((node) => node.hash), ['m1', 'a1', 'b1']);
  assert.deepEqual(
    projection.edges.map((edge) => ({ from: edge.from, to: edge.to, through: edge.through })),
    [
      { from: 'm1', to: 'a1', through: ['x1'] },
      { from: 'm1', to: 'b1', through: [] }
    ]
  );
});

test('hides hidden merge connectors in refs-only projection', () => {
  const graph = buildCommitGraph([
    { hash: 'head1', parents: ['merge1'], author: 'Ada', date: '2026-04-08', subject: 'Head tip', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'merge1', parents: ['base1', 'topic1'], author: 'Ada', date: '2026-04-07', subject: 'Hidden merge', refs: [] },
    { hash: 'topic1', parents: ['base1'], author: 'Ada', date: '2026-04-06', subject: 'Topic tip', refs: [{ name: 'origin/topic/demo', kind: 'remote' }] },
    { hash: 'base1', parents: [], author: 'Ada', date: '2026-04-05', subject: 'Base', refs: [{ name: 'v1.0.0', kind: 'tag' }] }
  ]);

  const projection = projectDecoratedCommitGraph(graph);

  assert.deepEqual(projection.nodes.map((node) => node.hash), ['head1', 'topic1', 'base1']);
  assert.deepEqual(
    projection.edges.map((edge) => ({ from: edge.from, to: edge.to, through: edge.through })),
    [
      { from: 'head1', to: 'base1', through: ['merge1'] },
      { from: 'head1', to: 'topic1', through: ['merge1'] },
      { from: 'topic1', to: 'base1', through: [] }
    ]
  );
});

test('keeps hidden merge connectors when branching and merge commits are visible', () => {
  const graph = buildCommitGraph([
    { hash: 'head1', parents: ['merge1'], author: 'Ada', date: '2026-04-08', subject: 'Head tip', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'merge1', parents: ['base1', 'topic1'], author: 'Ada', date: '2026-04-07', subject: 'Hidden merge', refs: [] },
    { hash: 'topic1', parents: ['base1'], author: 'Ada', date: '2026-04-06', subject: 'Topic tip', refs: [{ name: 'origin/topic/demo', kind: 'remote' }] },
    { hash: 'base1', parents: [], author: 'Ada', date: '2026-04-05', subject: 'Base', refs: [{ name: 'v1.0.0', kind: 'tag' }] }
  ]);

  const projection = projectDecoratedCommitGraph(graph, {
    ...createDefaultRevisionGraphProjectionOptions(),
    showBranchingsAndMerges: true
  });

  assert.deepEqual(projection.nodes.map((node) => node.hash), ['head1', 'merge1', 'topic1', 'base1']);
  assert.deepEqual(
    projection.edges.map((edge) => ({ from: edge.from, to: edge.to, through: edge.through })),
    [
      { from: 'head1', to: 'merge1', through: [] },
      { from: 'merge1', to: 'base1', through: [] },
      { from: 'merge1', to: 'topic1', through: [] },
      { from: 'topic1', to: 'base1', through: [] }
    ]
  );
});

test('hides sync merges in refs-only git-simplified graphs', () => {
  const graph = buildCommitGraphWithSimplification([
    { hash: 'rel2501', parents: ['sync2491'], author: 'Ada', date: '2026-04-08', subject: 'Git 2.50.1', refs: [{ name: 'v2.50.1', kind: 'tag' }] },
    { hash: 'sync2491', parents: ['rel2500', 'rel2491'], author: 'Ada', date: '2026-04-07', subject: 'Sync with 2.49.1', refs: [] },
    { hash: 'rel2500', parents: [], author: 'Ada', date: '2026-04-06', subject: 'Git 2.50.0', refs: [{ name: 'v2.50.0', kind: 'tag' }] },
    { hash: 'rel2491', parents: ['sync2482'], author: 'Ada', date: '2026-04-05', subject: 'Git 2.49.1', refs: [{ name: 'v2.49.1', kind: 'tag' }] },
    { hash: 'sync2482', parents: ['rel2490', 'rel2482'], author: 'Ada', date: '2026-04-04', subject: 'Sync with 2.48.2', refs: [] },
    { hash: 'rel2490', parents: [], author: 'Ada', date: '2026-04-03', subject: 'Git 2.49.0', refs: [{ name: 'v2.49.0', kind: 'tag' }] },
    { hash: 'rel2482', parents: [], author: 'Ada', date: '2026-04-02', subject: 'Git 2.48.2', refs: [{ name: 'v2.48.2', kind: 'tag' }] }
  ], 'git-decoration');

  const projection = projectDecoratedCommitGraph(graph);

  assert.deepEqual(
    projection.nodes.map((node) => node.hash),
    ['rel2501', 'rel2500', 'rel2491', 'rel2490', 'rel2482']
  );
  assert.deepEqual(
    projection.edges.map((edge) => ({ from: edge.from, to: edge.to, through: edge.through })),
    [
      { from: 'rel2501', to: 'rel2500', through: ['sync2491'] },
      { from: 'rel2501', to: 'rel2491', through: ['sync2491'] },
      { from: 'rel2491', to: 'rel2490', through: ['sync2482'] },
      { from: 'rel2491', to: 'rel2482', through: ['sync2482'] }
    ]
  );
});

test('keeps sync merges visible so release tags reconnect to older release lines in detailed mode', () => {
  const graph = buildCommitGraphWithSimplification([
    { hash: 'rel2501', parents: ['sync2491'], author: 'Ada', date: '2026-04-08', subject: 'Git 2.50.1', refs: [{ name: 'v2.50.1', kind: 'tag' }] },
    { hash: 'sync2491', parents: ['rel2500', 'rel2491'], author: 'Ada', date: '2026-04-07', subject: 'Sync with 2.49.1', refs: [] },
    { hash: 'rel2500', parents: [], author: 'Ada', date: '2026-04-06', subject: 'Git 2.50.0', refs: [{ name: 'v2.50.0', kind: 'tag' }] },
    { hash: 'rel2491', parents: ['sync2482'], author: 'Ada', date: '2026-04-05', subject: 'Git 2.49.1', refs: [{ name: 'v2.49.1', kind: 'tag' }] },
    { hash: 'sync2482', parents: ['rel2490', 'rel2482'], author: 'Ada', date: '2026-04-04', subject: 'Sync with 2.48.2', refs: [] },
    { hash: 'rel2490', parents: [], author: 'Ada', date: '2026-04-03', subject: 'Git 2.49.0', refs: [{ name: 'v2.49.0', kind: 'tag' }] },
    { hash: 'rel2482', parents: [], author: 'Ada', date: '2026-04-02', subject: 'Git 2.48.2', refs: [{ name: 'v2.48.2', kind: 'tag' }] }
  ], 'git-decoration');

  const projection = projectDecoratedCommitGraph(graph, {
    ...createDefaultRevisionGraphProjectionOptions(),
    showBranchingsAndMerges: true
  });

  assert.deepEqual(
    projection.nodes.map((node) => node.hash),
    ['rel2501', 'sync2491', 'rel2500', 'rel2491', 'sync2482', 'rel2490', 'rel2482']
  );
  assert.deepEqual(
    projection.edges.map((edge) => [edge.from, edge.to]),
    [
      ['rel2501', 'sync2491'],
      ['sync2491', 'rel2500'],
      ['sync2491', 'rel2491'],
      ['rel2491', 'sync2482'],
      ['sync2482', 'rel2490'],
      ['sync2482', 'rel2482']
    ]
  );
});

test('rewrites linear unlabeled commits on git-simplified graphs when tags are hidden', () => {
  const graph = buildCommitGraphWithSimplification([
    { hash: 'head1', parents: ['mid1'], author: 'Ada', date: '2026-04-08', subject: 'Head tip', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'mid1', parents: ['branch1'], author: 'Ada', date: '2026-04-07', subject: 'Linear unlabeled', refs: [] },
    { hash: 'branch1', parents: [], author: 'Ada', date: '2026-04-06', subject: 'Branch tip', refs: [{ name: 'origin/topic/demo', kind: 'remote' }] }
  ], 'git-decoration');

  const projection = projectDecoratedCommitGraph(graph, {
    ...createDefaultRevisionGraphProjectionOptions(),
    showTags: false
  });

  assert.deepEqual(projection.nodes.map((node) => node.hash), ['head1', 'branch1']);
  assert.deepEqual(
    projection.edges.map((edge) => ({ from: edge.from, to: edge.to, through: edge.through })),
    [
      { from: 'head1', to: 'branch1', through: ['mid1'] }
    ]
  );
});

test('builds a scene from the detailed projected graph while preserving merge edges', async () => {
  const graph = buildCommitGraph([
    { hash: 'm1', parents: ['x1', 'b1'], author: 'Ada', date: '2026-04-07', subject: 'Merge', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'x1', parents: ['a1'], author: 'Ada', date: '2026-04-06', subject: 'Mainline commit', refs: [] },
    { hash: 'a1', parents: [], author: 'Ada', date: '2026-04-05', subject: 'Release', refs: [{ name: 'v1.0.0', kind: 'tag' }] },
    { hash: 'b1', parents: [], author: 'Ada', date: '2026-04-04', subject: 'Topic tip', refs: [{ name: 'origin/feature/demo', kind: 'remote' }] }
  ]);

  const projection = projectDecoratedCommitGraph(graph, {
    ...createDefaultRevisionGraphProjectionOptions(),
    showBranchingsAndMerges: true
  });
  const scene = await buildRevisionGraphScene(graph, projection);

  assert.equal(scene.nodes.length, 3);
  assert.deepEqual(scene.nodes.map((node) => ({ hash: node.hash, row: node.row })), [
    { hash: 'm1', row: 0 },
    { hash: 'a1', row: 1 },
    { hash: 'b1', row: 1 }
  ]);
  assert.notEqual(
    scene.nodes.find((node) => node.hash === 'a1')?.lane,
    scene.nodes.find((node) => node.hash === 'b1')?.lane
  );
  assert.deepEqual(
    scene.edges.map((edge) => [edge.from, edge.to]),
    [
      ['m1', 'a1'],
      ['m1', 'b1']
    ]
  );
});

test('emits revision graph scene load trace phases when tracing is enabled', async () => {
  const events: Array<{ readonly phase: string }> = [];
  const scene = await buildRevisionGraphScene(
    buildCommitGraph([
      {
        hash: 'head1',
        parents: [],
        author: 'Ada',
        date: '2026-04-08',
        subject: 'Bootstrap',
        refs: [{ name: 'main', kind: 'head' }]
      }
    ]),
    undefined,
    (event) => events.push(event)
  );

  assert.equal(scene.nodes.length, 1);
  assert.ok(events.some((event) => event.phase === 'scene.layout.elk'));
  assert.ok(events.some((event) => event.phase === 'scene.total'));
});

test('reuses cached ELK layout positions for the same projected graph topology', async () => {
  clearProjectedGraphLayoutCache();
  const graph = buildCommitGraph([
    {
      hash: 'head1',
      parents: ['base1'],
      author: 'Ada',
      date: '2026-04-08',
      subject: 'Feature',
      refs: [{ name: 'main', kind: 'head' }]
    },
    {
      hash: 'base1',
      parents: [],
      author: 'Ada',
      date: '2026-04-07',
      subject: 'Base',
      refs: [{ name: 'origin/main', kind: 'remote' }]
    }
  ]);
  const projection = projectDecoratedCommitGraph(graph);

  const firstScene = await buildRevisionGraphScene(graph, projection);
  const afterFirstLayout = getProjectedGraphLayoutCacheStats();
  const secondScene = await buildRevisionGraphScene(graph, projection);
  const afterSecondLayout = getProjectedGraphLayoutCacheStats();

  assert.deepEqual(
    secondScene.nodes.map((node) => ({ hash: node.hash, row: node.row, lane: node.lane, x: node.x })),
    firstScene.nodes.map((node) => ({ hash: node.hash, row: node.row, lane: node.lane, x: node.x }))
  );
  assert.equal(afterFirstLayout.entries, 1);
  assert.equal(afterFirstLayout.misses, 1);
  assert.equal(afterFirstLayout.hits, 0);
  assert.equal(afterSecondLayout.entries, 1);
  assert.equal(afterSecondLayout.misses, 1);
  assert.equal(afterSecondLayout.hits, 1);
});

test('uses a new layout cache namespace for the OGDF-inspired ELK placement options', () => {
  const graph = buildCommitGraph([
    {
      hash: 'head1',
      parents: ['base1'],
      author: 'Ada',
      date: '2026-04-08',
      subject: 'Feature',
      refs: [{ name: 'main', kind: 'head' }]
    },
    {
      hash: 'base1',
      parents: [],
      author: 'Ada',
      date: '2026-04-07',
      subject: 'Base',
      refs: [{ name: 'origin/main', kind: 'remote' }]
    }
  ]);

  const projection = projectDecoratedCommitGraph(graph);

  assert.match(buildProjectedGraphLayoutCacheKey(projection), /^elk-layered-v2:/);
});

test('restores serialized ELK layout cache entries across extension sessions', async () => {
  clearProjectedGraphLayoutCache();
  const graph = buildCommitGraph([
    {
      hash: 'head1',
      parents: ['base1'],
      author: 'Ada',
      date: '2026-04-08',
      subject: 'Feature',
      refs: [{ name: 'main', kind: 'head' }]
    },
    {
      hash: 'base1',
      parents: [],
      author: 'Ada',
      date: '2026-04-07',
      subject: 'Base',
      refs: [{ name: 'origin/main', kind: 'remote' }]
    }
  ]);
  const projection = projectDecoratedCommitGraph(graph);

  const firstScene = await buildRevisionGraphScene(graph, projection);
  const serializedCache = serializeProjectedGraphLayoutCache();
  clearProjectedGraphLayoutCache();
  restoreProjectedGraphLayoutCache(serializedCache);
  const restoredStats = getProjectedGraphLayoutCacheStats();
  const restoredScene = await buildRevisionGraphScene(graph, projection);
  const afterRestoredLayout = getProjectedGraphLayoutCacheStats();

  assert.equal(serializedCache.length, 1);
  assert.equal(restoredStats.entries, 1);
  assert.equal(restoredStats.hits, 0);
  assert.equal(restoredStats.misses, 0);
  assert.deepEqual(
    restoredScene.nodes.map((node) => ({ hash: node.hash, row: node.row, lane: node.lane, x: node.x })),
    firstScene.nodes.map((node) => ({ hash: node.hash, row: node.row, lane: node.lane, x: node.x }))
  );
  assert.equal(afterRestoredLayout.hits, 1);
  assert.equal(afterRestoredLayout.misses, 0);
});

test('ignores oversized serialized ELK layout cache entries', () => {
  clearProjectedGraphLayoutCache();
  const oversizedPositions: [string, { readonly x: number; readonly y: number }][] = Array.from(
    { length: PROJECTED_GRAPH_LAYOUT_CACHE_PERSIST_MAX_POSITIONS + 1 },
    (_, index) => [`hash-${index}`, { x: index, y: index }]
  );

  restoreProjectedGraphLayoutCache([
    {
      key: 'elk-layered-v1:oversized',
      positions: oversizedPositions
    }
  ]);

  assert.equal(getProjectedGraphLayoutCacheStats().entries, 0);
  assert.deepEqual(serializeProjectedGraphLayoutCache(), []);
});

test('gives distinct horizontal positions to wide visible branches in the same scene', async () => {
  const graph = buildCommitGraph([
    { hash: 'merge1', parents: ['left1', 'right1'], author: 'Ada', date: '2026-04-08', subject: 'Merge topic', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'left1', parents: ['base1'], author: 'Ada', date: '2026-04-07', subject: 'Left branch', refs: [{ name: 'release/2026/very-long-maintenance-branch-name', kind: 'branch' }] },
    { hash: 'right1', parents: ['base1'], author: 'Ada', date: '2026-04-06', subject: 'Right branch', refs: [{ name: 'origin/teams/platform/feature/very-long-name', kind: 'remote' }] },
    { hash: 'base1', parents: [], author: 'Ada', date: '2026-04-05', subject: 'Base', refs: [{ name: 'v1.0.0', kind: 'tag' }] }
  ]);

  const projection = projectDecoratedCommitGraph(graph, {
    ...createDefaultRevisionGraphProjectionOptions(),
    showBranchingsAndMerges: true
  });
  const scene = await buildRevisionGraphScene(graph, projection);
  const leftNode = scene.nodes.find((node) => node.hash === 'left1');
  const rightNode = scene.nodes.find((node) => node.hash === 'right1');

  assert.ok(leftNode);
  assert.ok(rightNode);
  assert.notEqual(leftNode?.lane, rightNode?.lane);
  assert.notEqual(leftNode?.x, rightNode?.x);
});

test('uses layered layout rows instead of forcing every commit into a unique log row', async () => {
  const graph = buildCommitGraph([
    { hash: 'leftTip', parents: ['leftBase'], author: 'Ada', date: '2026-04-08', subject: 'Left tip', refs: [{ name: 'feature/left', kind: 'branch' }] },
    { hash: 'leftBase', parents: [], author: 'Ada', date: '2026-04-07', subject: 'Left base', refs: [{ name: 'left-base', kind: 'tag' }] },
    { hash: 'rightTip', parents: ['rightBase'], author: 'Ada', date: '2026-04-06', subject: 'Right tip', refs: [{ name: 'origin/right', kind: 'remote' }] },
    { hash: 'rightBase', parents: [], author: 'Ada', date: '2026-04-05', subject: 'Right base', refs: [{ name: 'right-base', kind: 'tag' }] }
  ]);

  const projection = projectDecoratedCommitGraph(graph);
  const scene = await buildRevisionGraphScene(graph, projection);
  const leftTip = scene.nodes.find((node) => node.hash === 'leftTip');
  const leftBase = scene.nodes.find((node) => node.hash === 'leftBase');
  const rightTip = scene.nodes.find((node) => node.hash === 'rightTip');
  const rightBase = scene.nodes.find((node) => node.hash === 'rightBase');

  assert.ok(leftTip);
  assert.ok(leftBase);
  assert.ok(rightTip);
  assert.ok(rightBase);
  assert.equal(leftTip?.row, rightTip?.row);
  assert.equal(leftBase?.row, rightBase?.row);
  assert.equal(scene.rowCount, 2);
});

test('adds vertical clearance when a card grows with many refs', async () => {
  const graph = buildCommitGraph([
    {
      hash: 'head1',
      parents: ['tag1'],
      author: 'Ada',
      date: '2026-04-08',
      subject: 'Current head',
      refs: [
        { name: 'main', kind: 'head' },
        { name: 'origin/main', kind: 'remote' },
        { name: 'origin/HEAD', kind: 'remote' },
        { name: 'release/1.x', kind: 'branch' }
      ]
    },
    {
      hash: 'tag1',
      parents: [],
      author: 'Ada',
      date: '2026-04-07',
      subject: 'Tagged release',
      refs: [{ name: 'v22.0.0-next.7', kind: 'tag' }]
    }
  ]);

  const projection = projectDecoratedCommitGraph(graph);
  const scene = await buildRevisionGraphScene(graph, projection);
  const nodeLayouts = buildNodeLayouts(scene);
  const headLayout = nodeLayouts.find((node) => node.hash === 'head1');
  const tagLayout = nodeLayouts.find((node) => node.hash === 'tag1');

  assert.ok(headLayout);
  assert.ok(tagLayout);
  assert.ok((tagLayout?.defaultTop ?? 0) > (headLayout?.defaultTop ?? 0) + (headLayout?.height ?? 0));
});

test('can find commits by ref and collect their ancestor hashes from the full DAG', () => {
  const graph = buildCommitGraph([
    { hash: 'm1', parents: ['n1', 's1'], author: 'Ada', date: '2026-04-07', subject: 'Merge feature', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'n1', parents: ['b1'], author: 'Ada', date: '2026-04-06', subject: 'Main work', refs: [] },
    { hash: 's1', parents: ['b1'], author: 'Ada', date: '2026-04-05', subject: 'Side ref', refs: [{ name: 'origin/feature/demo', kind: 'remote' }] },
    { hash: 'b1', parents: [], author: 'Ada', date: '2026-04-04', subject: 'Base', refs: [{ name: 'v1.0.0', kind: 'tag' }] }
  ]);

  const startHashes = findCommitHashesByRef(graph, 'origin/feature/demo', 'remote');
  const ancestorHashes = collectAncestorHashes(graph, startHashes);

  assert.deepEqual(startHashes, ['s1']);
  assert.deepEqual([...ancestorHashes], ['s1', 'b1']);
});

test('marks visible refs as merge-blocked when their tips are already in the HEAD ancestry', () => {
  const graph = buildCommitGraph([
    { hash: 'head1', parents: ['main1'], author: 'Ada', date: '2026-04-08', subject: 'HEAD', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'main1', parents: ['base1'], author: 'Ada', date: '2026-04-07', subject: 'Main line', refs: [{ name: 'release/1.x', kind: 'branch' }] },
    { hash: 'topic1', parents: ['base1'], author: 'Ada', date: '2026-04-06', subject: 'Topic line', refs: [{ name: 'origin/topic/demo', kind: 'remote' }] },
    { hash: 'base1', parents: [], author: 'Ada', date: '2026-04-05', subject: 'Base', refs: [{ name: 'v1.0.0', kind: 'tag' }] }
  ]);

  const blocked = getMergeBlockedTargetsFromGraph(graph, 'main', [
    { kind: 'branch', name: 'release/1.x' },
    { kind: 'remote', name: 'origin/topic/demo' },
    { kind: 'tag', name: 'v1.0.0' }
  ]);

  assert.deepEqual(blocked, ['branch::release/1.x', 'tag::v1.0.0']);
});

test('can scope the projection to the current branch ancestry', () => {
  const graph = buildCommitGraph([
    { hash: 'head1', parents: ['base1'], author: 'Ada', date: '2026-04-07', subject: 'Current head', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'feature1', parents: ['base1'], author: 'Ada', date: '2026-04-06', subject: 'Feature head', refs: [{ name: 'feature/demo', kind: 'branch' }] },
    { hash: 'base1', parents: [], author: 'Ada', date: '2026-04-05', subject: 'Base', refs: [{ name: 'v1.0.0', kind: 'tag' }] }
  ]);

  const projection = projectDecoratedCommitGraph(graph, {
    ...createDefaultRevisionGraphProjectionOptions(),
    refScope: 'current'
  });

  assert.deepEqual(projection.nodes.map((node) => node.hash), ['head1', 'base1']);
});

test('can scope the projection to local branches', () => {
  const graph = buildCommitGraph([
    { hash: 'head1', parents: ['base1'], author: 'Ada', date: '2026-04-07', subject: 'Current head', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'feature1', parents: ['base1'], author: 'Ada', date: '2026-04-06', subject: 'Feature head', refs: [{ name: 'feature/demo', kind: 'branch' }] },
    { hash: 'remote1', parents: ['base1'], author: 'Ada', date: '2026-04-05', subject: 'Remote only', refs: [{ name: 'origin/topic/demo', kind: 'remote' }] },
    { hash: 'base1', parents: [], author: 'Ada', date: '2026-04-04', subject: 'Base', refs: [{ name: 'v1.0.0', kind: 'tag' }] }
  ]);

  const projection = projectDecoratedCommitGraph(graph, {
    ...createDefaultRevisionGraphProjectionOptions(),
    refScope: 'local'
  });

  assert.deepEqual(projection.nodes.map((node) => node.hash), ['head1', 'feature1', 'base1']);
});

test('can hide tag refs and tag-only commits from the projection', () => {
  const graph = buildCommitGraph([
    { hash: 'head1', parents: ['base1'], author: 'Ada', date: '2026-04-07', subject: 'Current head', refs: [{ name: 'main', kind: 'head' }, { name: 'v2.0.0', kind: 'tag' }] },
    { hash: 'tagonly1', parents: ['base1'], author: 'Ada', date: '2026-04-06', subject: 'Release tag', refs: [{ name: 'v1.0.0', kind: 'tag' }] },
    { hash: 'base1', parents: [], author: 'Ada', date: '2026-04-05', subject: 'Base', refs: [] }
  ]);

  const projection = projectDecoratedCommitGraph(graph, {
    ...createDefaultRevisionGraphProjectionOptions(),
    showTags: false
  });

  assert.deepEqual(
    projection.nodes.map((node) => ({ hash: node.hash, refs: node.refs.map((ref) => ref.name) })),
    [
      { hash: 'head1', refs: ['main'] },
      { hash: 'base1', refs: [] }
    ]
  );
});

test('can hide remote refs and stash refs from the projection', () => {
  const graph = buildCommitGraph([
    {
      hash: 'head1',
      parents: ['base1'],
      author: 'Ada',
      date: '2026-04-07',
      subject: 'Current head',
      refs: [
        { name: 'main', kind: 'head' },
        { name: 'origin/main', kind: 'remote' },
        { name: 'stash', kind: 'stash' }
      ]
    },
    {
      hash: 'remote1',
      parents: ['base1'],
      author: 'Ada',
      date: '2026-04-06',
      subject: 'Remote only',
      refs: [{ name: 'origin/topic/demo', kind: 'remote' }]
    },
    {
      hash: 'stash1',
      parents: ['base1'],
      author: 'Ada',
      date: '2026-04-05',
      subject: 'Stash entry',
      refs: [{ name: 'stash', kind: 'stash' }]
    },
    { hash: 'base1', parents: [], author: 'Ada', date: '2026-04-04', subject: 'Base', refs: [] }
  ]);

  const projection = projectDecoratedCommitGraph(graph, {
    ...createDefaultRevisionGraphProjectionOptions(),
    showRemoteBranches: false,
    showStashes: false
  });

  assert.deepEqual(
    projection.nodes.map((node) => ({ hash: node.hash, refs: node.refs.map((ref) => ref.name) })),
    [
      { hash: 'head1', refs: ['main'] },
      { hash: 'base1', refs: [] }
    ]
  );
});

test('can include unlabeled branch and merge commits in the projection', () => {
  const graph = buildCommitGraph([
    { hash: 'merge1', parents: ['left1', 'right1'], author: 'Ada', date: '2026-04-08', subject: 'Merge topic', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'left1', parents: ['split1'], author: 'Ada', date: '2026-04-07', subject: 'Left', refs: [] },
    { hash: 'right1', parents: ['split1'], author: 'Ada', date: '2026-04-06', subject: 'Right', refs: [{ name: 'origin/topic/demo', kind: 'remote' }] },
    { hash: 'split1', parents: ['base1'], author: 'Ada', date: '2026-04-05', subject: 'Split point', refs: [] },
    { hash: 'base1', parents: [], author: 'Ada', date: '2026-04-04', subject: 'Base', refs: [{ name: 'v1.0.0', kind: 'tag' }] }
  ]);

  const projection = projectDecoratedCommitGraph(graph, {
    ...createDefaultRevisionGraphProjectionOptions(),
    showBranchingsAndMerges: true
  });

  assert.deepEqual(projection.nodes.map((node) => node.hash), ['merge1', 'right1', 'split1', 'base1']);
});

test('builds primary ancestor paths from the full graph for the visible scene', async () => {
  const graph = buildCommitGraph([
    { hash: 'm1', parents: ['n1', 's1'], author: 'Ada', date: '2026-04-07', subject: 'Merge feature', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'n1', parents: ['b1'], author: 'Ada', date: '2026-04-06', subject: 'Main work', refs: [] },
    { hash: 's1', parents: ['b1'], author: 'Ada', date: '2026-04-05', subject: 'Side ref', refs: [{ name: 'origin/feature/demo', kind: 'remote' }] },
    { hash: 'b1', parents: [], author: 'Ada', date: '2026-04-04', subject: 'Base', refs: [{ name: 'v1.0.0', kind: 'tag' }] }
  ]);
  const projection = projectDecoratedCommitGraph(graph);
  const scene = await buildRevisionGraphScene(graph, projection);

  assert.deepEqual(buildPrimaryAncestorPaths(graph, scene), {
    m1: ['m1', 'b1'],
    s1: ['s1', 'b1'],
    b1: ['b1']
  });
});
