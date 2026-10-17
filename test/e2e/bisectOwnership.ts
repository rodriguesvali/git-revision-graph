import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { GitApiBaselineRepository } from './gitApiBaseline';
import { git } from './gitSafetyFixture';
import { SafetyHarness } from './safetyHarness';
import { ObservedPanel, waitFor } from './webviewBridge';

export async function verifyBisectOwnership(harness: SafetyHarness, repository: GitApiBaselineRepository): Promise<void> {
  const root = repository.rootUri.fsPath;
  const graph = await harness.panel('gitRefs.revisionGraphEditorPanel');
  const head = git(root, ['rev-parse', 'HEAD']);
  const good = git(root, ['rev-parse', 'baseline']);
  const startPath = resolve(root, git(root, ['rev-parse', '--git-path', 'BISECT_START']));
  harness.allowedConfirmations.add('Finish and Return');
  harness.allowedConfirmations.add('Detach Controls');
  try {
    await start(); await control('stop');
    await waitFor(() => bisect(graph) === null, 'legitimate bisect completion');

    await start();
    const log = git(root, ['bisect', 'log']); const content = readFileSync(startPath);
    git(root, ['bisect', 'reset', 'HEAD']);
    git(root, ['bisect', 'start', '--no-checkout', head, good, '--']);
    assert.equal(git(root, ['bisect', 'log']), log);
    assert.deepEqual(readFileSync(startPath), content, 'Only the native instance changed');
    await control('stop');
    await waitFor(() => !!bisect(graph)?.error && !bisect(graph)?.busy, 'native replacement rejection');
    assert.match(bisect(graph)!.error!, /state changed outside/);
    assert.equal(git(root, ['bisect', 'log']), log);
    assert.deepEqual(readFileSync(startPath), content);
    assert.equal(git(root, ['symbolic-ref', 'HEAD']), 'refs/heads/main');
    assert.equal(git(root, ['rev-parse', 'HEAD']), head);
    await control('abandon');
    await waitFor(() => bisect(graph) === null, 'detaching only extension ownership');
    assert.equal(git(root, ['bisect', 'log']), log, 'Detach must preserve external metadata');
    assert.deepEqual(harness.errors, []);
    console.log('[e2e:safety] native bisect identity, identical replacement rejection and detach passed');
  } finally {
    git(root, ['bisect', 'reset', 'HEAD']);
    harness.allowedConfirmations.delete('Finish and Return');
    harness.allowedConfirmations.delete('Detach Controls');
    await repository.status();
  }

  async function start(): Promise<void> {
    const context = graph.state?.messageOrigin?.contextId;
    await graph.send({ type: 'refresh-with-empty-cache' });
    await waitFor(() => !graph.loading && graph.state?.messageOrigin?.contextId !== context, 'graph before bisect');
    const state = await graph.snapshot();
    await graph.send({ type: 'start-bug-bisect', revision: 'baseline', refKind: 'branch', origin: state.messageOrigin });
    await waitFor(() => bisect(graph)?.status === 'preparing', 'bisect preparation');
    await control('start');
    await waitFor(() => bisect(graph)?.status === 'found' && !bisect(graph)?.busy, 'adjacent endpoint result');
    assert.equal(bisect(graph)!.error, undefined);
  }

  async function control(action: RevisionGraphProtocol.BisectControl): Promise<void> {
    await waitFor(() => !graph.loading, `graph ready for bisect ${action}`);
    const state = bisect(graph); assert.ok(state);
    await graph.send({ type: 'bisect-control', action, repositoryPath: root, id: state.id,
      version: state.version, origin: (await graph.snapshot()).messageOrigin });
  }
}

function bisect(graph: ObservedPanel): RevisionGraphProtocol.BisectView | null | undefined {
  return graph.posted.filter(message => message.type === 'bisect-state').at(-1)?.state as unknown as RevisionGraphProtocol.BisectView | null | undefined;
}
