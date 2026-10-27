import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { writeCommitPatchFiles } from '../src/patches/files';

async function folder(t: test.TestContext): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'grg-export-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
const files = ['a', 'b'].map((char, index) => ({ name: `000${index + 1}-${char.repeat(12)}.patch`, bytes: Buffer.from(char) }));

test('commit patches are separate files with exact bytes', async t => {
  const root = await folder(t);
  await writeCommitPatchFiles(root, files, () => true);
  assert.deepEqual((await fs.readdir(root)).sort(), files.map(file => file.name));
  for (const file of files) assert.deepEqual(await fs.readFile(path.join(root, file.name)), file.bytes);
});

test('batch export never overwrites existing files and cleans up its own partial output', async t => {
  const root = await folder(t), existing = path.join(root, files[1].name);
  await fs.writeFile(existing, 'user patch');
  await assert.rejects(writeCommitPatchFiles(root, files, () => true), /EEXIST/);
  assert.deepEqual(await fs.readdir(root), [files[1].name]);
  assert.equal(await fs.readFile(existing, 'utf8'), 'user patch');
});

test('stale batch export cleans up after cancellation between writes and after the final write', async t => {
  for (const staleAfter of [0, 1, 2]) {
    const root = await folder(t); let checks = 0;
    await writeCommitPatchFiles(root, files, () => checks++ < staleAfter);
    assert.deepEqual(await fs.readdir(root), []);
  }
});

test('batch file names cannot escape the selected directory', async t => {
  const root = await folder(t);
  await assert.rejects(writeCommitPatchFiles(root, [{ name: '../escape.patch', bytes: Buffer.from('x') }], () => true), /filename/);
  assert.deepEqual(await fs.readdir(root), []);
});
