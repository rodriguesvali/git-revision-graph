import test from 'node:test';
import assert from 'node:assert/strict';
import { createChange, createRepository } from './fakes';
import { createHiddenShowLogState, type ShowLogState } from '../src/showLogShared';
import { ShowLogFileSearch } from '../src/showLog/fileSearch';
import { ShowLogExpansionRequests } from '../src/showLog/expansionRequests';
import { toggleShowLogCommit } from '../src/showLog/commitExpansion';
import type { ShowLogBackend } from '../src/revisionGraph/backend';
const hash = 'a'.repeat(40);
function fixture() {
  let state: ShowLogState = { ...createHiddenShowLogState(), kind: 'visible', sourceToken: 'a', filterText: 'change:needle',
    repository: createRepository({root: '/repo'}), entries: [{hash,shortHash:'aaaaaaa',subject:'test',message:'test',author:'Ada',date:'',parentHashes:[],references:[],shortStat:undefined}] };
  const getState = () => state;
  const applyState = (next: ShowLogState) => { state = next; };
  const fileSearch = new ShowLogFileSearch(getState, applyState, async () => ['match.ts']);
  return { getState, applyState, fileSearch, requests: new ShowLogExpansionRequests(),
    backend: { async loadRevisionLogChanges() { return [createChange({uriPath:'/repo/other.ts'}),createChange({uriPath:'/repo/match.ts'})]; } } as ShowLogBackend };
}
test('expanding a commit automatically searches matching files and honors a clear when reopening cached changes', async () => {
  const f = fixture(); await toggleShowLogCommit(hash, f);
  assert.equal(f.getState().expandedCommitHash, hash);
  assert.deepEqual(f.getState().fileFilter?.visibleChangeIds, [`${hash}:1`]);
  await f.fileSearch.set(hash, '', 'a');
  await toggleShowLogCommit(hash, f); await toggleShowLogCommit(hash, f);
  assert.equal(f.getState().fileFilter?.text, '');
  assert.equal(f.getState().fileFilter?.visibleChangeIds?.length, 2);
});
test('collapsing a loading commit discards its late expansion result', async () => {
  const f = fixture(); let finish: (changes: readonly never[]) => void = () => {};
  f.backend = { loadRevisionLogChanges: () => new Promise(resolve => { finish = resolve; }) };
  const pending = toggleShowLogCommit(hash, f);
  await toggleShowLogCommit(hash, f); finish([]); await pending;
  assert.equal(f.getState().expandedCommitHash, undefined);
  assert.deepEqual(f.getState().cachedChanges, {});
  assert.equal(f.getState().fileFilter, undefined);
});
