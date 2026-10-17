import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { GitApiBaselineRepository } from './gitApiBaseline';
import { git, indexState } from './gitSafetyFixture';
import { SafetyHarness } from './safetyHarness';
import { ObservedPanel, waitFor } from './webviewBridge';

/** Exercise real graph/Show Log menus through the production composition root. */
export async function verifyBisectTargets(harness: SafetyHarness, repository: GitApiBaselineRepository): Promise<void> {
  const root = repository.rootUri.fsPath;
  const graph = await harness.panel('gitRefs.revisionGraphEditorPanel');
  const head = git(root, ['rev-parse', 'HEAD']);
  const good = git(root, ['rev-parse', 'baseline']);
  const originalIndex = indexState(root);
  const names = ['bisect-branch-target', 'bisect-tag-target'];
  try {
    git(root, ['branch', names[0], good]);
    git(root, ['tag', names[0], head]);
    git(root, ['branch', names[1], head]);
    git(root, ['tag', '-a', names[1], '-m', 'bisect annotated target', good]);
    await repository.status();
    await refresh();
    for (const [name, kind] of [[names[0], 'branch'], [names[1], 'tag']]) {
      await graph.menu(`[data-ref-name="${name}"][data-ref-kind="${kind}"]`, 'find-bug');
      await prepared();
      await cancel();
    }

    await graph.send({ type: 'show-log', source: { kind: 'target', revision: 'main', label: 'main' },
      origin: (await graph.snapshot()).messageOrigin });
    const log = await harness.panel('gitRefs.showLogView');
    await waitFor(() => log.state?.kind === 'visible' && !log.state.loading
      && !!log.state.commits?.some(commit => commit.hash === good), 'loaded Show Log endpoint');
    await log.menu(`.commit-row[data-commit-hash="${good}"]`, 'startBugBisect');
    await prepared();
    await cancel();
    log.panel.dispose();
    assert.deepEqual(harness.errors, []);
    console.log('[e2e:safety] bisect namesake branch/tag menus and Show Log commit handoff passed');
  } finally {
    for (const name of names) {
      git(root, ['branch', '-D', name]);
      git(root, ['tag', '-d', name]);
    }
    await repository.status();
  }

  async function refresh(): Promise<void> {
    const context = graph.state?.messageOrigin?.contextId;
    await graph.send({ type: 'refresh-with-empty-cache' });
    await waitFor(() => !graph.loading && graph.state?.messageOrigin?.contextId !== context, 'fresh bisect targets');
    await graph.snapshot();
  }

  async function prepared(): Promise<void> {
    await waitFor(() => bisect(graph)?.status === 'preparing', 'typed bisect target preparation');
    assert.equal(bisect(graph)!.selected.hash, good);
    assert.equal(git(root, ['rev-parse', 'HEAD']), head);
    assert.equal(git(root, ['symbolic-ref', 'HEAD']), 'refs/heads/main');
    assert.equal(git(root, ['status', '--porcelain=v1']), '');
    assert.equal(indexState(root), originalIndex);
    assert.equal(existsSync(resolve(root, git(root, ['rev-parse', '--git-path', 'BISECT_START']))), false);
  }

  async function cancel(): Promise<void> {
    const state = bisect(graph); assert.ok(state);
    await graph.send({ type: 'bisect-control', action: 'stop', repositoryPath: root, id: state.id,
      version: state.version, origin: (await graph.snapshot()).messageOrigin });
    await waitFor(() => bisect(graph) === null, 'cancel preparation');
  }
}

function bisect(graph: ObservedPanel): RevisionGraphProtocol.BisectView | null | undefined {
  return graph.posted.filter(message => message.type === 'bisect-state').at(-1)?.state as unknown as RevisionGraphProtocol.BisectView | null | undefined;
}
