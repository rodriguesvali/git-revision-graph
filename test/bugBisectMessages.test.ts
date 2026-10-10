import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateRevisionGraphMessage, isRevisionGraphMessageAllowedForState, isRevisionGraphMessageAllowedForCurrentRepository } from '../src/revisionGraph/messageValidation';
import { RevisionGraphMessageHandler, type RevisionGraphMessageHandlerHost } from '../src/revisionGraph/messageHandler';
import type { RevisionGraphViewState } from '../src/revisionGraphTypes';
import { dispatchShowLogWebviewMessage, type ShowLogMessageHandlers } from '../src/showLog/messageHandler';
import { startShowLogBugBisect } from '../src/showLog/bugBisectAction';
import { createHiddenShowLogState, type ShowLogState } from '../src/showLogShared';
import { readBisectSessions } from '../src/bugBisect/sessionState';
import { createRepository, createRevisionLogEntry } from './fakes';

const hash = 'a'.repeat(40);
const repository = createRepository({ root: '/repo' });
const state = {
  viewMode: 'ready', repositoryPath: '/repo', loading: false,
  scene: { nodes: [{ hash }] }, references: [{ name: 'main', hash, kind: 'branch' }]
} as unknown as RevisionGraphViewState;
const control = { type: 'bisect-control', repositoryPath: '/repo', id: 'owned-id', version: 1, action: 'good' } as const;

test('bisect transport validates bounded identity, action and hashes', () => {
  assert.deepEqual(validateRevisionGraphMessage(control), control);
  for (const change of [{ version: 0 }, { version: 1.5 }, { version: Infinity }, { id: '' },
    { action: 'exec' }, { repositoryPath: '' }, { commitHash: '--help' }]) {
    assert.equal(validateRevisionGraphMessage({ ...control, ...change }), undefined);
  }
  assert.equal(validateRevisionGraphMessage({ type: 'start-bug-bisect', revision: 'main', refKind: 'arbitrary' }), undefined);
});

test('bisect starts require a graph-known target and controls require the current repository', () => {
  assert.equal(isRevisionGraphMessageAllowedForState({ type: 'start-bug-bisect', revision: 'main', refKind: 'branch' }, state), true);
  assert.equal(isRevisionGraphMessageAllowedForState({ type: 'start-bug-bisect', revision: hash, refKind: 'commit' }, state), true);
  assert.equal(isRevisionGraphMessageAllowedForState({ type: 'start-bug-bisect', revision: 'unknown', refKind: 'branch' }, state), false);
  assert.equal(isRevisionGraphMessageAllowedForState({ ...control, repositoryPath: '/other' }, state), false);
  assert.equal(isRevisionGraphMessageAllowedForCurrentRepository(control, state, '/other'), false);
  assert.equal(isRevisionGraphMessageAllowedForCurrentRepository(control, { ...state, loading: true }, '/repo'), true);
});

test('graph handlers route preparation and decisions without using normal checkout workflows', async () => {
  const calls: unknown[] = [];
  const host = {
    getCurrentRepository: () => repository,
    async prepareBugBisect(repo: unknown, revision: string) { calls.push({ repo, revision }); },
    async controlBugBisect(repo: unknown, message: unknown) { calls.push({ repo, message }); }
  } as unknown as RevisionGraphMessageHandlerHost;
  const handler = new RevisionGraphMessageHandler(host);
  await handler.handleMessage({ type: 'start-bug-bisect', revision: 'main', refKind: 'branch' });
  await handler.handleMessage(control);
  assert.deepEqual(calls, [{ repo: repository, revision: 'main' }, { repo: repository, message: control }]);
});

test('Show Log bisect handoff uses the visible repository and rejects unloaded commits', async () => {
  const calls: unknown[] = [];
  const visible = { ...createHiddenShowLogState(), kind: 'visible', repository,
    sourceToken: 'source-a', entries: [createRevisionLogEntry({ hash })] } as unknown as ShowLogState;
  const start = async (repo: unknown, revision: string) => { calls.push({ repo, revision }); };
  const handlers = { startBugBisect: (revision: string, token: string) => startShowLogBugBisect(visible, revision, token, start) } as ShowLogMessageHandlers;
  assert.equal(await dispatchShowLogWebviewMessage({ type: 'startBugBisect', commitHash: hash, sourceToken: 'source-a' }, handlers), true);
  await startShowLogBugBisect(visible, 'b'.repeat(40), 'source-a', start);
  await startShowLogBugBisect(createHiddenShowLogState(), hash, 'source-a', start);
  await startShowLogBugBisect(visible, hash, 'stale-source', start);
  assert.deepEqual(calls, [{ repo: repository, revision: hash }]);
  assert.equal(await dispatchShowLogWebviewMessage({ type: 'startBugBisect', commitHash: '' }, handlers), false);
  assert.equal(await dispatchShowLogWebviewMessage({ type: 'startBugBisect', commitHash: hash }, handlers), false);
});

test('corrupted persisted bisect state cannot reserve a repository or execute replay commands', () => {
  assert.deepEqual(readBisectSessions([{ repositoryPath: '/repo', started: true, log: 'git bisect run malicious' }]), []);
  assert.deepEqual(readBisectSessions({}), []);
});
