import test from 'node:test';
import assert from 'node:assert/strict';
import { Status } from '../src/git';
import { getCompareResultFileTarget, getCompareResultFileActions, openCompareResultFile } from '../src/compareResults/fileOpen';
import { getShowLogFileTarget, openShowLogFile } from '../src/showLog/fileOpen';
import { getCompareResultItems } from '../src/compareResults/viewState';
import { createHiddenShowLogState } from '../src/showLogShared';
import { createChange, createCompareResultItem, createRepository, createRevisionLogEntry } from './fakes';

const source = 'a'.repeat(40), target = 'b'.repeat(40);
const repo = createRepository({ root: '/workspace/repo' });

for (const [status, sourceExists, targetExists] of [
  [Status.INDEX_ADDED, false, true], [Status.UNTRACKED, false, true],
  [Status.INDEX_DELETED, true, false], [Status.DELETED, true, false],
  [Status.MODIFIED, true, true], [Status.INDEX_RENAMED, true, true]
] as const) {
  test(`file status ${Status[status]} exposes only its existing historical sides`, () => {
    const change = createChange({ uriPath: '/workspace/repo/a.ts', status });
    const item = createCompareResultItem({ repository: repo, change, leftRef: source, rightRef: target });
    const entry = createRevisionLogEntry({ hash: target, parentHashes: [source] });
    assert.equal(!!getCompareResultFileTarget(item, 'source'), sourceExists);
    assert.equal(!!getCompareResultFileTarget(item, 'target'), targetExists);
    assert.equal(!!getShowLogFileTarget(change, entry, 'source'), sourceExists);
    assert.equal(!!getShowLogFileTarget(change, entry, 'target'), targetExists);
    assert.ok(getCompareResultFileTarget(item, 'worktree'), 'Historical deletion does not imply local absence');
    const actions = getCompareResultFileActions(item, 'Main', 'Feature');
    assert.equal(actions[1].disabled, !sourceExists);
    assert.equal(actions[2].disabled, !targetExists);
  });
}

test('historical renames use the path for their side and root commits have no parent file', () => {
  const change = createChange({ uriPath: '/workspace/repo/old.ts', originalPath: '/workspace/repo/old.ts', renamePath: '/workspace/repo/new.ts' });
  const item = createCompareResultItem({ repository: repo, change, leftRef: source, rightRef: target });
  assert.equal(getCompareResultFileTarget(item, 'source')?.uri.fsPath, '/workspace/repo/old.ts');
  assert.equal(getCompareResultFileTarget(item, 'target')?.uri.fsPath, '/workspace/repo/new.ts');
  assert.equal(getShowLogFileTarget(change, createRevisionLogEntry({ hash: target }), 'source'), undefined);
});

test('worktree compare opens only the existing reference side and historical deletion remains locally openable', () => {
  const item = createCompareResultItem({ repository: repo, worktreeRef: source,
    change: createChange({ uriPath: '/workspace/repo/a.ts', status: Status.DELETED }) });
  assert.equal(getCompareResultFileTarget(item, 'source')?.revision, source);
  assert.equal(getCompareResultFileTarget(item, 'target'), undefined);
  assert.ok(getCompareResultFileTarget(item, 'worktree'));
});

test('host ignores forged comparison IDs and absent historical sides', async () => {
  const state = { kind: 'between' as const, repository: repo,
    left: { refName: source, label: 'Main' }, right: { refName: target, label: 'Feature' },
    changes: [createChange({ uriPath: '/workspace/repo/a.ts', status: Status.INDEX_ADDED })] };
  const calls: string[] = [];
  const services = { async isAvailable() { return true; }, async openWorktree() { calls.push('local'); }, async openRevision() { calls.push('revision'); } };
  await openCompareResultFile(() => state, undefined, 'worktree', services);
  await openCompareResultFile(() => state, getCompareResultItems(state)[0], 'source', services);
  assert.deepEqual(calls, []);
});

test('Show Log requires the visible commit file identity, not an unrelated cached prefix', async () => {
  const entry = createRevisionLogEntry({ hash: target, parentHashes: [source] });
  const state = { ...createHiddenShowLogState(), kind: 'visible' as const, repository: repo,
    entries: [entry], expandedCommitHash: target, cachedChanges: { [target]: [createChange({ uriPath: '/workspace/repo/a.ts' })] } };
  const calls: string[] = [];
  const services = { async isAvailable() { return true; }, async openWorktree() { calls.push('local'); }, async openRevision() { calls.push('revision'); } };
  await openShowLogFile(() => state, target, `${source}:0`, 'worktree', services);
  await openShowLogFile(() => ({ ...state, loading: true }), target, `${target}:0`, 'target', services);
  assert.deepEqual(calls, []);
});
