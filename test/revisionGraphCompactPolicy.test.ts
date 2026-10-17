import assert from 'node:assert/strict';
import { test } from 'node:test';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { RefType } from '../src/git';
import { DefaultRevisionGraphBackend } from '../src/revisionGraph/backend';
import { buildCommitGraph } from '../src/revisionGraph/model/commitGraph';
import { projectMajorOperationsGraph } from '../src/revisionGraph/projection/graphProjection';
import { createDefaultRevisionGraphProjectionOptions } from '../src/revisionGraphTypes';
import { createBisectFixture } from './bugBisectFixture';
import { createRepository } from './fakes';

test('real Git compact loading preserves refs and ancestry while compressing an unlabeled merge', async () => {
  const f = await createBisectFixture();
  try {
    await f.git('checkout', '-b', 'topic', f.hashes[2]);
    await writeFile(join(f.root, 'topic.txt'), 'topic');
    await f.git('add', '--', 'topic.txt'); await f.git('commit', '-m', 'topic');
    await f.git('checkout', 'main');
    await f.git('tag', 'main-parent', f.hashes[6]);
    await f.git('merge', '--no-ff', '-m', 'integration', 'topic');
    const merge = (await f.engine.head()).hash;
    await writeFile(join(f.root, 'after.txt'), 'after');
    await f.git('add', '--', 'after.txt'); await f.git('commit', '-m', 'after');
    const head = (await f.engine.head()).hash;
    const repository = createRepository({ root: f.root, head: { type: RefType.Head, name: 'main', commit: head } });
    const backend = new DefaultRevisionGraphBackend();
    const options = createDefaultRevisionGraphProjectionOptions();
    const policy = { initialLimit: 100, steppedLimits: [], minVisibleNodes: 0, graphCommandTimeoutMs: 60_000 };
    const snapshot = await backend.loadGraphSnapshot(repository, options, policy);
    assert.equal(snapshot.graph.commitsByHash.get(merge)?.isBoundary, false, 'The loaded merge must exist before projection');
    const projection = projectMajorOperationsGraph(snapshot.graph, options);
    assert.equal(projection.visibleHashes.has(merge), false);
    assert.ok(projection.edges.some(edge => edge.through.includes(merge)));
    assert.deepEqual(projection.nodes.flatMap(node => node.refs.map(ref => ref.name)).sort(), ['main', 'main-parent', 'topic']);

    await f.git('tag', 'integration-point', merge);
    backend.clearGraphSnapshotCache();
    const referenced = await backend.loadGraphSnapshot(repository, options, policy);
    assert.equal(projectMajorOperationsGraph(referenced.graph, options).visibleHashes.has(merge), true);
    assert.deepEqual(await f.engine.head(), { hash: head, branch: 'refs/heads/main' });
    assert.equal(await f.git('status', '--porcelain=v1'), '');
  } finally { await f.dispose(); }
});

test('automatic compact projection retains an unreferenced merge that is also a fork', () => {
  const graph = buildCommitGraph([
    { hash: 'head', parents: ['merge'], author: '', date: '', subject: '', refs: [{ name: 'main', kind: 'head' }] },
    { hash: 'other', parents: ['merge'], author: '', date: '', subject: '', refs: [{ name: 'other', kind: 'branch' }] },
    { hash: 'merge', parents: ['left', 'right'], author: '', date: '', subject: '', refs: [] },
    { hash: 'left', parents: [], author: '', date: '', subject: '', refs: [] },
    { hash: 'right', parents: [], author: '', date: '', subject: '', refs: [] }
  ]);
  const projection = projectMajorOperationsGraph(graph);
  assert.deepEqual(projection.nodes.map(node => node.hash), ['head', 'other', 'merge', 'left', 'right']);
  assert.deepEqual(projection.edges.map(edge => `${edge.from}->${edge.to}`), ['head->merge', 'other->merge', 'merge->left', 'merge->right']);
});
