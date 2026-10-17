import assert from 'node:assert/strict';
import type { GitApiBaselineRepository } from './gitApiBaseline';
import { SafetyHarness } from './safetyHarness';
import { waitFor } from './webviewBridge';

export async function verifyCompactView(harness: SafetyHarness, repository: GitApiBaselineRepository): Promise<void> {
  const root = repository.rootUri.fsPath;
  const graph = await harness.panel('gitRefs.revisionGraphEditorPanel');
  harness.selectedRoot = root;
  await graph.send({ type: 'choose-repository' });
  await waitFor(() => graph.state?.repositoryPath === root && !graph.loading, 'compact graph ready');
  const menu = await graph.control('viewOptions');
  assert.ok(menu.viewOptions);
  for (const label of ['Show Tags', 'Show Remote Branches', 'Show Stash', 'Show Minimap']) {
    assert.ok(menu.viewOptions.includes(label), `${label} must remain available`);
  }
  assert.equal(menu.viewOptions.includes('Show Merge Commits'), false);
  assert.equal(Object.hasOwn((await graph.snapshot()).projectionOptions!, 'showMergeCommits'), false);

  await graph.control('toggleViewOption', { controlId: 'showTagsToggle', checked: false });
  await waitFor(() => graph.state?.projectionOptions?.showTags === false && !graph.loading, 'remaining View checkbox response');
  await graph.send({ type: 'set-projection-options', options: { showTags: true, showMergeCommits: true },
    origin: (await graph.snapshot()).messageOrigin });
  await waitFor(() => graph.state?.projectionOptions?.showTags === true && !graph.loading, 'legacy View payload sanitization');
  assert.equal(Object.hasOwn((await graph.snapshot()).projectionOptions!, 'showMergeCommits'), false);
  assert.deepEqual(harness.errors, []);
  console.log('[e2e:safety] compact View menu, remaining checkbox and ignored legacy merge option passed');
}
