import test from 'node:test';
import assert from 'node:assert/strict';
import { savePatchExport, type PatchExportServices } from '../src/patches/exportWorkflow';
import { saveComparePatch } from '../src/compareResults/patchExport';
import { formatShowLogPatch } from '../src/showLog/patchExport';
import { createRepository, createRevisionLogEntry } from './fakes';
import type { CompareResultsState } from '../src/compareResultsShared';
import type { ShowLogState } from '../src/showLogShared';
import { createHiddenShowLogState } from '../src/showLogShared';
import { PATCH_MAX_BYTES } from '../src/patches/input';
import { ComparisonPatchNames } from '../src/patches/comparisonNames';

function harness() {
  const writes: Uint8Array[] = [];
  const services: PatchExportServices = {
    async suggestComparisonFileName(source, target) { return new ComparisonPatchNames().prepare('/repo', source, target, []).name; },
    async chooseDirectory() { return '/patches'; },
    async writeCommitPatches(_directory, files) { writes.push(...files.map(file => file.bytes)); },
    async chooseDestination() { return '/out.patch'; },
    async writeFile(_destination, bytes) { writes.push(bytes); },
    hasDirtyEditors() { return false; },
    async loadCommit() { return Buffer.from('commit patch'); },
    async loadComparison() { return Buffer.from('all file changes'); }
  };
  return { services, writes };
}

test('export cancellation and context changes never write a patch', async () => {
  for (const point of ['dialog', 'load']) {
    const h = harness(); let current = true;
    if (point === 'dialog') h.services.chooseDestination = async () => { current = false; return '/out.patch'; };
    await savePatchExport('name.patch', async () => { current = false; return Buffer.from('patch'); }, () => current, h.services);
    assert.equal(h.writes.length, 0);
  }
  const h = harness(); h.services.chooseDestination = async () => undefined;
  await savePatchExport('name.patch', async () => { throw new Error('must not load'); }, () => true, h.services);
});

test('Save Patch passes the complete comparison, no selected IDs or filtered paths', async () => {
  const h = harness(); const repository = createRepository({ root: '/repo' });
  const state: CompareResultsState = { kind: 'between', repository,
    left: { refName: 'a'.repeat(40), label: 'source' }, right: { refName: 'b'.repeat(40), label: 'target' }, changes: [] };
  h.services.chooseDestination = async name => { assert.equal(name, 'source-aaaaaaaa-to-target-bbbbbbbb-1.patch'); return '/out.patch'; };
  h.services.loadComparison = async (root, source, target) => {
    assert.equal(root, '/repo'); assert.equal(source, state.left.refName); assert.equal(target, state.right.refName);
    return Buffer.from('complete');
  };
  await saveComparePatch(() => state, h.services);
  assert.equal(Buffer.from(h.writes[0]).toString(), 'complete');
});

test('worktree export refuses unsaved editors instead of silently omitting their contents', async () => {
  const h = harness(); h.services.hasDirtyEditors = () => true;
  const state: CompareResultsState = { kind: 'worktree', repository: createRepository({ root: '/repo' }),
    target: { refName: 'a'.repeat(40), label: 'base' }, changes: [] };
  await assert.rejects(saveComparePatch(() => state, h.services), /save|unsaved/i);
  assert.equal(h.writes.length, 0);
});

test('Show Log exports only a loaded single commit, and rejects stale/loading actions', async () => {
  const h = harness();
  const state: ShowLogState = { ...createHiddenShowLogState(), kind: 'visible', loading: false,
    repository: createRepository({ root: '/repo' }), entries: [createRevisionLogEntry({ hash: 'a'.repeat(40) })] };
  await formatShowLogPatch(() => state, ['a'.repeat(40)], h.services);
  await formatShowLogPatch(() => state, ['b'.repeat(40)], h.services);
  await formatShowLogPatch(() => ({ ...state, loading: true }), ['a'.repeat(40)], h.services);
  assert.equal(h.writes.length, 1);
});

function selectionState(): ShowLogState {
  return { ...createHiddenShowLogState(), kind: 'visible', loading: false,
    repository: createRepository({ root: '/repo' }), entries: ['c', 'b', 'a'].map(char =>
      createRevisionLogEntry({ hash: char.repeat(40), parentHashes: [] })) };
}

test('multi Format Patch exports one numbered file per selected commit, in reverse displayed order', async () => {
  const h = harness(), state = selectionState(), loaded: string[] = [];
  h.services.chooseDestination = async () => { throw new Error('single save must not open'); };
  h.services.loadCommit = async (root, hash) => {
    assert.equal(root, '/repo'); loaded.push(hash); return Buffer.from(hash);
  };
  h.services.writeCommitPatches = async (directory, files, isCurrent) => {
    assert.equal(directory, '/patches'); assert.equal(isCurrent(), true);
    assert.deepEqual(files.map(file => file.name), ['0001-aaaaaaaaaaaa.patch', '0002-cccccccccccc.patch']);
    assert.deepEqual(files.map(file => file.bytes.toString()), ['a'.repeat(40), 'c'.repeat(40)]);
  };
  await formatShowLogPatch(() => state, ['c'.repeat(40), 'a'.repeat(40), 'c'.repeat(40)], h.services);
  assert.deepEqual(loaded, ['a'.repeat(40), 'c'.repeat(40)]);
});

test('multi Format Patch rejects unloaded hashes and merges before opening any dialog', async () => {
  const h = harness(), state = selectionState();
  h.services.chooseDirectory = async () => { throw new Error('must not open'); };
  await formatShowLogPatch(() => state, ['a'.repeat(40), 'd'.repeat(40)], h.services);
  const mergeState = { ...state, entries: [...state.entries, createRevisionLogEntry({ hash: 'd'.repeat(40), parentHashes: ['a', 'b'] })] };
  await assert.rejects(formatShowLogPatch(() => mergeState, ['a'.repeat(40), 'd'.repeat(40)], h.services), /merge/i);
  assert.equal(h.writes.length, 0);
});

test('multi Format Patch cancellation and stale contexts leave no files and stop loading', async () => {
  for (const point of ['cancel', 'dialog', 'load']) {
    const h = harness(); let state = selectionState(), loads = 0;
    const invalidate = () => { state = { ...state }; };
    h.services.chooseDirectory = async () => {
      if (point === 'cancel') return undefined;
      if (point === 'dialog') invalidate();
      return '/patches';
    };
    h.services.loadCommit = async () => { loads++; invalidate(); return Buffer.from('patch'); };
    await formatShowLogPatch(() => state, ['a'.repeat(40), 'c'.repeat(40)], h.services);
    assert.equal(h.writes.length, 0); assert.equal(loads, point === 'load' ? 1 : 0);
  }
});

test('multi Format Patch does not save partial exports on load failure or aggregate size overflow', async () => {
  for (const overflow of [false, true]) {
    const h = harness(), state = selectionState(); let loads = 0;
    h.services.loadCommit = async () => {
      if (++loads === 2 && !overflow) throw new Error('cannot export commit');
      return Buffer.alloc(PATCH_MAX_BYTES / 2 + 1);
    };
    await assert.rejects(formatShowLogPatch(() => state, ['a'.repeat(40), 'c'.repeat(40)], h.services), /export|limit|large/i);
    assert.equal(h.writes.length, 0);
  }
});
