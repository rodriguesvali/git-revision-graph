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
  settings: FlowGovernanceSettings | undefined
): Promise<FlowGovernanceViewState | undefined> {
  const resolution = await resolveFlowConfigForRepository(repositoryPath, settings);
  const classifiedReferences = classifyFlowBranches([...new Set(branchRefNames)], resolution.config);
  const state = createFlowGovernanceViewState(resolution, classifiedReferences);
  return state.enabled || state.configSource === 'repository' || state.configSource === 'invalid'
    ? state
    : undefined;
}
