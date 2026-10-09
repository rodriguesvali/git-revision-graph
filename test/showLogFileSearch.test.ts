import test from 'node:test';
import assert from 'node:assert/strict';
import { createChange, createRepository } from './fakes';
import { createHiddenShowLogState, type ShowLogState } from '../src/showLogShared';
import { ShowLogFileSearch, getInheritedShowLogFileFilter } from '../src/showLog/fileSearch';
const hash = 'a'.repeat(40);
function fixture(filterText = '') {
  let state: ShowLogState = { ...createHiddenShowLogState(), kind: 'visible', sourceToken: 'repo-a',
    repository: createRepository({ root: '/repo' }), filterText, expandedCommitHash: hash,
    entries: [{ hash, shortHash: 'aaaaaaa', author: 'Ada', date: '', subject: 'test', message: 'test', parentHashes: [], references: [], shortStat: undefined }],
    cachedChanges: { [hash]: [createChange({ uriPath: '/repo/unrelated.ts' }), createChange({ uriPath: '/repo/match.ts' })] } };
  return { get: () => state, apply: (next: ShowLogState) => { state = next; } };
}
test('inherits only change and its path operator, preserving quoted literal values', () => {
  assert.equal(getInheritedShowLogFileFilter('subject file:src/ change:"say \\"hello\\""'), 'file:"src/" change:"say \\"hello\\""');
  assert.equal(getInheritedShowLogFileFilter('file:src/ subject'), '');
  assert.equal(getInheritedShowLogFileFilter('change:"unterminated'), '');
});
test('file searches propagate once, preserve original IDs and retain explicit clears on reopen', async () => {
  const f = fixture('change:needle'); const calls: string[] = [];
  const search = new ShowLogFileSearch(f.get, f.apply, async (_repo, _hash, query) => { calls.push(query.change!); return ['match.ts']; });
  await search.show(hash);
  assert.equal(f.get().fileFilter?.text, 'change:"needle"');
  assert.deepEqual(f.get().fileFilter?.visibleChangeIds, [`${hash}:1`]);
  await search.set(hash, '', 'repo-a'); await search.show(hash);
  assert.equal(f.get().fileFilter?.text, '');
  assert.deepEqual(f.get().fileFilter?.visibleChangeIds, [`${hash}:0`, `${hash}:1`]);
  assert.equal(calls.length, 1);
});
test('plain text still filters paths/status and malformed filters report errors without matches', async () => {
  const f = fixture(); const search = new ShowLogFileSearch(f.get, f.apply, async () => { throw new Error('must not call Git'); });
  await search.set(hash, 'MATCH.TS', 'repo-a');
  assert.deepEqual(f.get().fileFilter?.visibleChangeIds, [`${hash}:1`]);
  await search.set(hash, 'change:', 'repo-a');
  assert.match(f.get().fileFilter?.error ?? '', /Enter a value/);
  assert.equal(f.get().fileFilter?.visibleChangeIds, undefined);
});
test('superseded searches are aborted and stale results cannot replace the latest filter', async () => {
  const f = fixture(); let complete: (value: readonly string[]) => void = () => {}; let signal: AbortSignal | undefined;
  const search = new ShowLogFileSearch(f.get, f.apply, async (_repo, _hash, _query, nextSignal) => { signal = nextSignal; return new Promise(r => { complete = r; }); });
  const pending = search.set(hash, 'change:old', 'repo-a');
  await search.set(hash, 'match.ts', 'repo-a'); complete(['unrelated.ts']); await pending;
  assert.equal(signal?.aborted, true);
  assert.equal(f.get().fileFilter?.text, 'match.ts');
  assert.deepEqual(f.get().fileFilter?.visibleChangeIds, [`${hash}:1`]);
  await search.set(hash, 'unrelated', 'repo-b');
  assert.equal(f.get().fileFilter?.text, 'match.ts');
});

test('file search errors stay actionable and reset stops repository/source leakage', async () => {
  const f = fixture('change:needle');
  const search = new ShowLogFileSearch(f.get, f.apply, async () => { throw new Error('Git timed out'); });
  await search.show(hash);
  assert.match(f.get().fileFilter?.error ?? '', /Git timed out/);
  assert.equal(f.get().fileFilter?.visibleChangeIds, undefined);
  await search.set(hash, '', 'repo-a'); search.reset();
  f.apply({ ...f.get(), sourceToken: 'repo-b' }); await search.show(hash);
  assert.equal(f.get().fileFilter?.text, 'change:"needle"');
});

test('file filtering preserves original action IDs across hundreds of cached changes', async () => {
  const f = fixture();
  f.apply({ ...f.get(), cachedChanges: { [hash]: Array.from({length: 500}, (_, i) => createChange({uriPath: `/repo/file-${i}.ts`})) } });
  let calls = 0;
  const search = new ShowLogFileSearch(f.get, f.apply, async () => { calls++; return ['file-499.ts']; });
  await search.set(hash, 'change:needle', 'repo-a');
  assert.deepEqual(f.get().fileFilter?.visibleChangeIds, [`${hash}:499`]);
  assert.equal(f.get().cachedChanges[hash].length, 500);
  assert.equal(calls, 1);
});

test('file search responses are ignored after source replacement or collapse', async () => {
  for (const replace of [(state: ShowLogState) => ({...state, sourceToken: 'other'}),
    (state: ShowLogState) => ({...state, expandedCommitHash: undefined})]) {
    const f = fixture(); let finish: (paths: readonly string[]) => void = () => {};
    const search = new ShowLogFileSearch(f.get, f.apply, async () => new Promise(resolve => { finish = resolve; }));
    const pending = search.set(hash, 'change:needle', 'repo-a');
    f.apply({...replace(f.get()), fileFilter: undefined}); finish(['match.ts']); await pending;
    assert.equal(f.get().fileFilter, undefined);
  }
});
