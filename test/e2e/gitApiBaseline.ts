import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { rm, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { Repository } from '../../src/git';
import { git } from './gitSafetyFixture';
import { waitFor } from './webviewBridge';

export interface GitApiBaselineRepository extends Repository {
  status(): Promise<void>;
}

/** Verify the capabilities behind the minimum using real Git in isolated fixtures. */
export async function verifyGitApiBaseline(
  repositories: readonly GitApiBaselineRepository[], extensionPath: string
): Promise<void> {
  const fixtureRoot = process.env.GIT_REVISION_GRAPH_E2E_FIXTURE_ROOT;
  assert.ok(fixtureRoot, 'The API probe requires a disposable fixture');
  for (const repository of repositories) {
    assert.ok(repository.rootUri.fsPath.startsWith(fixtureRoot + path.sep));
    assert.ok(Array.isArray(repository.state.untrackedChanges), 'Git state must expose the separate untracked collection');
    assert.equal(typeof repository.onDidCheckout, 'function', 'Git must expose checkout events');
  }
  const { hasWorkspaceChanges } = require(path.join(extensionPath, 'out', 'gitState.js')) as {
    hasWorkspaceChanges(repository: Repository): boolean;
  };
  const [repository, other] = repositories;
  assert.ok(repository && other, 'Probe requires both fixture repositories');
  const probe = path.join(repository.rootUri.fsPath, `untracked-${randomUUID()}.txt`);
  const config = vscode.workspace.getConfiguration('git');
  const previous = config.inspect('untrackedChanges')?.globalValue;
  await writeFile(probe, 'Disposable compatibility probe\n', { flag: 'wx' });
  try {
    for (const mode of ['mixed', 'separate']) {
      await config.update('untrackedChanges', mode, vscode.ConfigurationTarget.Global);
      await Promise.all(repositories.map(item => item.status()));
      assert.equal(hasWorkspaceChanges(repository), true, `${mode}: a new file must make the selected repository dirty`);
      assert.equal(hasWorkspaceChanges(other), false, `${mode}: the other repository must remain clean`);
      if (mode === 'separate') {
        assert.equal(repository.state.workingTreeChanges.length, 0);
        assert.equal(repository.state.untrackedChanges!.length, 1);
      }
    }
  } finally {
    await rm(probe, { force: true });
    await config.update('untrackedChanges', previous, vscode.ConfigurationTarget.Global);
    await Promise.all(repositories.map(item => item.status()));
  }
  assert.equal(hasWorkspaceChanges(repository), false, 'Probe cleanup must leave a clean worktree');

  const original = git(repository.rootUri.fsPath, ['symbolic-ref', '--short', 'HEAD']);
  let checkouts = 0;
  const subscription = repository.onDidCheckout!(() => { checkouts++; });
  try {
    await repository.checkout('side');
    await waitFor(() => checkouts >= 1, 'real checkout event after switching to side');
    const beforeRestore = checkouts;
    await repository.checkout(original);
    await waitFor(() => checkouts > beforeRestore, 'real checkout event after restoring the original branch');
    assert.equal(git(repository.rootUri.fsPath, ['symbolic-ref', '--short', 'HEAD']), original);
    assert.equal(git(other.rootUri.fsPath, ['symbolic-ref', '--short', 'HEAD']), 'main');
  } finally {
    try {
      if (git(repository.rootUri.fsPath, ['symbolic-ref', '--short', 'HEAD']) !== original) {
        await repository.checkout(original);
      }
    } finally { subscription.dispose(); }
  }
  console.log('[e2e:safety] Git API baseline: mixed/separate untracked detection, repository isolation and checkout events passed');
}
