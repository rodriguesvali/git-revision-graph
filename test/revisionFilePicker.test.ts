import test from 'node:test';
import assert from 'node:assert/strict';
import { RevisionFilePicker, type RevisionFilePickerServices } from '../src/revisionGraph/revisionFilePicker';
import { createRepository } from './fakes';

const commit = 'a'.repeat(40);
const repository = createRepository({ root: '/workspace/repo' });
function harness() {
  const opened: string[] = [];
  let signal: AbortSignal | undefined;
  const services: RevisionFilePickerServices = {
    async loadFiles(_root, hash, token) { assert.equal(hash, commit); signal = token; return ['old/file.ts']; },
    async pickFile(files) { return (await files)[0]; },
    async openFile(_repo, file, hash, current) { if (current()) opened.push(hash + ':' + file); }
  };
  return { services, opened, signal: () => signal };
}

test('graph picker opens the pinned historical path without checking out a reference', async () => {
  const h = harness();
  await new RevisionFilePicker(h.services).open(repository, commit, () => true);
  assert.deepEqual(h.opened, [commit + ':old/file.ts']);
  assert.equal(repository.calls.checkout.length, 0);
  assert.equal(h.signal()?.aborted, true);
});

test('Escape and invalid selections never open a file', async () => {
  for (const selected of [undefined, '../outside.ts']) {
    const h = harness(); h.services.pickFile = async () => selected;
    const operation = new RevisionFilePicker(h.services).open(repository, commit, () => true);
    if (selected) await assert.rejects(operation, /selected revision/); else await operation;
    assert.deepEqual(h.opened, []);
  }
});

test('repository switch during selection discards the result', async () => {
  const h = harness(); let current = true;
  h.services.pickFile = async files => { await files; current = false; return 'old/file.ts'; };
  await new RevisionFilePicker(h.services).open(repository, commit, () => current);
  assert.deepEqual(h.opened, []);
});

test('cancel aborts pending loading and suppresses late failures', async () => {
  const h = harness(); const workflow = new RevisionFilePicker(h.services);
  h.services.pickFile = async files => { await files; workflow.cancel(); throw new Error('obsolete load'); };
  await workflow.open(repository, commit, () => true);
  assert.deepEqual(h.opened, []);
  assert.equal(h.signal()?.aborted, true);
});

test('a newer picker cancels the previous one even if its selection arrives late', async () => {
  const h = harness();
  const selections: Array<(value: string | undefined) => void> = [];
  h.services.pickFile = async files => { await files; return new Promise(resolve => selections.push(resolve)); };
  const workflow = new RevisionFilePicker(h.services);
  const first = workflow.open(repository, commit, () => true);
  await Promise.resolve();
  const second = workflow.open(repository, commit, () => true);
  await Promise.resolve();
  selections[0]('old/file.ts'); selections[1]('old/file.ts');
  await Promise.all([first, second]);
  assert.deepEqual(h.opened, [commit + ':old/file.ts']);
});
