import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPrimaryAncestorNextByHash,
  buildRevisionGraphScene,
  parseDecorationRefs,
  parseRevisionGraphLog,
  projectTortoiseMajorOpsGraph
} from '../src/revisionGraphData';
import { buildNodeLayouts } from '../src/revisionGraph/webview/shared';
import { getMergeBlockedTargetsFromGraph } from '../src/revisionGraph/backend';
import { buildCommitGraph, buildCommitGraphWithSimplification } from '../src/revisionGraph/model/commitGraph';
import {
  collectAncestorHashes,
  collectDescendantHashes,
  findCommitHashesByRef
} from '../src/revisionGraph/model/commitGraphQueries';
import {
  projectDecoratedCommitGraph
} from '../src/revisionGraph/projection/graphProjection';
import {
  buildRevisionGraphGitLogArgs,
  buildRevisionLogGitArgs,
  matchesRevisionLogFilter,
  normalizeRevisionLogFilterText,
  parseRevisionLogEntries
} from '../src/revisionGraph/source/graphGit';
import {
  buildProjectedGraphLayoutCacheKey,
  clearProjectedGraphLayoutCache,
  getProjectedGraphLayoutCacheStats,
  layoutProjectedGraph,
  PROJECTED_GRAPH_LAYOUT_CACHE_PERSIST_MAX_POSITIONS,
  restoreProjectedGraphLayoutCache,
  serializeProjectedGraphLayoutCache
} from '../src/revisionGraph/layout/layeredLayout';
import { ProjectedGraph } from '../src/revisionGraph/model/commitGraphTypes';
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

test('builds default git log args for all refs', () => {
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
      showCurrentBranchDescendants: false
    }),
    [
      'log',
      '--branches',
      '--topo-order',
      '--simplify-by-decoration',
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

test('matches show log filter text across message author hashes and references', () => {
  const [entry] = parseRevisionLogEntries(
    '\u001eaaa111bbb222\u001f\u001fAda Lovelace\u001f2026-04-17\u001fHEAD -> main, origin/main, tag: v0.0.17\u001fAdd show log\u001fBody line with parser details\u001e'
  );

  assert.equal(matchesRevisionLogFilter(entry!, normalizeRevisionLogFilterText('parser details')), true);
  assert.equal(matchesRevisionLogFilter(entry!, normalizeRevisionLogFilterText('ada lovelace')), true);
  assert.equal(matchesRevisionLogFilter(entry!, normalizeRevisionLogFilterText('aaa111')), true);
  assert.equal(matchesRevisionLogFilter(entry!, normalizeRevisionLogFilterText('tag:v0.0.17')), true);
  assert.equal(matchesRevisionLogFilter(entry!, normalizeRevisionLogFilterText('missing text')), false);
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

test('projects a Tortoise-style major-operations graph with critical commits and compressed linear paths', () => {
  const graph = buildCommitGraph([
    { hash: 'head1', parents: ['merge1'], author: 'Ada', date: '2026-05-08', subject: 'Head tip', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'merge1', parents: ['linear2', 'topic1'], author: 'Ada', date: '2026-05-07', subject: 'Merge topic', refs: [] },
    { hash: 'linear2', parents: ['fork1'], author: 'Ada', date: '2026-05-06', subject: 'Linear mainline', refs: [] },
    { hash: 'topic1', parents: ['fork1'], author: 'Ada', date: '2026-05-05', subject: 'Topic tip', refs: [{ name: 'feature/topic', kind: 'branch' }] },
    { hash: 'fork1', parents: ['linear1'], author: 'Ada', date: '2026-05-04', subject: 'Fork point', refs: [] },
    { hash: 'linear1', parents: ['root1'], author: 'Ada', date: '2026-05-03', subject: 'Linear base', refs: [] },
    { hash: 'root1', parents: [], author: 'Ada', date: '2026-05-02', subject: 'Root', refs: [] }
  ]);

  const projection = projectTortoiseMajorOpsGraph(graph);

  assert.deepEqual(projection.nodes.map((node) => node.hash), ['head1', 'merge1', 'topic1', 'fork1', 'root1']);
  assert.deepEqual(
    projection.edges.map((edge) => ({ from: edge.from, to: edge.to, through: edge.through })),
    [
      { from: 'head1', to: 'merge1', through: [] },
      { from: 'merge1', to: 'fork1', through: ['linear2'] },
      { from: 'merge1', to: 'topic1', through: [] },
      { from: 'topic1', to: 'fork1', through: [] },
      { from: 'fork1', to: 'root1', through: ['linear1'] }
    ]
  );
});

test('uses the ported Tortoise major-operations layout strategy for scene rows', async () => {
  const graph = buildCommitGraph([
    { hash: 'head1', parents: ['merge1'], author: 'Ada', date: '2026-05-08', subject: 'Head tip', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'merge1', parents: ['base1', 'topic1'], author: 'Ada', date: '2026-05-07', subject: 'Merge topic', refs: [] },
    { hash: 'topic1', parents: ['base1'], author: 'Ada', date: '2026-05-06', subject: 'Topic tip', refs: [{ name: 'feature/topic', kind: 'branch' }] },
    { hash: 'base1', parents: [], author: 'Ada', date: '2026-05-05', subject: 'Base', refs: [] }
  ]);
  const projection = projectTortoiseMajorOpsGraph(graph);
  const scene = await buildRevisionGraphScene(graph, projection, undefined, 'portedTortoiseMajorOps');
  const rowByHash = new Map(scene.nodes.map((node) => [node.hash, node.row] as const));

  for (const edge of scene.edges) {
    assert.ok(
      (rowByHash.get(edge.from) ?? 0) < (rowByHash.get(edge.to) ?? 0),
      `${edge.from} should render above ${edge.to}`
    );
  }
  assert.equal(scene.nodes.length, 4);
  assert.equal(scene.edges.length, 4);
});

test('uses the d3-dag Sugiyama layout strategy for the Tortoise major-operations projection', async () => {
  const graph = buildCommitGraph([
    { hash: 'head1', parents: ['merge1'], author: 'Ada', date: '2026-05-08', subject: 'Head tip', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'merge1', parents: ['base1', 'topic1'], author: 'Ada', date: '2026-05-07', subject: 'Merge topic', refs: [] },
    { hash: 'topic1', parents: ['base1'], author: 'Ada', date: '2026-05-06', subject: 'Topic tip', refs: [{ name: 'feature/topic', kind: 'branch' }] },
    { hash: 'base1', parents: [], author: 'Ada', date: '2026-05-05', subject: 'Base', refs: [] }
  ]);
  const projection = projectTortoiseMajorOpsGraph(graph);
  const scene = await buildRevisionGraphScene(graph, projection, undefined, 'd3DagSugiyama');
  const rowByHash = new Map(scene.nodes.map((node) => [node.hash, node.row] as const));

  for (const edge of scene.edges) {
    assert.ok(
      (rowByHash.get(edge.from) ?? 0) < (rowByHash.get(edge.to) ?? 0),
      `${edge.from} should render above ${edge.to}`
    );
  }
  assert.equal(scene.nodes.length, 4);
  assert.equal(scene.edges.length, 4);
  assert.notEqual(
    buildProjectedGraphLayoutCacheKey(projection, 'gitAware'),
    buildProjectedGraphLayoutCacheKey(projection, 'd3DagSugiyama')
  );
});

test('builds a scene from the refs-only projected graph while preserving merge edges', async () => {
  const graph = buildCommitGraph([
    { hash: 'm1', parents: ['x1', 'b1'], author: 'Ada', date: '2026-04-07', subject: 'Merge', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'x1', parents: ['a1'], author: 'Ada', date: '2026-04-06', subject: 'Mainline commit', refs: [] },
    { hash: 'a1', parents: [], author: 'Ada', date: '2026-04-05', subject: 'Release', refs: [{ name: 'v1.0.0', kind: 'tag' }] },
    { hash: 'b1', parents: [], author: 'Ada', date: '2026-04-04', subject: 'Topic tip', refs: [{ name: 'origin/feature/demo', kind: 'remote' }] }
  ]);

  const projection = projectDecoratedCommitGraph(graph);
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
  assert.ok(events.some((event) => event.phase === 'scene.layout.gitAware'));
  assert.ok(events.some((event) => event.phase === 'scene.total'));
});

test('reuses cached Git-aware layout positions for the same projected graph topology', async () => {
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

test('uses a new layout cache namespace for the Git-aware placement strategy', () => {
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

  assert.match(buildProjectedGraphLayoutCacheKey(projection), /^git-aware-v12:/);
});

test('layout cache key includes ref metadata used by Git-aware placement', async () => {
  const createProjection = (mainlineHash: 'branchA' | 'branchB'): ProjectedGraph => ({
    sourceGraph: buildCommitGraph([]),
    nodes: [
      {
        hash: 'branchA',
        author: 'Ada',
        date: '2026-05-25',
        subject: 'Branch A',
        refs: [{ name: mainlineHash === 'branchA' ? 'origin/main' : 'origin/dev2', kind: 'remote' }],
        isBoundary: false
      },
      {
        hash: 'branchB',
        author: 'Ada',
        date: '2026-05-24',
        subject: 'Branch B',
        refs: [{ name: mainlineHash === 'branchB' ? 'origin/main' : 'origin/dev2', kind: 'remote' }],
        isBoundary: false
      },
      {
        hash: 'base',
        author: 'Ada',
        date: '2026-05-23',
        subject: 'Base',
        refs: [{ name: 'v1.0.0', kind: 'tag' }],
        isBoundary: false
      }
    ],
    edges: [
      { from: 'branchA', to: 'base', through: [] },
      { from: 'branchB', to: 'base', through: [] }
    ],
    visibleHashes: new Set(['branchA', 'branchB', 'base'])
  });
  const branchAMainline = createProjection('branchA');
  const branchBMainline = createProjection('branchB');

  clearProjectedGraphLayoutCache();
  const branchAPositions = await layoutProjectedGraph(branchAMainline);
  const branchBPositions = await layoutProjectedGraph(branchBMainline);
  const layoutCacheStats = getProjectedGraphLayoutCacheStats();

  assert.notEqual(
    buildProjectedGraphLayoutCacheKey(branchAMainline),
    buildProjectedGraphLayoutCacheKey(branchBMainline)
  );
  assert.equal(layoutCacheStats.misses, 2);
  assert.notEqual(branchAPositions.get('branchA')?.x, branchBPositions.get('branchA')?.x);
  assert.notEqual(branchAPositions.get('branchB')?.x, branchBPositions.get('branchB')?.x);
});

test('keeps the first-parent mainline aligned in the Git-aware projected graph layout', async () => {
  const graph = buildCommitGraph([
    { hash: 'head1', parents: ['rel18', 'sha256'], author: 'Ada', date: '2026-05-23', subject: 'Mainline head', refs: [{ name: 'master', kind: 'head' }] },
    { hash: 'sha256', parents: ['rel17'], author: 'Ada', date: '2026-05-22', subject: 'Side branch', refs: [{ name: 'origin/sha256', kind: 'remote' }] },
    { hash: 'rel18', parents: ['rel17'], author: 'Ada', date: '2026-05-21', subject: 'Release 1.8', refs: [{ name: 'REL_1.8.0.0_EXTERNAL', kind: 'tag' }] },
    { hash: 'rel17', parents: [], author: 'Ada', date: '2026-05-20', subject: 'Release 1.7', refs: [{ name: 'REL_1.7.15.0_EXTERNAL', kind: 'tag' }] }
  ]);
  const projection = projectDecoratedCommitGraph(graph);

  const positions = await layoutProjectedGraph(projection);

  assert.equal(positions.get('head1')?.x, positions.get('rel18')?.x);
  assert.equal(positions.get('rel18')?.x, positions.get('rel17')?.x);
  assert.notEqual(positions.get('sha256')?.x, positions.get('head1')?.x);
});

test('balances sibling branch components around the Git-aware mainline', async () => {
  const graph = buildCommitGraph([
    { hash: 'head1', parents: ['base1'], author: 'Ada', date: '2026-05-23', subject: 'Current head', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'leftTip', parents: ['base1'], author: 'Ada', date: '2026-05-22', subject: 'Left topic', refs: [{ name: 'feature/left', kind: 'branch' }] },
    { hash: 'rightTip', parents: ['base1'], author: 'Ada', date: '2026-05-21', subject: 'Right topic', refs: [{ name: 'origin/right', kind: 'remote' }] },
    { hash: 'base1', parents: [], author: 'Ada', date: '2026-05-20', subject: 'Base', refs: [{ name: 'v1.0.0', kind: 'tag' }] }
  ]);
  const projection = projectDecoratedCommitGraph(graph);

  const positions = await layoutProjectedGraph(projection);
  const mainlineX = positions.get('head1')?.x ?? 0;
  const siblingXs = [
    positions.get('leftTip')?.x ?? mainlineX,
    positions.get('rightTip')?.x ?? mainlineX
  ];

  assert.equal(positions.get('base1')?.x, mainlineX);
  assert.ok(siblingXs.some((x) => x < mainlineX));
  assert.ok(siblingXs.some((x) => x > mainlineX));
});

test('places side descendants on the same layer as their mainline sibling descendant', async () => {
  const graph = buildCommitGraph([
    { hash: 'head1', parents: ['mainChild'], author: 'Ada', date: '2026-05-23', subject: 'Head', refs: [{ name: 'master', kind: 'head' }] },
    { hash: 'mainChild', parents: ['base1'], author: 'Ada', date: '2026-05-22', subject: 'Main child', refs: [{ name: 'REL_2.14.0.0_EXTERNAL', kind: 'tag' }] },
    { hash: 'sideChild', parents: ['base1'], author: 'Ada', date: '2026-05-21', subject: 'Side child', refs: [{ name: 'origin/side', kind: 'remote' }] },
    { hash: 'base1', parents: [], author: 'Ada', date: '2026-05-20', subject: 'Base', refs: [{ name: 'REL_2.13.0.0_EXTERNAL', kind: 'tag' }] }
  ]);
  const projection = projectDecoratedCommitGraph(graph);

  const scene = await buildRevisionGraphScene(graph, projection);
  const mainChild = scene.nodes.find((node) => node.hash === 'mainChild');
  const sideChild = scene.nodes.find((node) => node.hash === 'sideChild');

  assert.ok(mainChild);
  assert.ok(sideChild);
  assert.equal(sideChild?.row, mainChild?.row);
  assert.notEqual(sideChild?.x, mainChild?.x);
});

test('keeps projected descendants above every visible parent in the Git-aware layout', async () => {
  const projection: ProjectedGraph = {
    sourceGraph: buildCommitGraph([]),
    nodes: [
      { hash: 'head1', author: 'Ada', date: '2026-05-24', subject: 'Head', refs: [{ name: 'master', kind: 'head' }], isBoundary: false },
      { hash: 'trunk1', author: 'Ada', date: '2026-05-23', subject: 'Trunk', refs: [{ name: 'origin/master', kind: 'remote' }], isBoundary: false },
      { hash: 'mergeBase94', author: 'Ada', date: '2026-05-22', subject: 'Shared ancestor', refs: [], isBoundary: false },
      { hash: 'mainlineMid', author: 'Ada', date: '2026-05-21', subject: 'Mainline middle', refs: [], isBoundary: false },
      { hash: 'deepBase', author: 'Ada', date: '2026-05-20', subject: 'Deep base', refs: [{ name: 'v1.0.0', kind: 'tag' }], isBoundary: false },
      { hash: 'childAbove', author: 'Ada', date: '2026-05-19', subject: 'Child anchored by the shared ancestor', refs: [{ name: 'origin/feature/above', kind: 'remote' }], isBoundary: false },
      { hash: 'childBelow', author: 'Ada', date: '2026-05-18', subject: 'Child first anchored by an older parent', refs: [{ name: 'origin/feature/below', kind: 'remote' }], isBoundary: false }
    ],
    edges: [
      { from: 'head1', to: 'trunk1', through: [] },
      { from: 'trunk1', to: 'mergeBase94', through: [] },
      { from: 'mergeBase94', to: 'mainlineMid', through: [] },
      { from: 'mainlineMid', to: 'deepBase', through: [] },
      { from: 'childAbove', to: 'mergeBase94', through: [] },
      { from: 'childBelow', to: 'deepBase', through: [] },
      { from: 'childBelow', to: 'mergeBase94', through: [] }
    ],
    visibleHashes: new Set(['head1', 'trunk1', 'mergeBase94', 'mainlineMid', 'deepBase', 'childAbove', 'childBelow'])
  };

  const positions = await layoutProjectedGraph(projection);
  const getRow = (hash: string) => positions.get(hash)?.y ?? Number.NaN;

  assert.ok(getRow('childAbove') < getRow('mergeBase94'));
  assert.ok(getRow('childBelow') < getRow('mergeBase94'));
  for (const edge of projection.edges) {
    assert.ok(
      getRow(edge.from) < getRow(edge.to),
      `${edge.from} should be rendered above ${edge.to}`
    );
  }
});

test('centers structural commits between lateral descendants and the mainline', async () => {
  const projection: ProjectedGraph = {
    sourceGraph: buildCommitGraph([]),
    nodes: [
      { hash: 'head1', author: 'Ada', date: '2026-05-24', subject: 'Head', refs: [{ name: 'master', kind: 'head' }], isBoundary: false },
      { hash: 'mainBase', author: 'Ada', date: '2026-05-23', subject: 'Mainline base', refs: [{ name: 'origin/master', kind: 'remote' }], isBoundary: false },
      { hash: 'leftChild', author: 'Ada', date: '2026-05-22', subject: 'Left descendant', refs: [{ name: 'origin/feature/left', kind: 'remote' }], isBoundary: false },
      { hash: 'rightChild', author: 'Ada', date: '2026-05-21', subject: 'Right descendant', refs: [{ name: 'origin/feature/right', kind: 'remote' }], isBoundary: false },
      { hash: 'structural94', author: 'Ada', date: '2026-05-20', subject: 'Shared structural ancestor', refs: [], isBoundary: false }
    ],
    edges: [
      { from: 'head1', to: 'mainBase', through: [] },
      { from: 'leftChild', to: 'structural94', through: [] },
      { from: 'rightChild', to: 'structural94', through: [] },
      { from: 'structural94', to: 'mainBase', through: [] }
    ],
    visibleHashes: new Set(['head1', 'mainBase', 'leftChild', 'rightChild', 'structural94'])
  };

  const positions = await layoutProjectedGraph(projection);
  const sideX = positions.get('leftChild')?.x ?? Number.NaN;
  const structuralX = positions.get('structural94')?.x ?? Number.NaN;
  const mainlineX = positions.get('mainBase')?.x ?? Number.NaN;

  assert.equal(positions.get('rightChild')?.x, sideX);
  assert.ok(structuralX > Math.min(sideX, mainlineX));
  assert.ok(structuralX < Math.max(sideX, mainlineX));
});

test('pulls isolated lateral refs near their visible ancestor after shared ancestors move down', async () => {
  const projection: ProjectedGraph = {
    sourceGraph: buildCommitGraph([]),
    nodes: [
      { hash: 'head', author: 'Ada', date: '2026-05-25', subject: 'Head', refs: [{ name: 'master', kind: 'head' }], isBoundary: false },
      { hash: 'base', author: 'Ada', date: '2026-05-24', subject: 'Base', refs: [{ name: 'origin/master', kind: 'remote' }], isBoundary: false },
      { hash: 'side1', author: 'Ada', date: '2026-05-23', subject: 'Side 1', refs: [], isBoundary: false },
      { hash: 'side2', author: 'Ada', date: '2026-05-22', subject: 'Side 2', refs: [], isBoundary: false },
      { hash: 'side3', author: 'Ada', date: '2026-05-21', subject: 'Side 3', refs: [], isBoundary: false },
      { hash: 'side4', author: 'Ada', date: '2026-05-20', subject: 'Side 4', refs: [], isBoundary: false },
      { hash: 'ancestor', author: 'Ada', date: '2026-05-19', subject: 'Shared ancestor', refs: [{ name: 'v0.7.3', kind: 'tag' }], isBoundary: false },
      { hash: 'release', author: 'Ada', date: '2026-05-18', subject: 'Release branch', refs: [{ name: 'origin/v0.7.4-release', kind: 'remote' }], isBoundary: false }
    ],
    edges: [
      { from: 'head', to: 'base', through: [] },
      { from: 'head', to: 'side1', through: [] },
      { from: 'side1', to: 'side2', through: [] },
      { from: 'side2', to: 'side3', through: [] },
      { from: 'side3', to: 'side4', through: [] },
      { from: 'side4', to: 'ancestor', through: [] },
      { from: 'ancestor', to: 'base', through: [] },
      { from: 'release', to: 'ancestor', through: [] }
    ],
    visibleHashes: new Set(['head', 'base', 'side1', 'side2', 'side3', 'side4', 'ancestor', 'release'])
  };

  const positions = await layoutProjectedGraph(projection);
  const releaseY = positions.get('release')?.y ?? Number.NaN;
  const ancestorY = positions.get('ancestor')?.y ?? Number.NaN;

  assert.equal(ancestorY - releaseY, 96);
  assert.equal(releaseY, positions.get('side4')?.y);
});

test('keeps isolated lateral refs above all visible parents while moving them closer', async () => {
  const projection: ProjectedGraph = {
    sourceGraph: buildCommitGraph([]),
    nodes: [
      { hash: 'head', author: 'Ada', date: '2026-05-25', subject: 'Head', refs: [{ name: 'master', kind: 'head' }], isBoundary: false },
      { hash: 'base', author: 'Ada', date: '2026-05-24', subject: 'Base', refs: [{ name: 'origin/master', kind: 'remote' }], isBoundary: false },
      { hash: 'side1', author: 'Ada', date: '2026-05-23', subject: 'Side 1', refs: [], isBoundary: false },
      { hash: 'side2', author: 'Ada', date: '2026-05-22', subject: 'Side 2', refs: [], isBoundary: false },
      { hash: 'side3', author: 'Ada', date: '2026-05-21', subject: 'Side 3', refs: [], isBoundary: false },
      { hash: 'side4', author: 'Ada', date: '2026-05-20', subject: 'Side 4', refs: [], isBoundary: false },
      { hash: 'ancestor', author: 'Ada', date: '2026-05-19', subject: 'Shared ancestor', refs: [{ name: 'v0.7.3', kind: 'tag' }], isBoundary: false },
      { hash: 'olderParent', author: 'Ada', date: '2026-05-18', subject: 'Older parent', refs: [{ name: 'v0.7.2', kind: 'tag' }], isBoundary: false },
      { hash: 'release', author: 'Ada', date: '2026-05-17', subject: 'Release branch', refs: [{ name: 'origin/v0.7.4-release', kind: 'remote' }], isBoundary: false }
    ],
    edges: [
      { from: 'head', to: 'base', through: [] },
      { from: 'head', to: 'side1', through: [] },
      { from: 'side1', to: 'side2', through: [] },
      { from: 'side2', to: 'side3', through: [] },
      { from: 'side3', to: 'side4', through: [] },
      { from: 'side4', to: 'ancestor', through: [] },
      { from: 'ancestor', to: 'base', through: [] },
      { from: 'ancestor', to: 'olderParent', through: [] },
      { from: 'release', to: 'ancestor', through: [] },
      { from: 'release', to: 'olderParent', through: [] }
    ],
    visibleHashes: new Set(['head', 'base', 'side1', 'side2', 'side3', 'side4', 'ancestor', 'olderParent', 'release'])
  };

  const positions = await layoutProjectedGraph(projection);
  const releaseY = positions.get('release')?.y ?? Number.NaN;
  const ancestorY = positions.get('ancestor')?.y ?? Number.NaN;
  const olderParentY = positions.get('olderParent')?.y ?? Number.NaN;

  assert.equal(ancestorY - releaseY, 96);
  assert.ok(releaseY < olderParentY);
});

test('pulls lateral branch components near the visible fork point', async () => {
  const projection: ProjectedGraph = {
    sourceGraph: buildCommitGraph([]),
    nodes: [
      { hash: 'head', author: 'Ada', date: '2026-05-25', subject: 'Head', refs: [{ name: 'master', kind: 'head' }], isBoundary: false },
      { hash: 'v030', author: 'Ada', date: '2026-05-24', subject: 'v0.3.0', refs: [{ name: 'v0.3.0', kind: 'tag' }], isBoundary: false },
      { hash: 'fork', author: 'Ada', date: '2026-05-23', subject: 'v0.2.0', refs: [{ name: 'v0.2.0', kind: 'tag' }], isBoundary: false },
      { hash: 'base', author: 'Ada', date: '2026-05-22', subject: 'Base', refs: [{ name: 'origin/master', kind: 'remote' }], isBoundary: false },
      { hash: 'side1', author: 'Ada', date: '2026-05-21', subject: 'Side 1', refs: [], isBoundary: false },
      { hash: 'side2', author: 'Ada', date: '2026-05-20', subject: 'Side 2', refs: [], isBoundary: false },
      { hash: 'side3', author: 'Ada', date: '2026-05-19', subject: 'Side 3', refs: [], isBoundary: false },
      { hash: 'side4', author: 'Ada', date: '2026-05-18', subject: 'Side 4', refs: [], isBoundary: false },
      { hash: 'v026', author: 'Ada', date: '2026-05-17', subject: 'v0.2.6', refs: [{ name: 'v0.2.6', kind: 'tag' }], isBoundary: false },
      { hash: 'v025', author: 'Ada', date: '2026-05-16', subject: 'v0.2.5', refs: [{ name: 'v0.2.5', kind: 'tag' }], isBoundary: false },
      { hash: 'v024', author: 'Ada', date: '2026-05-15', subject: 'v0.2.4', refs: [{ name: 'v0.2.4', kind: 'tag' }], isBoundary: false },
      { hash: 'v023', author: 'Ada', date: '2026-05-14', subject: 'v0.2.3', refs: [{ name: 'v0.2.3', kind: 'tag' }], isBoundary: false },
      { hash: 'v022', author: 'Ada', date: '2026-05-13', subject: 'v0.2.2', refs: [{ name: 'v0.2.2', kind: 'tag' }], isBoundary: false },
      { hash: 'v021', author: 'Ada', date: '2026-05-12', subject: 'v0.2.1', refs: [{ name: 'v0.2.1', kind: 'tag' }], isBoundary: false }
    ],
    edges: [
      { from: 'head', to: 'v030', through: [] },
      { from: 'v030', to: 'fork', through: [] },
      { from: 'fork', to: 'base', through: [] },
      { from: 'head', to: 'side1', through: [] },
      { from: 'side1', to: 'side2', through: [] },
      { from: 'side2', to: 'side3', through: [] },
      { from: 'side3', to: 'side4', through: [] },
      { from: 'side4', to: 'fork', through: [] },
      { from: 'v026', to: 'v025', through: [] },
      { from: 'v025', to: 'v024', through: [] },
      { from: 'v024', to: 'v023', through: [] },
      { from: 'v023', to: 'v022', through: [] },
      { from: 'v022', to: 'v021', through: [] },
      { from: 'v021', to: 'fork', through: [] }
    ],
    visibleHashes: new Set([
      'head',
      'v030',
      'fork',
      'base',
      'side1',
      'side2',
      'side3',
      'side4',
      'v026',
      'v025',
      'v024',
      'v023',
      'v022',
      'v021'
    ])
  };

  const positions = await layoutProjectedGraph(projection);
  const forkY = positions.get('fork')?.y ?? Number.NaN;
  const branchRootY = positions.get('v021')?.y ?? Number.NaN;

  assert.equal(forkY - branchRootY, 96);
  assert.equal(branchRootY - (positions.get('v022')?.y ?? Number.NaN), 96);
  assert.equal(
    (positions.get('v022')?.y ?? Number.NaN) - (positions.get('v023')?.y ?? Number.NaN),
    96
  );
});

test('keeps referenced version sequences on stable lanes during layer ordering', async () => {
  const projection: ProjectedGraph = {
    sourceGraph: buildCommitGraph([]),
    nodes: [
      { hash: 'head', author: 'Ada', date: '2026-05-25', subject: 'Head', refs: [{ name: 'master', kind: 'head' }], isBoundary: false },
      { hash: 'base', author: 'Ada', date: '2026-05-24', subject: 'Base', refs: [{ name: 'origin/master', kind: 'remote' }], isBoundary: false },
      { hash: 'v10Remote', author: 'Ada', date: '2026-05-24', subject: 'origin/v0.10', refs: [{ name: 'origin/v0.10', kind: 'remote' }], isBoundary: false },
      { hash: 'v47', author: 'Ada', date: '2026-05-23', subject: 'v0.10.47', refs: [{ name: 'v0.10.47', kind: 'tag' }], isBoundary: false },
      { hash: 'v48', author: 'Ada', date: '2026-05-22', subject: 'v0.10.48', refs: [{ name: 'v0.10.48', kind: 'tag' }], isBoundary: false },
      { hash: 'other47', author: 'Ada', date: '2026-05-21', subject: 'v0.12.13', refs: [{ name: 'v0.12.13', kind: 'tag' }], isBoundary: false },
      { hash: 'other48', author: 'Ada', date: '2026-05-20', subject: 'v0.12.14', refs: [{ name: 'v0.12.14', kind: 'tag' }], isBoundary: false }
    ],
    edges: [
      { from: 'head', to: 'base', through: [] },
      { from: 'v10Remote', to: 'v48', through: [] },
      { from: 'v48', to: 'v47', through: [] },
      { from: 'v47', to: 'base', through: [] },
      { from: 'other48', to: 'other47', through: [] },
      { from: 'other47', to: 'base', through: [] }
    ],
    visibleHashes: new Set(['head', 'base', 'v10Remote', 'v47', 'v48', 'other47', 'other48'])
  };

  const positions = await layoutProjectedGraph(projection);

  assert.equal(positions.get('v10Remote')?.x, positions.get('v48')?.x);
  assert.equal(positions.get('v48')?.x, positions.get('v47')?.x);
  assert.equal(positions.get('other48')?.x, positions.get('other47')?.x);
  assert.notEqual(positions.get('v48')?.x, positions.get('other48')?.x);
});

test('keeps simple non-mainline linear paths on stable lanes across adjacent refs', async () => {
  const projection: ProjectedGraph = {
    sourceGraph: buildCommitGraph([]),
    nodes: [
      { hash: 'head', author: 'Ada', date: '2026-05-25', subject: 'Head', refs: [{ name: 'master', kind: 'head' }], isBoundary: false },
      { hash: 'base', author: 'Ada', date: '2026-05-24', subject: 'Base', refs: [{ name: 'origin/master', kind: 'remote' }], isBoundary: false },
      { hash: 'v150', author: 'Ada', date: '2026-05-23', subject: 'v1.5.0', refs: [{ name: 'v1.5.0', kind: 'tag' }], isBoundary: false },
      { hash: 'v143', author: 'Ada', date: '2026-05-22', subject: 'v1.4.3', refs: [{ name: 'v1.4.3', kind: 'tag' }], isBoundary: false },
      { hash: 'v142', author: 'Ada', date: '2026-05-21', subject: 'v1.4.2', refs: [{ name: 'v1.4.2', kind: 'tag' }], isBoundary: false },
      { hash: 'sibling', author: 'Ada', date: '2026-05-20', subject: 'Sibling', refs: [{ name: 'origin/sibling', kind: 'remote' }], isBoundary: false }
    ],
    edges: [
      { from: 'head', to: 'base', through: [] },
      { from: 'v150', to: 'v143', through: [] },
      { from: 'v143', to: 'v142', through: [] },
      { from: 'v142', to: 'base', through: [] },
      { from: 'sibling', to: 'base', through: [] }
    ],
    visibleHashes: new Set(['head', 'base', 'v150', 'v143', 'v142', 'sibling'])
  };

  const positions = await layoutProjectedGraph(projection);

  assert.equal(positions.get('v150')?.x, positions.get('v143')?.x);
  assert.equal(positions.get('v143')?.x, positions.get('v142')?.x);
});

test('keeps the dominant successor lane through a merge without collapsing competing descendants', async () => {
  const projection: ProjectedGraph = {
    sourceGraph: buildCommitGraph([]),
    nodes: [
      { hash: 'head', author: 'Ada', date: '2026-05-25', subject: 'Head', refs: [{ name: 'master', kind: 'head' }], isBoundary: false },
      { hash: 'base', author: 'Ada', date: '2026-05-24', subject: 'Base', refs: [{ name: 'origin/master', kind: 'remote' }], isBoundary: false },
      { hash: 'secondaryParent', author: 'Ada', date: '2026-05-23', subject: 'v0.10.44', refs: [{ name: 'v0.10.44', kind: 'tag' }], isBoundary: false },
      { hash: 'primaryParent', author: 'Ada', date: '2026-05-22', subject: 'v1.4.3', refs: [{ name: 'v1.4.3', kind: 'tag' }], isBoundary: false },
      { hash: 'competitor', author: 'Ada', date: '2026-05-21', subject: 'v0.10.45', refs: [{ name: 'v0.10.45', kind: 'tag' }], isBoundary: false },
      { hash: 'mergeChild', author: 'Ada', date: '2026-05-20', subject: 'v1.5.0', refs: [{ name: 'v1.5.0', kind: 'tag' }], isBoundary: false },
      { hash: 'successor', author: 'Ada', date: '2026-05-19', subject: 'v1.5.1', refs: [{ name: 'v1.5.1', kind: 'tag' }], isBoundary: false }
    ],
    edges: [
      { from: 'head', to: 'secondaryParent', through: [] },
      { from: 'secondaryParent', to: 'base', through: [] },
      { from: 'primaryParent', to: 'base', through: [] },
      { from: 'competitor', to: 'secondaryParent', through: [] },
      { from: 'mergeChild', to: 'primaryParent', through: [] },
      { from: 'mergeChild', to: 'secondaryParent', through: [] },
      { from: 'successor', to: 'mergeChild', through: [] }
    ],
    visibleHashes: new Set([
      'head',
      'base',
      'primaryParent',
      'secondaryParent',
      'competitor',
      'mergeChild',
      'successor'
    ])
  };

  const positions = await layoutProjectedGraph(projection);

  assert.equal(positions.get('successor')?.x, positions.get('mergeChild')?.x);
  assert.equal(positions.get('mergeChild')?.x, positions.get('primaryParent')?.x);
  assert.notEqual(positions.get('mergeChild')?.x, positions.get('secondaryParent')?.x);
});

test('keeps first-parent merge convergence on the dominant parent lane during fan-out ordering', async () => {
  const projection: ProjectedGraph = {
    sourceGraph: buildCommitGraph([]),
    nodes: [
      { hash: 'head', author: 'Ada', date: '2026-05-25', subject: 'Head', refs: [{ name: 'master', kind: 'head' }], isBoundary: false },
      { hash: 'base', author: 'Ada', date: '2026-05-24', subject: 'Base', refs: [{ name: 'origin/master', kind: 'remote' }], isBoundary: false },
      { hash: 'primaryParent', author: 'Ada', date: '2026-05-23', subject: 'v1.4.0', refs: [{ name: 'v1.4.0', kind: 'tag' }], isBoundary: false },
      { hash: 'competitor', author: 'Ada', date: '2026-05-22', subject: 'v0.10.44', refs: [{ name: 'v0.10.44', kind: 'tag' }], isBoundary: false },
      { hash: 'competitorTip', author: 'Ada', date: '2026-05-21', subject: 'v0.10.45', refs: [{ name: 'v0.10.45', kind: 'tag' }], isBoundary: false },
      { hash: 'secondaryParent', author: 'Ada', date: '2026-05-20', subject: 'v1.3.0', refs: [{ name: 'v1.3.0', kind: 'tag' }], isBoundary: false },
      { hash: 'mergeChild', author: 'Ada', date: '2026-05-19', subject: 'v1.5.0', refs: [{ name: 'v1.5.0', kind: 'tag' }], isBoundary: false },
      { hash: 'successor', author: 'Ada', date: '2026-05-18', subject: 'v1.5.1', refs: [{ name: 'v1.5.1', kind: 'tag' }], isBoundary: false }
    ],
    edges: [
      { from: 'head', to: 'base', through: [] },
      { from: 'primaryParent', to: 'base', through: [] },
      { from: 'competitor', to: 'primaryParent', through: [] },
      { from: 'competitorTip', to: 'competitor', through: [] },
      { from: 'secondaryParent', to: 'base', through: [] },
      { from: 'mergeChild', to: 'primaryParent', through: [] },
      { from: 'mergeChild', to: 'secondaryParent', through: [] },
      { from: 'successor', to: 'mergeChild', through: [] }
    ],
    visibleHashes: new Set([
      'head',
      'base',
      'primaryParent',
      'competitor',
      'competitorTip',
      'secondaryParent',
      'mergeChild',
      'successor'
    ])
  };

  const positions = await layoutProjectedGraph(projection);

  assert.equal(positions.get('mergeChild')?.x, positions.get('primaryParent')?.x);
  assert.equal(positions.get('successor')?.x, positions.get('mergeChild')?.x);
  assert.notEqual(positions.get('competitor')?.x, positions.get('primaryParent')?.x);
});

test('orders fan-out descendants around the fork while preserving the primary successor lane', async () => {
  const projection: ProjectedGraph = {
    sourceGraph: buildCommitGraph([]),
    nodes: [
      { hash: 'head', author: 'Ada', date: '2026-05-25', subject: 'Head', refs: [{ name: 'master', kind: 'head' }], isBoundary: false },
      { hash: 'base', author: 'Ada', date: '2026-05-24', subject: 'Base', refs: [{ name: 'origin/master', kind: 'remote' }], isBoundary: false },
      { hash: 'fork', author: 'Ada', date: '2026-05-23', subject: 'v1.4.0', refs: [{ name: 'v1.4.0', kind: 'tag' }], isBoundary: false },
      { hash: 'primary', author: 'Ada', date: '2026-05-22', subject: 'v1.5.0', refs: [{ name: 'v1.5.0', kind: 'tag' }], isBoundary: false },
      { hash: 'primaryTip', author: 'Ada', date: '2026-05-21', subject: 'v1.5.1', refs: [{ name: 'v1.5.1', kind: 'tag' }], isBoundary: false },
      { hash: 'side', author: 'Ada', date: '2026-05-20', subject: 'v0.10.44', refs: [{ name: 'v0.10.44', kind: 'tag' }], isBoundary: false },
      { hash: 'sideTip', author: 'Ada', date: '2026-05-19', subject: 'v0.10.45', refs: [{ name: 'v0.10.45', kind: 'tag' }], isBoundary: false }
    ],
    edges: [
      { from: 'head', to: 'base', through: [] },
      { from: 'fork', to: 'base', through: [] },
      { from: 'primary', to: 'fork', through: [] },
      { from: 'primaryTip', to: 'primary', through: [] },
      { from: 'side', to: 'fork', through: [] },
      { from: 'sideTip', to: 'side', through: [] }
    ],
    visibleHashes: new Set(['head', 'base', 'fork', 'primary', 'primaryTip', 'side', 'sideTip'])
  };

  const positions = await layoutProjectedGraph(projection);

  assert.equal(positions.get('primary')?.x, positions.get('fork')?.x);
  assert.equal(positions.get('primaryTip')?.x, positions.get('primary')?.x);
  assert.equal(positions.get('sideTip')?.x, positions.get('side')?.x);
  assert.notEqual(positions.get('side')?.x, positions.get('fork')?.x);
});

test('uses Git-aware linear layout for oversized projected graphs without invoking ELK', async () => {
  clearProjectedGraphLayoutCache();
  const nodeCount = 1501;
  const projection: ProjectedGraph = {
    sourceGraph: buildCommitGraph([]),
    nodes: Array.from({ length: nodeCount }, (_, index) => ({
      hash: `large-${index}`,
      author: 'Ada',
      date: '2026-05-22',
      subject: `Large ${index}`,
      refs: [],
      isBoundary: false
    })),
    edges: Array.from({ length: nodeCount - 1 }, (_, index) => ({
      from: `large-${index}`,
      to: `large-${index + 1}`,
      through: []
    })),
    visibleHashes: new Set(Array.from({ length: nodeCount }, (_, index) => `large-${index}`))
  };

  const positions = await layoutProjectedGraph(projection);
  const cacheStats = getProjectedGraphLayoutCacheStats();

  assert.equal(positions.size, nodeCount);
  assert.deepEqual(positions.get('large-0'), { x: 0, y: 0 });
  assert.deepEqual(positions.get('large-1'), { x: 0, y: 96 });
  assert.equal(cacheStats.entries, 1);
  assert.equal(cacheStats.misses, 1);
  assert.equal(cacheStats.hits, 0);
});

test('restores serialized Git-aware layout cache entries across extension sessions', async () => {
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

test('ignores oversized serialized layout cache entries', () => {
  clearProjectedGraphLayoutCache();
  const oversizedPositions: [string, { readonly x: number; readonly y: number }][] = Array.from(
    { length: PROJECTED_GRAPH_LAYOUT_CACHE_PERSIST_MAX_POSITIONS + 1 },
    (_, index) => [`hash-${index}`, { x: index, y: index }]
  );

  restoreProjectedGraphLayoutCache([
    {
      key: 'git-aware-v2:oversized',
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

  const projection = projectDecoratedCommitGraph(graph);
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

test('builds node layouts for long fan-out corridors without spreading large arrays', () => {
  const scene = {
    nodes: [
      {
        hash: 'base1',
        row: 0,
        lane: 0,
        x: 0,
        refs: [{ name: 'main', kind: 'head' as const }],
        author: 'Ada',
        date: '2026-05-22',
        subject: 'Base'
      },
      {
        hash: 'child1',
        row: 150000,
        lane: 0,
        x: 0,
        refs: [{ name: 'feature/one', kind: 'branch' as const }],
        author: 'Ada',
        date: '2026-05-22',
        subject: 'Child one'
      },
      {
        hash: 'child2',
        row: 160000,
        lane: 1,
        x: 220,
        refs: [{ name: 'feature/two', kind: 'branch' as const }],
        author: 'Ada',
        date: '2026-05-22',
        subject: 'Child two'
      }
    ],
    edges: [
      { from: 'child1', to: 'base1' },
      { from: 'child2', to: 'base1' }
    ],
    laneCount: 2,
    rowCount: 160001
  };

  const layouts = buildNodeLayouts(scene);

  assert.equal(layouts.length, 3);
  assert.ok((layouts.find((node) => node.hash === 'child2')?.defaultTop ?? 0) > 0);
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

test('collects descendant hashes from the full DAG', () => {
  const graph = buildCommitGraph([
    { hash: 'tip', parents: ['mid'], author: 'Ada', date: '2026-05-04', subject: 'Tip', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'side', parents: ['mid'], author: 'Ada', date: '2026-05-03', subject: 'Side', refs: [{ name: 'feature/demo', kind: 'branch' }] },
    { hash: 'mid', parents: ['base'], author: 'Ada', date: '2026-05-02', subject: 'Middle', refs: [] },
    { hash: 'base', parents: [], author: 'Ada', date: '2026-05-01', subject: 'Base', refs: [{ name: 'v1.0.0', kind: 'tag' }] }
  ]);

  assert.deepEqual([...collectDescendantHashes(graph, ['base'])], ['base', 'mid', 'tip', 'side']);
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

test('builds current branch git log args from all refs by default so descendants can be projected', () => {
  assert.deepEqual(
    buildRevisionGraphGitLogArgs(6000, {
      ...createDefaultRevisionGraphProjectionOptions(),
      refScope: 'current'
    }),
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

test('builds current branch git log args from all refs for legacy descendant option messages', () => {
  assert.deepEqual(
    buildRevisionGraphGitLogArgs(6000, {
      ...createDefaultRevisionGraphProjectionOptions(),
      refScope: 'current',
      showCurrentBranchDescendants: true
    }),
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

test('builds origin head git log args from all refs so descendants can be projected', () => {
  assert.deepEqual(
    buildRevisionGraphGitLogArgs(6000, {
      ...createDefaultRevisionGraphProjectionOptions(),
      refScope: 'remoteHead'
    }),
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

test('can scope the projection to the current branch ancestry and descendant refs', () => {
  const graph = buildCommitGraph([
    { hash: 'topic2', parents: ['topic1'], author: 'Ada', date: '2026-04-09', subject: 'Topic tip', refs: [{ name: 'feature/from-main', kind: 'branch' }] },
    { hash: 'topic1', parents: ['head1'], author: 'Ada', date: '2026-04-08', subject: 'Topic work', refs: [] },
    { hash: 'head1', parents: ['base1'], author: 'Ada', date: '2026-04-07', subject: 'Current head', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'feature1', parents: ['base1'], author: 'Ada', date: '2026-04-06', subject: 'Sibling feature head', refs: [{ name: 'feature/sibling', kind: 'branch' }] },
    { hash: 'base1', parents: [], author: 'Ada', date: '2026-04-05', subject: 'Base', refs: [{ name: 'v1.0.0', kind: 'tag' }] }
  ]);

  const projection = projectDecoratedCommitGraph(graph, {
    ...createDefaultRevisionGraphProjectionOptions(),
    refScope: 'current'
  });

  assert.deepEqual(projection.nodes.map((node) => node.hash), ['topic2', 'head1', 'base1']);
  assert.deepEqual(projection.edges, [
    { from: 'topic2', to: 'head1', through: ['topic1'] },
    { from: 'head1', to: 'base1', through: [] }
  ]);
});

test('keeps current branch descendants enabled for legacy descendant option messages', () => {
  const graph = buildCommitGraph([
    { hash: 'topic2', parents: ['topic1'], author: 'Ada', date: '2026-04-09', subject: 'Topic tip', refs: [{ name: 'feature/from-main', kind: 'branch' }] },
    { hash: 'topic1', parents: ['head1'], author: 'Ada', date: '2026-04-08', subject: 'Topic work', refs: [] },
    { hash: 'head1', parents: ['base1'], author: 'Ada', date: '2026-04-07', subject: 'Current head', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'feature1', parents: ['base1'], author: 'Ada', date: '2026-04-06', subject: 'Sibling feature head', refs: [{ name: 'feature/sibling', kind: 'branch' }] },
    { hash: 'base1', parents: [], author: 'Ada', date: '2026-04-05', subject: 'Base', refs: [{ name: 'v1.0.0', kind: 'tag' }] }
  ]);

  const projection = projectDecoratedCommitGraph(graph, {
    ...createDefaultRevisionGraphProjectionOptions(),
    refScope: 'current',
    showCurrentBranchDescendants: true
  });

  assert.deepEqual(projection.nodes.map((node) => node.hash), ['topic2', 'head1', 'base1']);
  assert.deepEqual(projection.edges, [
    { from: 'topic2', to: 'head1', through: ['topic1'] },
    { from: 'head1', to: 'base1', through: [] }
  ]);
});

test('can scope the projection to origin head ancestry and descendant refs', () => {
  const graph = buildCommitGraph([
    { hash: 'topic2', parents: ['remoteHead1'], author: 'Ada', date: '2026-04-09', subject: 'Remote topic tip', refs: [{ name: 'origin/topic/demo', kind: 'remote' }] },
    { hash: 'localTopic1', parents: ['remoteHead1'], author: 'Ada', date: '2026-04-09', subject: 'Local topic tip', refs: [{ name: 'feature/from-origin-head', kind: 'branch' }] },
    { hash: 'localHeadFromRemote1', parents: ['remoteHead1'], author: 'Ada', date: '2026-04-09', subject: 'Current local copy', refs: [{ name: 'master-copy', kind: 'head' }] },
    { hash: 'remoteHead1', parents: ['base1'], author: 'Ada', date: '2026-04-08', subject: 'Remote trunk tip', refs: [{ name: 'origin/main', kind: 'remote' }, { name: 'origin/HEAD', kind: 'remote' }] },
    { hash: 'localHead1', parents: ['featureBase1'], author: 'Ada', date: '2026-04-07', subject: 'Current feature', refs: [{ name: 'feature/work', kind: 'head' }] },
    { hash: 'featureBase1', parents: ['base1'], author: 'Ada', date: '2026-04-06', subject: 'Feature base', refs: [] },
    { hash: 'base1', parents: [], author: 'Ada', date: '2026-04-05', subject: 'Base', refs: [{ name: 'v1.0.0', kind: 'tag' }] }
  ]);

  const projection = projectDecoratedCommitGraph(graph, {
    ...createDefaultRevisionGraphProjectionOptions(),
    refScope: 'remoteHead'
  });

  assert.deepEqual(projection.nodes.map((node) => node.hash), ['topic2', 'localTopic1', 'localHeadFromRemote1', 'remoteHead1', 'base1']);
  assert.deepEqual(projection.edges, [
    { from: 'topic2', to: 'remoteHead1', through: [] },
    { from: 'localTopic1', to: 'remoteHead1', through: [] },
    { from: 'localHeadFromRemote1', to: 'remoteHead1', through: [] },
    { from: 'remoteHead1', to: 'base1', through: [] }
  ]);
});

test('can scope the projection to origin main when origin head decoration is missing', () => {
  const graph = buildCommitGraph([
    { hash: 'remoteHead1', parents: ['base1'], author: 'Ada', date: '2026-04-08', subject: 'Remote trunk tip', refs: [{ name: 'origin/main', kind: 'remote' }] },
    { hash: 'topic1', parents: ['base1'], author: 'Ada', date: '2026-04-07', subject: 'Sibling topic', refs: [{ name: 'origin/topic/demo', kind: 'remote' }] },
    { hash: 'base1', parents: [], author: 'Ada', date: '2026-04-05', subject: 'Base', refs: [{ name: 'v1.0.0', kind: 'tag' }] }
  ]);

  const projection = projectDecoratedCommitGraph(graph, {
    ...createDefaultRevisionGraphProjectionOptions(),
    refScope: 'remoteHead'
  });

  assert.deepEqual(projection.nodes.map((node) => node.hash), ['remoteHead1', 'base1']);
});

test('keeps the origin head anchor visible when remote branch labels are hidden', () => {
  const graph = buildCommitGraph([
    { hash: 'remoteHead1', parents: ['base1'], author: 'Ada', date: '2026-04-08', subject: 'Remote trunk tip', refs: [{ name: 'origin/HEAD', kind: 'remote' }] },
    { hash: 'localTopic1', parents: ['remoteHead1'], author: 'Ada', date: '2026-04-08', subject: 'Local topic tip', refs: [{ name: 'feature/from-origin-head', kind: 'branch' }] },
    { hash: 'topic1', parents: ['base1'], author: 'Ada', date: '2026-04-07', subject: 'Sibling topic', refs: [{ name: 'origin/topic/demo', kind: 'remote' }] },
    { hash: 'base1', parents: [], author: 'Ada', date: '2026-04-05', subject: 'Base', refs: [{ name: 'v1.0.0', kind: 'tag' }] }
  ]);

  const projection = projectDecoratedCommitGraph(graph, {
    ...createDefaultRevisionGraphProjectionOptions(),
    refScope: 'remoteHead',
    showRemoteBranches: false
  });

  assert.deepEqual(
    projection.nodes.map((node) => ({ hash: node.hash, refs: node.refs.map((ref) => ref.name) })),
    [
      { hash: 'remoteHead1', refs: [] },
      { hash: 'localTopic1', refs: ['feature/from-origin-head'] },
      { hash: 'base1', refs: ['v1.0.0'] }
    ]
  );
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

test('builds compact primary ancestor next pointers for the visible scene', async () => {
  const graph = buildCommitGraph([
    { hash: 'm1', parents: ['n1', 's1'], author: 'Ada', date: '2026-04-07', subject: 'Merge feature', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'n1', parents: ['b1'], author: 'Ada', date: '2026-04-06', subject: 'Main work', refs: [] },
    { hash: 's1', parents: ['b1'], author: 'Ada', date: '2026-04-05', subject: 'Side ref', refs: [{ name: 'origin/feature/demo', kind: 'remote' }] },
    { hash: 'b1', parents: [], author: 'Ada', date: '2026-04-04', subject: 'Base', refs: [{ name: 'v1.0.0', kind: 'tag' }] }
  ]);
  const projection = projectDecoratedCommitGraph(graph);
  const scene = await buildRevisionGraphScene(graph, projection);

  assert.deepEqual(buildPrimaryAncestorNextByHash(graph, scene), {
    m1: 'b1',
    s1: 'b1'
  });
});
