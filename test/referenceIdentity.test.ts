import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import { qualifiedRevision } from '../src/refActions/qualifiedRevision';
import { resolveComparisonRevision } from '../src/compareResults/revisionSnapshot';
import { createRepository } from './fakes';
import { createBranchFromResolvedReference, createTagFromResolvedReference, type RefActionServices } from '../src/refActions';

test('typed reference resolution distinguishes branches, annotated tags and remotes with identical names', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'grg-ref-identity-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const git = (...args: string[]) => execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8', env: { ...process.env, GIT_CONFIG_GLOBAL: os.devNull, GIT_CONFIG_NOSYSTEM: '1' }
  }).trim();
  git('init', '-q'); git('config', 'user.name', 'Fixture'); git('config', 'user.email', 'fixture@example.invalid');
  await fs.writeFile(path.join(root, 'file'), 'first\n'); git('add', 'file'); git('commit', '-qm', 'first');
  const first = git('rev-parse', 'HEAD');
  git('tag', '-a', 'release', '-m', 'tag');
  await fs.writeFile(path.join(root, 'file'), 'second\n'); git('commit', '-qam', 'second');
  const second = git('rev-parse', 'HEAD');
  git('branch', 'release'); git('update-ref', 'refs/remotes/release', first);
  git('branch', 'refs/heads/literal');
  const repository = createRepository({ root });

  assert.equal(await resolveComparisonRevision(repository, qualifiedRevision('release', 'branch')), second);
  assert.equal(await resolveComparisonRevision(repository, qualifiedRevision('release', 'tag')), first);
  assert.equal(await resolveComparisonRevision(repository, qualifiedRevision('release', 'remote')), first);
  assert.equal(await resolveComparisonRevision(repository, qualifiedRevision('refs/heads/literal', 'branch')), second);

  repository.createBranch = async (name, checkout, revision) => {
    git('branch', name, revision!);
    if (checkout) git('checkout', '-q', name);
  };
  const services = {
    resolveComparisonRevision,
    ui: {
      promptBranchName: async () => 'new-branch', promptTagName: async () => 'new-tag',
      showInformationMessage() {}, showErrorMessage: async (message: string) => { throw new Error(message); }
    },
    referenceManager: {
      createTag: async (_repository: unknown, name: string, revision: string) => { git('tag', name, revision); },
      unsetBranchUpstream: async () => {}
    },
    refreshController: { prepare() { return undefined; }, refresh() {} }
  } as unknown as RefActionServices;
  await createTagFromResolvedReference(repository, { refName: 'release', label: 'release', kind: 'branch' }, services);
  await createBranchFromResolvedReference(repository, { refName: 'release', label: 'release', kind: 'tag' }, services);
  assert.equal(git('rev-parse', 'refs/tags/new-tag^{commit}'), second);
  assert.equal(git('rev-parse', 'refs/heads/new-branch^{commit}'), first);

  git('update-ref', 'refs/refs/heads/missing', first);
  await assert.rejects(resolveComparisonRevision(repository, qualifiedRevision('missing', 'branch')));
});
