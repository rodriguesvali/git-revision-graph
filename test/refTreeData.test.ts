import test from 'node:test';
import assert from 'node:assert/strict';

import { RefType } from '../src/git';
import { getCategoryChildren, getRootNodes, getViewMessage } from '../src/legacy/refTreeData';
import { createApi, createRef, createRepository } from './fakes';

test('shows empty state message when no repositories are open', () => {
  const api = createApi([]);

  assert.equal(getViewMessage(api), 'Open a Workspace with a Git Repository to View References.');
  assert.deepEqual(getRootNodes(api), []);
});

test('returns repository nodes for multi-repository workspaces in sorted order', () => {
  const repoB = createRepository({ root: '/workspace/b' });
  const repoA = createRepository({ root: '/workspace/a' });
  const nodes = getRootNodes(createApi([repoB, repoA]));

  assert.deepEqual(
    nodes.map((node) => ('repository' in node ? node.repository.rootUri.fsPath : '')),
    ['/workspace/a', '/workspace/b']
  );
});

test('groups refs by category and remote in sorted order', async () => {
  const repository = createRepository({
    root: '/workspace/repo',
    refs: [
      createRef({ type: RefType.Tag, name: 'v2.0.0' }),
      createRef({ type: RefType.Head, name: 'zeta' }),
      createRef({ type: RefType.RemoteHead, remote: 'upstream', name: 'upstream/main' }),
      createRef({ type: RefType.RemoteHead, remote: 'origin', name: 'origin/feature/demo' }),
      createRef({ type: RefType.Head, name: 'alpha' }),
      createRef({ type: RefType.Tag, name: 'v1.0.0' })
    ]
  });

  const branchNodes = await getCategoryChildren(repository, 'branches');
  const tagNodes = await getCategoryChildren(repository, 'tags');
  const remoteNodes = await getCategoryChildren(repository, 'remotes');

  assert.deepEqual(branchNodes.map((node) => node.kind === 'ref' ? node.ref.name : ''), ['alpha', 'zeta']);
  assert.deepEqual(tagNodes.map((node) => node.kind === 'ref' ? node.ref.name : ''), ['v1.0.0', 'v2.0.0']);
  assert.deepEqual(remoteNodes.map((node) => node.kind === 'remote' ? node.remote : ''), ['origin', 'upstream']);
});
