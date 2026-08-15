import { classifyFlowBranches } from './flowBranchClassifier';
import { resolveFlowConfigForRepository } from './flowConfig';
import { createFlowGovernanceViewState } from './flowState';
import type {
  FlowGovernanceSettings,
  FlowGovernanceViewState
} from './flowTypes';

export async function loadFlowGovernanceViewState(
  repositoryPath: string,
  branchRefNames: readonly string[],
  settings: FlowGovernanceSettings | undefined,
  _signal?: AbortSignal,
  _services: object = {}
): Promise<FlowGovernanceViewState | undefined> {
  const resolution = await resolveFlowConfigForRepository(repositoryPath, settings);
  const classifiedReferences = classifyFlowBranches([...new Set(branchRefNames)], resolution.config);
  const baseState = createFlowGovernanceViewState(resolution, classifiedReferences);
  if (!baseState.enabled) {
    return baseState.configSource === 'repository' || baseState.configSource === 'invalid'
      ? baseState
      : undefined;
  }
  return createFlowGovernanceViewState(resolution, classifiedReferences);
}
