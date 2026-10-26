import test from 'node:test';
import assert from 'node:assert/strict';
import { openFileTarget, type FileOpenServices } from '../src/fileOpen';
import { getTargetUri } from '../src/changePresentation';
import { createChange, createRepository } from './fakes';

function harness(available = true) {
  const opened: string[] = [];
  const services: FileOpenServices = {
    async isAvailable() { return available; },
    async openWorktree(uri) { opened.push(uri.fsPath); },
    async openRevision(_repo, uri, revision) { opened.push(`${revision}:${uri.fsPath}`); }
  };
  return { opened, services };
}

test('Open File opens the exact renamed worktree path without Git mutations', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const change = createChange({ uriPath: '/workspace/repo/old.ts', renamePath: '/workspace/repo/new.ts' });
  const h = harness();
  await openFileTarget(repository, { uri: getTargetUri(change) }, () => true, h.services);
  assert.deepEqual(h.opened, ['/workspace/repo/new.ts']);
  assert.equal(repository.calls.checkout.length, 0);
});

test('Open File rejects missing and outside paths without creating a file', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const h = harness(false);
  await assert.rejects(openFileTarget(repository, { uri: getTargetUri(createChange({ uriPath: '/workspace/repo/gone.ts' })) }, () => true, h.services), /no longer exists/);
  await assert.rejects(openFileTarget(repository, { uri: getTargetUri(createChange({ uriPath: '/workspace/other/a.ts' })) }, () => true, h.services), /outside/);
  assert.deepEqual(h.opened, []);
});

test('Open File discards an action whose context changes during availability lookup', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const h = harness();
  let current = true;
  h.services.isAvailable = async () => { current = false; return true; };
  await openFileTarget(repository, { uri: getTargetUri(createChange({ uriPath: '/workspace/repo/a.ts' })) }, () => current, h.services);
  assert.deepEqual(h.opened, []);
});

test('historical opening rejects a moving ref and opens only an immutable revision', async () => {
  const repository = createRepository({ root: '/workspace/repo' });
  const uri = getTargetUri(createChange({ uriPath: '/workspace/repo/a.ts' }));
  const h = harness();
  await assert.rejects(openFileTarget(repository, { uri, revision: 'main' }, () => true, h.services), /immutable commit/);
  await openFileTarget(repository, { uri, revision: 'a'.repeat(40) }, () => true, h.services);
  assert.deepEqual(h.opened, [`${'a'.repeat(40)}:/workspace/repo/a.ts`]);
});
