import assert from 'node:assert/strict';
import type { GitApiBaselineRepository } from './gitApiBaseline';
import { git, indexState } from './gitSafetyFixture';
import { SafetyHarness } from './safetyHarness';
import { waitFor } from './webviewBridge';

/** Same tree, independently committed from the predecessor: the reported patch scenario. */
export async function verifyEndpointComparison(harness: SafetyHarness, repository: GitApiBaselineRepository): Promise<void> {
  const root = repository.rootUri.fsPath, before = git(root, ['rev-parse', 'HEAD']);
  const index = indexState(root), base = git(root, ['rev-parse', 'baseline']);
  const sibling = git(root, ['commit-tree', `${before}^{tree}`, '-p', base, '-m', 'endpoint fixture equivalent to applied patch']);
  const branch = 'endpoint-comparison-proof';
  await repository.createBranch(branch, false, sibling);
  try {
    await repository.status();
    const graph = await harness.panel('gitRefs.revisionGraphEditorPanel');
    await graph.send({ type: 'refresh-with-empty-cache' });
    await waitFor(() => !graph.loading && !!graph.state?.references?.some(ref => ref.name === branch), 'equivalent sibling branch');
    assert.notEqual(sibling, before);
    assert.ok((await repository.diffBetween(sibling, before)).length > 0, 'Native API still reports merge-base changes');
    const informationCount = harness.information.length;
    await graph.send({ type: 'compare-selected', baseRevision: sibling, baseLabel: branch,
      compareRevision: before, compareLabel: 'main', origin: (await graph.snapshot()).messageOrigin });
    await waitFor(() => harness.information.length > informationCount, 'graph reports no endpoint differences');
    assert.equal(harness.information.at(-1), `No differences found between ${branch} and main.`);

    await graph.send({ type: 'show-log', source: { kind: 'target', revision: sibling, label: branch },
      origin: (await graph.snapshot()).messageOrigin });
    const log = await harness.panel('gitRefs.showLogView');
    await waitFor(() => !log.state?.loading && !!log.state?.commits?.some(commit => commit.hash === sibling), 'fresh sibling history');
    await log.send({ type: 'toggleShowAllBranches', value: true, origin: (await log.snapshot()).messageOrigin });
    await waitFor(() => !log.state?.loading && !!log.state?.commits?.some(commit => commit.hash === sibling)
      && !!log.state.commits.some(commit => commit.hash === before), 'Show Log includes both endpoint commits');
    const logInformationCount = harness.information.length;
    await log.send({ type: 'compareCommits', baseCommitHash: sibling, compareCommitHash: before,
      origin: (await log.snapshot()).messageOrigin });
    await waitFor(() => harness.information.length > logInformationCount, 'Show Log reports no endpoint differences');
    assert.match(harness.information.at(-1)!, /^No differences found between /);
    await log.control('click', { selector: `.commit-row[data-commit-hash="${base}"]` });
    await waitFor(() => !!log.state?.commits?.find(commit => commit.hash === base)?.changes.length, 'root commit expands against empty tree');
    assert.equal(git(root, ['rev-parse', 'HEAD']), before); assert.equal(indexState(root), index);
    assert.deepEqual(harness.errors, []);
    console.log('[e2e:safety] equal-tree sibling graph/Show Log compares and root expansion passed');
  } finally {
    await repository.deleteBranch(branch, true); await repository.status();
  }
}
