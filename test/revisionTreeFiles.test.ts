import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRevisionTreeFiles, parseRevisionTreeFiles } from '../src/revisionGraph/source/revisionTreeFiles';

const hash = 'a'.repeat(40);
test('revision tree preserves unusual file paths and omits gitlinks', () => {
  assert.deepEqual(parseRevisionTreeFiles(`100644 blob ${hash}\tsrc/a b.ts\0` +
    `100755 blob ${hash}\tunicodé/line\nbreak\tfile\0` + `160000 commit ${hash}\tmodule\0`),
    ['src/a b.ts', 'unicodé/line\nbreak\tfile']);
  assert.deepEqual(parseRevisionTreeFiles(''), []);
});

test('tree loader accepts only immutable revisions and sends bounded cancellable args', async () => {
  const controller = new AbortController();
  const files = await loadRevisionTreeFiles('/repo', hash, controller.signal, async (root, args, options) => {
    assert.equal(root, '/repo');
    assert.deepEqual(args, ['ls-tree', '-r', '-z', '--full-tree', hash, '--']);
    assert.equal(options?.signal, controller.signal);
    assert.equal(options?.timeoutMs, 15_000);
    assert.equal(options?.maxOutputBytes, 16 * 1024 * 1024);
    return `100644 blob ${hash}\tfile.txt\0`;
  });
  assert.deepEqual(files, ['file.txt']);
  await assert.rejects(loadRevisionTreeFiles('/repo', '--evil', controller.signal), /immutable/);
});

test('tree parser rejects malformed and escaping paths instead of opening outside the repository', () => {
  for (const value of [`100644 blob ${hash}\t../outside\0`, `100644 blob ${hash}\t/absolute\0`,
    `100644 blob ${hash}\tbad`, 'garbage\0']) assert.throws(() => parseRevisionTreeFiles(value));
});

test('large trees fail explicitly instead of silently omitting files', () => {
  const output = Array.from({ length: 100_001 }, (_, i) => `100644 blob ${hash}\tfile-${i}\0`).join('');
  assert.throws(() => parseRevisionTreeFiles(output), /too many files/);
});
