import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPrimaryAncestorNextByHash,
  buildRevisionGraphScene,
  parseDecorationRefs,
  parseRevisionGraphLog,
  projectMajorOperationsGraph
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
  buildRevisionGraphGitLogArgs,
  buildRevisionLogGitArgs,
  matchesRevisionLogFilter,
  normalizeRevisionLogFilterText,
  parseRevisionLogEntries
} from '../src/revisionGraph/source/graphGit';
import {
  buildProjectedGraphLayoutCacheKey,
  clearProjectedGraphLayoutCache,
  getProjectedGraphLayoutProfile,
  getProjectedGraphLayoutCacheStats,
  layoutProjectedGraph,
  layoutProjectedGraphWithRoutes,
  calculateLinearProjectedGraphFallback,
  PROJECTED_GRAPH_LAYOUT_CACHE_PERSIST_MAX_POSITIONS,
  shouldUseSynchronousD3DagFallback,
  restoreProjectedGraphLayoutCache,
  serializeProjectedGraphLayoutCache
} from '../src/revisionGraph/layout/layeredLayout';
import { calculateD3DagSugiyamaLayoutInWorker } from '../src/revisionGraph/layout/d3DagSugiyamaLayoutWorkerHost';
import { selectD3DagSugiyamaLayoutProfile } from '../src/revisionGraph/layout/d3DagSugiyamaLayout';
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

test('NUL-framed graph log preserves record and field separator characters in subjects', () => {
  const subject = 'Keep \u001e record and \u001f field markers';
  const commits = parseRevisionGraphLog(
    `\x00aaa111\x00bbb222\x00Ada\x002026-06-27\x00${subject}\x00HEAD -> main`
    + '\x00bbb222\x00\x00Linus\x002026-06-26\x00Base\x00'
  );

  assert.equal(commits.length, 2);
  assert.equal(commits[0].subject, subject);
  assert.equal(commits[1].hash, 'bbb222');
});

test('parses decoration labels by type', () => {
  assert.deepEqual(parseDecorationRefs('HEAD -> main, refs/stash, tag: v2.0.0, origin/feature/demo, feature/teste03, task/1-new-task, release'), [
    { name: 'main', kind: 'head' },
    { name: 'stash', kind: 'stash' },
    { name: 'v2.0.0', kind: 'tag' },
    { name: 'origin/feature/demo', kind: 'remote' },
    { name: 'feature/teste03', kind: 'branch' },
    { name: 'task/1-new-task', kind: 'branch' },
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
      '--date=iso-strict',
      '--max-count=6000',
      '--pretty=format:%x00%H%x00%P%x00%an%x00%ad%x00%s%x00%D'
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
      showMergeCommits: false,
      showCurrentBranchDescendants: false,
      revisionRange: undefined,
      descendantFocus: undefined
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
      '--date=iso-strict',
      '--max-count=12000',
      '--pretty=format:%x00%H%x00%P%x00%an%x00%ad%x00%s%x00%D'
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
      '--date=iso-strict',
      '--max-count=51',
      '--skip=100',
      '--pretty=format:%x00%H%x00%P%x00%an%x00%ad%x00%D%x00%s%x00%b',
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
      '--date=iso-strict',
      '--max-count=51',
      '--skip=0',
      '--pretty=format:%x00%H%x00%P%x00%an%x00%ad%x00%D%x00%s%x00%b',
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
      '--date=iso-strict',
      '--max-count=51',
      '--skip=0',
      '--pretty=format:%x00%H%x00%P%x00%an%x00%ad%x00%D%x00%s%x00%b',
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
      '--date=iso-strict',
      '--max-count=51',
      '--skip=0',
      '--pretty=format:%x00%H%x00%P%x00%an%x00%ad%x00%D%x00%s%x00%b',
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

test('NUL-framed show log preserves record and field separator characters in commit text', () => {
  const subject = 'Subject \u001e and \u001f';
  const body = 'Body \u001f remains intact\nSecond \u001e line';
  const entries = parseRevisionLogEntries(
    `\x00aaa111\x00\x00Ada\x002026-06-27\x00HEAD -> main\x00${subject}\x00${body}`
    + '\n 1 file changed, 1 insertion(+)'
  );

  assert.equal(entries.length, 1);
  assert.equal(entries[0].subject, subject);
  assert.equal(entries[0].message, `${subject}\n\n${body}`);
  assert.deepEqual(entries[0].shortStat, { files: 1, insertions: 1, deletions: 0 });
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

  const projection = projectMajorOperationsGraph(graph);

  assert.deepEqual(projection.nodes.map((node) => node.hash), ['m1', 'a1', 'b1']);
  assert.deepEqual(
    projection.edges.map((edge) => ({ from: edge.from, to: edge.to, through: edge.through })),
    [
      { from: 'm1', to: 'a1', through: ['x1'] },
      { from: 'm1', to: 'b1', through: [] }
    ]
  );
});

test('hides unreferenced merge commits by default while preserving merge edges', () => {
  const graph = buildCommitGraph([
    { hash: 'head1', parents: ['merge1'], author: 'Ada', date: '2026-04-08', subject: 'Head tip', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'merge1', parents: ['base1', 'topic1'], author: 'Ada', date: '2026-04-07', subject: 'Hidden merge', refs: [] },
    { hash: 'topic1', parents: ['base1'], author: 'Ada', date: '2026-04-06', subject: 'Topic tip', refs: [{ name: 'origin/topic/demo', kind: 'remote' }] },
    { hash: 'base1', parents: [], author: 'Ada', date: '2026-04-05', subject: 'Base', refs: [{ name: 'v1.0.0', kind: 'tag' }] }
  ]);

  const projection = projectMajorOperationsGraph(graph);

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

test('shows merge commits when the merge commit view option is enabled', () => {
  const graph = buildCommitGraph([
    { hash: 'head1', parents: ['merge1'], author: 'Ada', date: '2026-04-08', subject: 'Head tip', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'merge1', parents: ['base1', 'topic1'], author: 'Ada', date: '2026-04-07', subject: 'Visible merge', refs: [] },
    { hash: 'topic1', parents: ['base1'], author: 'Ada', date: '2026-04-06', subject: 'Topic tip', refs: [{ name: 'origin/topic/demo', kind: 'remote' }] },
    { hash: 'base1', parents: [], author: 'Ada', date: '2026-04-05', subject: 'Base', refs: [{ name: 'v1.0.0', kind: 'tag' }] }
  ]);

  const projection = projectMajorOperationsGraph(graph, {
    ...createDefaultRevisionGraphProjectionOptions(),
    showMergeCommits: true
  });

  assert.deepEqual(projection.nodes.map((node) => node.hash), ['head1', 'merge1', 'topic1', 'base1']);
});

test('keeps sync merges in git-simplified major-operations graphs when merge commits are shown', () => {
  const graph = buildCommitGraphWithSimplification([
    { hash: 'rel2501', parents: ['sync2491'], author: 'Ada', date: '2026-04-08', subject: 'Git 2.50.1', refs: [{ name: 'v2.50.1', kind: 'tag' }] },
    { hash: 'sync2491', parents: ['rel2500', 'rel2491'], author: 'Ada', date: '2026-04-07', subject: 'Sync with 2.49.1', refs: [] },
    { hash: 'rel2500', parents: [], author: 'Ada', date: '2026-04-06', subject: 'Git 2.50.0', refs: [{ name: 'v2.50.0', kind: 'tag' }] },
    { hash: 'rel2491', parents: ['sync2482'], author: 'Ada', date: '2026-04-05', subject: 'Git 2.49.1', refs: [{ name: 'v2.49.1', kind: 'tag' }] },
    { hash: 'sync2482', parents: ['rel2490', 'rel2482'], author: 'Ada', date: '2026-04-04', subject: 'Sync with 2.48.2', refs: [] },
    { hash: 'rel2490', parents: [], author: 'Ada', date: '2026-04-03', subject: 'Git 2.49.0', refs: [{ name: 'v2.49.0', kind: 'tag' }] },
    { hash: 'rel2482', parents: [], author: 'Ada', date: '2026-04-02', subject: 'Git 2.48.2', refs: [{ name: 'v2.48.2', kind: 'tag' }] }
  ], 'git-decoration');

  const projection = projectMajorOperationsGraph(graph, {
    ...createDefaultRevisionGraphProjectionOptions(),
    showMergeCommits: true
  });

  assert.deepEqual(
    projection.nodes.map((node) => node.hash),
    ['rel2501', 'sync2491', 'rel2500', 'rel2491', 'sync2482', 'rel2490', 'rel2482']
  );
  assert.deepEqual(
    projection.edges.map((edge) => ({ from: edge.from, to: edge.to, through: edge.through })),
    [
      { from: 'rel2501', to: 'sync2491', through: [] },
      { from: 'sync2491', to: 'rel2500', through: [] },
      { from: 'sync2491', to: 'rel2491', through: [] },
      { from: 'rel2491', to: 'sync2482', through: [] },
      { from: 'sync2482', to: 'rel2490', through: [] },
      { from: 'sync2482', to: 'rel2482', through: [] }
    ]
  );
});

test('rewrites linear unlabeled commits on git-simplified graphs when tags are hidden', () => {
  const graph = buildCommitGraphWithSimplification([
    { hash: 'head1', parents: ['mid1'], author: 'Ada', date: '2026-04-08', subject: 'Head tip', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'mid1', parents: ['branch1'], author: 'Ada', date: '2026-04-07', subject: 'Linear unlabeled', refs: [] },
    { hash: 'branch1', parents: [], author: 'Ada', date: '2026-04-06', subject: 'Branch tip', refs: [{ name: 'origin/topic/demo', kind: 'remote' }] }
  ], 'git-decoration');

  const projection = projectMajorOperationsGraph(graph, {
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

test('projects a major-operations graph with critical commits and compressed linear paths', () => {
  const graph = buildCommitGraph([
    { hash: 'head1', parents: ['merge1'], author: 'Ada', date: '2026-05-08', subject: 'Head tip', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'merge1', parents: ['linear2', 'topic1'], author: 'Ada', date: '2026-05-07', subject: 'Merge topic', refs: [] },
    { hash: 'linear2', parents: ['fork1'], author: 'Ada', date: '2026-05-06', subject: 'Linear mainline', refs: [] },
    { hash: 'topic1', parents: ['fork1'], author: 'Ada', date: '2026-05-05', subject: 'Topic tip', refs: [{ name: 'feature/topic', kind: 'branch' }] },
    { hash: 'fork1', parents: ['linear1'], author: 'Ada', date: '2026-05-04', subject: 'Fork point', refs: [] },
    { hash: 'linear1', parents: ['root1'], author: 'Ada', date: '2026-05-03', subject: 'Linear base', refs: [] },
    { hash: 'root1', parents: [], author: 'Ada', date: '2026-05-02', subject: 'Root', refs: [] }
  ]);

  const projection = projectMajorOperationsGraph(graph, {
    ...createDefaultRevisionGraphProjectionOptions(),
    showMergeCommits: true
  });

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

test('uses the d3-dag Sugiyama layout for the major-operations projection', async () => {
  const graph = buildCommitGraph([
    { hash: 'head1', parents: ['merge1'], author: 'Ada', date: '2026-05-08', subject: 'Head tip', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'merge1', parents: ['base1', 'topic1'], author: 'Ada', date: '2026-05-07', subject: 'Merge topic', refs: [] },
    { hash: 'topic1', parents: ['base1'], author: 'Ada', date: '2026-05-06', subject: 'Topic tip', refs: [{ name: 'feature/topic', kind: 'branch' }] },
    { hash: 'base1', parents: [], author: 'Ada', date: '2026-05-05', subject: 'Base', refs: [] }
  ]);
  const projection = projectMajorOperationsGraph(graph, {
    ...createDefaultRevisionGraphProjectionOptions(),
    showMergeCommits: true
  });
  const scene = await buildRevisionGraphScene(graph, projection);
  const rowByHash = new Map(scene.nodes.map((node) => [node.hash, node.row] as const));

  for (const edge of scene.edges) {
    assert.ok(
      (rowByHash.get(edge.from) ?? 0) < (rowByHash.get(edge.to) ?? 0),
      `${edge.from} should render above ${edge.to}`
    );
  }
  assert.equal(scene.nodes.length, 4);
  assert.equal(scene.edges.length, 4);
  assert.match(buildProjectedGraphLayoutCacheKey(projection), /^d3-dag-sugiyama-v5-bounded-fallback:/);
});

test('calculates d3-dag Sugiyama layout in a worker thread', async () => {
  const graph = buildCommitGraph([
    { hash: 'head1', parents: ['base1'], author: 'Ada', date: '2026-05-08', subject: 'Head tip', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'base1', parents: [], author: 'Ada', date: '2026-05-07', subject: 'Base', refs: [] }
  ]);
  const projection = projectMajorOperationsGraph(graph);

  const result = await calculateD3DagSugiyamaLayoutInWorker({
    nodes: projection.nodes,
    edges: projection.edges
  });

  assert.equal(result.profile, 'balanced');
  assert.equal(result.positions.size, projection.nodes.length);
  assert.ok(result.positions.has('head1'));
  assert.ok(result.positions.has('base1'));
  assert.equal(result.edgeRoutes.size, projection.edges.length);
  assert.ok(result.edgeRoutes.has('head1->base1'));
});

test('selects adaptive d3-dag Sugiyama layout profiles by projected graph shape', () => {
  const smallProjection = createLinearProjectedGraph(12);
  const largeProjection = createLinearProjectedGraph(800);
  const wideProjection = createWideProjectedGraph(301);

  assert.equal(selectD3DagSugiyamaLayoutProfile(smallProjection), 'balanced');
  assert.equal(selectD3DagSugiyamaLayoutProfile(largeProjection), 'fast-two-layer');
  assert.equal(selectD3DagSugiyamaLayoutProfile(wideProjection), 'dfs-wide');
});

test('bounds synchronous d3-dag failure fallback and provides deterministic linear layout', () => {
  const smallProjection = createLinearProjectedGraph(200);
  const largeProjection = createLinearProjectedGraph(201);

  assert.equal(shouldUseSynchronousD3DagFallback(smallProjection), true);
  assert.equal(shouldUseSynchronousD3DagFallback(largeProjection), false);

  const first = calculateLinearProjectedGraphFallback(largeProjection);
  const second = calculateLinearProjectedGraphFallback(largeProjection);
  assert.deepEqual([...first.positions], [...second.positions]);
  assert.equal(first.positions.size, largeProjection.nodes.length);
  assert.equal(first.edgeRoutes.size, 0);
});

test('includes adaptive d3-dag layout profile in cache identity', () => {
  const balancedProjection = createLinearProjectedGraph(12);
  const fastProjection = createLinearProjectedGraph(800);

  assert.equal(getProjectedGraphLayoutProfile(balancedProjection), 'balanced');
  assert.equal(getProjectedGraphLayoutProfile(fastProjection), 'fast-two-layer');
  assert.match(buildProjectedGraphLayoutCacheKey(balancedProjection), /^d3-dag-sugiyama-v5-bounded-fallback:/);
  assert.match(buildProjectedGraphLayoutCacheKey(fastProjection), /^d3-dag-sugiyama-v5-bounded-fallback:/);
  assert.notEqual(
    buildProjectedGraphLayoutCacheKey(balancedProjection),
    buildProjectedGraphLayoutCacheKey(fastProjection)
  );
});

test('preserves d3-dag edge route points for edges spanning multiple layers', async () => {
  const projection: ProjectedGraph = {
    sourceGraph: buildCommitGraph([]),
    nodes: [
      { hash: 'head', author: 'Ada', date: '2026-06-24', subject: 'Head', refs: [{ name: 'main', kind: 'head' }], isBoundary: false },
      { hash: 'mid', author: 'Ada', date: '2026-06-23', subject: 'Middle', refs: [], isBoundary: false },
      { hash: 'base', author: 'Ada', date: '2026-06-22', subject: 'Base', refs: [{ name: 'v1.0.0', kind: 'tag' }], isBoundary: false }
    ],
    edges: [
      { from: 'head', to: 'mid', through: [] },
      { from: 'mid', to: 'base', through: [] },
      { from: 'head', to: 'base', through: [] }
    ],
    visibleHashes: new Set(['head', 'mid', 'base'])
  };

  clearProjectedGraphLayoutCache();
  const layout = await layoutProjectedGraphWithRoutes(projection);
  const route = layout.edgeRoutes.get('head->base');
  const scene = await buildRevisionGraphScene(projection.sourceGraph, projection);

  assert.ok(route);
  assert.ok((route?.points.length ?? 0) > 2);
  assert.deepEqual(
    scene.edges.find((edge) => edge.from === 'head' && edge.to === 'base')?.route,
    route?.points
  );
});

test('builds a scene from the refs-only projected graph while preserving merge edges', async () => {
  const graph = buildCommitGraph([
    { hash: 'm1', parents: ['x1', 'b1'], author: 'Ada', date: '2026-04-07', subject: 'Merge', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'x1', parents: ['a1'], author: 'Ada', date: '2026-04-06', subject: 'Mainline commit', refs: [] },
    { hash: 'a1', parents: [], author: 'Ada', date: '2026-04-05', subject: 'Release', refs: [{ name: 'v1.0.0', kind: 'tag' }] },
    { hash: 'b1', parents: [], author: 'Ada', date: '2026-04-04', subject: 'Topic tip', refs: [{ name: 'origin/feature/demo', kind: 'remote' }] }
  ]);

  const projection = projectMajorOperationsGraph(graph);
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
  const events: Array<{ readonly phase: string; readonly detail?: string }> = [];
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
  assert.ok(events.some((event) =>
    event.phase === 'scene.layout.d3DagSugiyama' &&
    event.detail?.includes('profile=balanced')
  ));
  assert.ok(events.some((event) => event.phase === 'scene.total'));
});

test('reuses cached d3-dag layout positions for the same projected graph topology', async () => {
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
  const projection = projectMajorOperationsGraph(graph);

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

test('uses the d3-dag layout cache namespace', () => {
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

  const projection = projectMajorOperationsGraph(graph);

  assert.match(buildProjectedGraphLayoutCacheKey(projection), /^d3-dag-sugiyama-v5-bounded-fallback:/);
});

test('layout cache key includes ref metadata used by d3-dag placement', async () => {
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
  assert.equal(branchAPositions.size, 3);
  assert.equal(branchBPositions.size, 3);
});

test('places side descendants on the same layer as their mainline sibling descendant', async () => {
  const graph = buildCommitGraph([
    { hash: 'head1', parents: ['mainChild'], author: 'Ada', date: '2026-05-23', subject: 'Head', refs: [{ name: 'master', kind: 'head' }] },
    { hash: 'mainChild', parents: ['base1'], author: 'Ada', date: '2026-05-22', subject: 'Main child', refs: [{ name: 'REL_2.14.0.0_EXTERNAL', kind: 'tag' }] },
    { hash: 'sideChild', parents: ['base1'], author: 'Ada', date: '2026-05-21', subject: 'Side child', refs: [{ name: 'origin/side', kind: 'remote' }] },
    { hash: 'base1', parents: [], author: 'Ada', date: '2026-05-20', subject: 'Base', refs: [{ name: 'REL_2.13.0.0_EXTERNAL', kind: 'tag' }] }
  ]);
  const projection = projectMajorOperationsGraph(graph);

  const scene = await buildRevisionGraphScene(graph, projection);
  const mainChild = scene.nodes.find((node) => node.hash === 'mainChild');
  const sideChild = scene.nodes.find((node) => node.hash === 'sideChild');

  assert.ok(mainChild);
  assert.ok(sideChild);
  assert.equal(sideChild?.row, mainChild?.row);
  assert.notEqual(sideChild?.x, mainChild?.x);
});

test('keeps projected descendants above every visible parent in the d3-dag layout', async () => {
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

test('restores serialized d3-dag layout cache entries across extension sessions', async () => {
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
  const projection = projectMajorOperationsGraph(graph);

  const firstScene = await buildRevisionGraphScene(graph, projection);
  const serializedCache = serializeProjectedGraphLayoutCache();
  clearProjectedGraphLayoutCache();
  restoreProjectedGraphLayoutCache(serializedCache);
  const restoredStats = getProjectedGraphLayoutCacheStats();
  const restoredScene = await buildRevisionGraphScene(graph, projection);
  const afterRestoredLayout = getProjectedGraphLayoutCacheStats();

  assert.equal(serializedCache.length, 1);
  assert.ok(serializedCache[0].edgeRoutes);
  assert.ok((serializedCache[0].edgeRoutes?.length ?? 0) > 0);
  assert.equal(restoredStats.entries, 1);
  assert.equal(restoredStats.hits, 0);
  assert.equal(restoredStats.misses, 0);
  assert.deepEqual(
    restoredScene.nodes.map((node) => ({ hash: node.hash, row: node.row, lane: node.lane, x: node.x })),
    firstScene.nodes.map((node) => ({ hash: node.hash, row: node.row, lane: node.lane, x: node.x }))
  );
  assert.deepEqual(restoredScene.edges, firstScene.edges);
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
      key: 'd3-dag-sugiyama-v4:oversized',
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

  const projection = projectMajorOperationsGraph(graph);
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

  const projection = projectMajorOperationsGraph(graph);
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

  const projection = projectMajorOperationsGraph(graph);
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
      '--date=iso-strict',
      '--max-count=6000',
      '--pretty=format:%x00%H%x00%P%x00%an%x00%ad%x00%s%x00%D'
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
      '--date=iso-strict',
      '--max-count=6000',
      '--pretty=format:%x00%H%x00%P%x00%an%x00%ad%x00%s%x00%D'
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
      '--date=iso-strict',
      '--max-count=6000',
      '--pretty=format:%x00%H%x00%P%x00%an%x00%ad%x00%s%x00%D'
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

  const projection = projectMajorOperationsGraph(graph, {
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

  const projection = projectMajorOperationsGraph(graph, {
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

  const projection = projectMajorOperationsGraph(graph, {
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

  const projection = projectMajorOperationsGraph(graph, {
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

  const projection = projectMajorOperationsGraph(graph, {
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

  const projection = projectMajorOperationsGraph(graph, {
    ...createDefaultRevisionGraphProjectionOptions(),
    refScope: 'local'
  });

  assert.deepEqual(projection.nodes.map((node) => node.hash), ['head1', 'feature1', 'base1']);
});

test('can focus the projection on a selected revision range', () => {
  const graph = buildCommitGraph([
    { hash: 'topic3', parents: ['topic2'], author: 'Ada', date: '2026-04-10', subject: 'Topic tip', refs: [{ name: 'feature/range', kind: 'branch' }] },
    { hash: 'topic2', parents: ['topic1'], author: 'Ada', date: '2026-04-09', subject: 'Topic work 2', refs: [] },
    { hash: 'topic1', parents: ['base1'], author: 'Ada', date: '2026-04-08', subject: 'Topic work 1', refs: [] },
    { hash: 'sibling1', parents: ['base1'], author: 'Ada', date: '2026-04-08', subject: 'Sibling', refs: [{ name: 'feature/sibling', kind: 'branch' }] },
    { hash: 'base1', parents: ['root1'], author: 'Ada', date: '2026-04-07', subject: 'Base', refs: [{ name: 'v1.0.0', kind: 'tag' }] },
    { hash: 'root1', parents: [], author: 'Ada', date: '2026-04-06', subject: 'Root', refs: [] }
  ]);

  const projection = projectMajorOperationsGraph(graph, {
    ...createDefaultRevisionGraphProjectionOptions(),
    revisionRange: {
      baseRevision: 'base1',
      baseLabel: 'v1.0.0',
      compareRevision: 'feature/range',
      compareLabel: 'feature/range'
    }
  });

  assert.deepEqual(projection.nodes.map((node) => node.hash), ['topic3', 'base1']);
  assert.deepEqual(projection.edges, [
    { from: 'topic3', to: 'base1', through: ['topic2', 'topic1'] }
  ]);
});

test('can focus the projection on all loaded descendants of one revision', () => {
  const graph = buildCommitGraph([
    { hash: 'main2', parents: ['main1'], author: 'Ada', date: '2026-04-12', subject: 'Main tip', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'feature2', parents: ['feature1'], author: 'Ada', date: '2026-04-11', subject: 'Feature tip', refs: [{ name: 'feature/demo', kind: 'branch' }] },
    { hash: 'unrelated2', parents: ['unrelated1'], author: 'Ada', date: '2026-04-10', subject: 'Unrelated tip', refs: [{ name: 'release/legacy', kind: 'branch' }] },
    { hash: 'main1', parents: ['anchor1'], author: 'Ada', date: '2026-04-09', subject: 'Main work', refs: [] },
    { hash: 'feature1', parents: ['anchor1'], author: 'Ada', date: '2026-04-08', subject: 'Feature work', refs: [] },
    { hash: 'unrelated1', parents: ['root1'], author: 'Ada', date: '2026-04-07', subject: 'Unrelated work', refs: [] },
    { hash: 'anchor1', parents: ['root1'], author: 'Ada', date: '2026-04-06', subject: 'Anchor', refs: [{ name: 'v1.5.4', kind: 'tag' }] },
    { hash: 'root1', parents: [], author: 'Ada', date: '2026-04-05', subject: 'Root', refs: [] }
  ]);

  const projection = projectMajorOperationsGraph(graph, {
    ...createDefaultRevisionGraphProjectionOptions(),
    descendantFocus: {
      anchorRevision: 'v1.5.4',
      anchorLabel: 'v1.5.4'
    }
  });

  assert.deepEqual(projection.nodes.map((node) => node.hash), ['main2', 'feature2', 'anchor1']);
  assert.deepEqual(projection.edges, [
    { from: 'main2', to: 'anchor1', through: ['main1'] },
    { from: 'feature2', to: 'anchor1', through: ['feature1'] }
  ]);
});

test('does not broaden descendant focus when its anchor cannot be resolved', () => {
  const graph = buildCommitGraph([
    { hash: 'head1', parents: ['root1'], author: 'Ada', date: '2026-04-07', subject: 'Head', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'root1', parents: [], author: 'Ada', date: '2026-04-06', subject: 'Root', refs: [] }
  ]);

  const projection = projectMajorOperationsGraph(graph, {
    ...createDefaultRevisionGraphProjectionOptions(),
    descendantFocus: {
      anchorRevision: 'missing',
      anchorLabel: 'missing'
    }
  });

  assert.deepEqual(projection.nodes, []);
  assert.deepEqual(projection.edges, []);
});

test('can hide tag refs and tag-only commits from the projection', () => {
  const graph = buildCommitGraph([
    { hash: 'head1', parents: ['base1'], author: 'Ada', date: '2026-04-07', subject: 'Current head', refs: [{ name: 'main', kind: 'head' }, { name: 'v2.0.0', kind: 'tag' }] },
    { hash: 'tagonly1', parents: ['base1'], author: 'Ada', date: '2026-04-06', subject: 'Release tag', refs: [{ name: 'v1.0.0', kind: 'tag' }] },
    { hash: 'base1', parents: [], author: 'Ada', date: '2026-04-05', subject: 'Base', refs: [] }
  ]);

  const projection = projectMajorOperationsGraph(graph, {
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

  const projection = projectMajorOperationsGraph(graph, {
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

test('preserves hidden path continuity across branch, merge, tag, remote, and stash refs', () => {
  const graph = buildCommitGraph([
    { hash: 'headTip', parents: ['merge1'], author: 'Ada', date: '2026-07-01', subject: 'Main tip', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'stashTip', parents: ['stashWork'], author: 'Ada', date: '2026-07-01', subject: 'Stashed work', refs: [{ name: 'stash', kind: 'stash' }] },
    { hash: 'merge1', parents: ['mainMid', 'topicTip'], author: 'Ada', date: '2026-06-30', subject: 'Merge topic', refs: [] },
    { hash: 'mainMid', parents: ['releaseTag'], author: 'Ada', date: '2026-06-29', subject: 'Mainline work', refs: [] },
    { hash: 'topicTip', parents: ['topicMid'], author: 'Ada', date: '2026-06-28', subject: 'Topic tip', refs: [{ name: 'feature/demo', kind: 'branch' }] },
    { hash: 'topicMid', parents: ['releaseTag'], author: 'Ada', date: '2026-06-27', subject: 'Topic work', refs: [] },
    { hash: 'stashWork', parents: ['releaseTag'], author: 'Ada', date: '2026-06-26', subject: 'Hidden stash base', refs: [] },
    { hash: 'remoteTip', parents: ['releaseTag'], author: 'Ada', date: '2026-06-25', subject: 'Remote tip', refs: [{ name: 'origin/release/1.5', kind: 'remote' }] },
    { hash: 'releaseTag', parents: ['root1'], author: 'Ada', date: '2026-06-24', subject: 'Release tag', refs: [{ name: 'v1.5.5', kind: 'tag' }] },
    { hash: 'root1', parents: [], author: 'Ada', date: '2026-06-23', subject: 'Root', refs: [] }
  ]);

  const projection = projectMajorOperationsGraph(graph);

  assert.deepEqual(
    projection.nodes.map((node) => ({ hash: node.hash, refs: node.refs.map((ref) => ref.kind) })),
    [
      { hash: 'headTip', refs: ['head'] },
      { hash: 'stashTip', refs: ['stash'] },
      { hash: 'topicTip', refs: ['branch'] },
      { hash: 'remoteTip', refs: ['remote'] },
      { hash: 'releaseTag', refs: ['tag'] },
      { hash: 'root1', refs: [] }
    ]
  );
  assert.deepEqual(
    projection.edges.map((edge) => ({ from: edge.from, to: edge.to, through: edge.through })),
    [
      { from: 'headTip', to: 'releaseTag', through: ['merge1', 'mainMid'] },
      { from: 'headTip', to: 'topicTip', through: ['merge1'] },
      { from: 'stashTip', to: 'releaseTag', through: ['stashWork'] },
      { from: 'topicTip', to: 'releaseTag', through: ['topicMid'] },
      { from: 'remoteTip', to: 'releaseTag', through: [] },
      { from: 'releaseTag', to: 'root1', through: [] }
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
  const projection = projectMajorOperationsGraph(graph);
  const scene = await buildRevisionGraphScene(graph, projection);

  assert.deepEqual(buildPrimaryAncestorNextByHash(graph, scene), {
    m1: 'b1',
    s1: 'b1'
  });
});

function createLinearProjectedGraph(nodeCount: number): ProjectedGraph {
  const nodes = Array.from({ length: nodeCount }, (_, index) => ({
    hash: `linear-${index}`,
    author: 'Ada',
    date: '2026-06-24',
    subject: `Linear ${index}`,
    refs: index === nodeCount - 1 ? [{ name: 'main', kind: 'head' as const }] : [],
    isBoundary: false
  }));

  return {
    sourceGraph: buildCommitGraph([]),
    nodes,
    edges: nodes.slice(1).map((node, index) => ({
      from: node.hash,
      to: nodes[index].hash,
      through: []
    })),
    visibleHashes: new Set(nodes.map((node) => node.hash))
  };
}

function createWideProjectedGraph(width: number): ProjectedGraph {
  const root = {
    hash: 'wide-root',
    author: 'Ada',
    date: '2026-06-24',
    subject: 'Wide root',
    refs: [{ name: 'v1.0.0', kind: 'tag' as const }],
    isBoundary: false
  };
  const tips = Array.from({ length: width }, (_, index) => ({
    hash: `wide-tip-${index}`,
    author: 'Ada',
    date: '2026-06-24',
    subject: `Wide tip ${index}`,
    refs: [{ name: `origin/wide-${index}`, kind: 'remote' as const }],
    isBoundary: false
  }));
  const nodes = [...tips, root];

  return {
    sourceGraph: buildCommitGraph([]),
    nodes,
    edges: tips.map((tip) => ({
      from: tip.hash,
      to: root.hash,
      through: []
    })),
    visibleHashes: new Set(nodes.map((node) => node.hash))
  };
}
