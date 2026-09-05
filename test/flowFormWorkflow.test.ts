import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { FlowFormWorkflow } from '../src/revisionGraph/flow/formWorkflow';
import { RepositoryMutationCoordinator } from '../src/repositoryMutationCoordinator';
import { prepareFlowEqualizationBranch } from '../src/revisionGraph/flow/flowEqualization';
import { createRepository } from './fakes';
import type { RefActionServices } from '../src/refActions';
import type { RevisionGraphViewState } from '../src/revisionGraphTypes';

for (const scenario of ['success', 'retry', 'partial', 'switch', 'dispose', 'disabled', 'rejected'] as const) {
  test(`Flow form host reports ${scenario} with request identity and repository isolation`, async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'flow-form-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    await writeFile(path.join(root, '.git-revision-graph-flow.json'), JSON.stringify({ schemaVersion: 1, enabled: scenario !== 'disabled' }));
    let repository = createRepository({ root });
    const results: unknown[] = [];
    let called = false;
    const state = { viewMode: 'ready', repositoryPath: root, references: [{ name: 'main' }],
      flowGovernance: { enabled: true, references: [{ refName: 'main', kind: 'main' }] }
    } as unknown as RevisionGraphViewState;
    const coordinator = new RepositoryMutationCoordinator();
    if (scenario === 'rejected') coordinator.dispose();
    const workflow = new FlowFormWorkflow({
      actionServices: { ui: { async showErrorMessage() {} }, referenceManager: {}, refreshController: {}, ancestryInspector: {} } as unknown as RefActionServices,
      mutationCoordinator: coordinator,
      getCurrentRepository: () => repository,
      getCurrentState: () => state,
      setCurrentState() {}, postCurrentState() {}, postHostMessage: (message) => results.push(message)
    }, () => ({}), {
      equalize: prepareFlowEqualizationBranch,
      async startBranch(_repository, _options, services) {
        called = true;
        if (scenario === 'switch') repository = createRepository({ root: '/other' });
        if (scenario === 'dispose') workflow.dispose();
        if (scenario === 'retry' || scenario === 'partial') await services.ui.showErrorMessage('Keep the entered name and description');
        return scenario === 'partial' ? 'partial' : scenario === 'retry' ? 'retry' : 'success';
      }
    });
    const request = { type: 'submit-flow-form', requestId: 7, repositoryPath: root, action: {
      type: 'start-flow-branch', branchKind: 'release', sourceRefName: 'main', name: '2.0.0', description: 'Keep me'
    } } as const;
    await workflow.submit(request);
    assert.equal(called, scenario !== 'disabled' && scenario !== 'rejected');
    if (scenario === 'switch' || scenario === 'dispose') {
      assert.deepEqual(results, []);
    } else {
      const result = results[0] as RevisionGraphProtocol.FlowFormResult;
      assert.equal(result.requestId, 7);
      assert.equal(result.repositoryPath, root);
      assert.equal(result.status, scenario === 'success' ? 'success' : scenario === 'partial' ? 'partial' : 'retry');
      if (scenario === 'partial') assert.match(result.message, /already have been created/);
      if (scenario === 'retry') assert.match(result.message, /Keep the entered name/);
    }
    workflow.dispose();
  });
}
