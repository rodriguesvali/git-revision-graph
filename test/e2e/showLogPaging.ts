import assert from 'node:assert/strict';
import { git } from './gitSafetyFixture';
import { SafetyHarness } from './safetyHarness';
import { ObservedPanel, waitFor } from './webviewBridge';

/** Exercise paging after an external ref update in the real extension host. */
export async function verifyShowLogPaging(harness: SafetyHarness, graph: ObservedPanel): Promise<void> {
  const root = harness.roots[0];
  const branch = 'e2e-paging';
  const tree = git(root, ['rev-parse', 'HEAD^{tree}']);
  let tip = git(root, ['rev-parse', 'HEAD']);
  try {
    for (let i = 0; i < 55; i++) tip = git(root, ['commit-tree', tree, '-p', tip, '-m', `paging ${i}`]);
    git(root, ['update-ref', `refs/heads/${branch}`, tip]);
    const previousContext = graph.state?.messageOrigin?.contextId;
    await graph.send({ type: 'refresh-with-empty-cache' });
    await waitFor(() => !graph.loading && graph.state?.messageOrigin?.contextId !== previousContext
      && !!graph.state?.references?.some(ref => ref.name === branch && ref.kind === 'branch'), 'paging branch visible');

    for (const all of [false, true]) {
      await graph.send({ type: 'show-log', source: { kind: 'target', revision: branch, label: branch, refKind: 'branch' },
        origin: (await graph.snapshot()).messageOrigin });
      const log = await harness.panel('gitRefs.showLogView');
      await waitFor(() => !log.state?.loading && log.state?.commits?.[0]?.hash === tip, 'paging log opened');
      if (all) {
        await log.send({ type: 'toggleShowAllBranches', value: true, origin: (await log.snapshot()).messageOrigin });
        await waitFor(() => !log.state?.loading && log.state?.showAllBranches === true, 'paging all-branches loaded');
      }
      const before = await log.snapshot();
      const count = before.commits!.length;
      assert.ok(count >= 50 && count < 55, `Expected an incomplete page, got ${count}`);
      const history = git(root, ['rev-list', '--topo-order', ...(all ? ['--all'] : []), '--end-of-options', tip]).split('\n');
      const nextExpected = history[history.indexOf(tip) + count];
      assert.ok(nextExpected);
      const newTip = git(root, ['commit-tree', tree, '-p', tip, '-m', 'paging external update']);
      git(root, ['update-ref', `refs/heads/${branch}`, newTip]);
      await log.send({ type: 'loadMore', origin: before.messageOrigin });
      await waitFor(async () => (await log.snapshot()).commits!.length > count, 'next log page');
      const after = await log.snapshot();
      assert.equal(after.commits![count].hash, nextExpected);
      assert.equal(new Set(after.commits!.map(commit => commit.hash)).size, after.commits!.length);
      assert.ok(!after.commits!.some(commit => commit.hash === newTip));
      await log.control('filterShowLog', { value: 'paging 5' });
      await waitFor(() => !log.state?.loading && log.state?.filterText === 'paging 5', 'filtered paging log');
      const filtered = await log.control('snapshot');
      assert.ok((filtered.graphNodes ?? 0) > 1);
      assert.equal(filtered.graphLines, 0);
      assert.match(filtered.statusText ?? '', /ancestry lines are hidden/i);
      await log.control('filterShowLog', { value: '' });
      await waitFor(() => !log.state?.loading && log.state?.filterText === '', 'unfiltered paging log');
      const restored = await log.control('snapshot');
      assert.ok((restored.graphLines ?? 0) > 0);
      tip = newTip;
      log.panel.dispose();
    }
    console.log('[e2e:safety] Show Log pagination remains pinned after branch updates');
  } finally {
    git(root, ['update-ref', '-d', `refs/heads/${branch}`]);
  }
}
