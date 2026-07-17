import {
  applyFlowBranchTargets,
  loadFlowBranchTargets
} from './flowEqualizationTarget';
import { classifyFlowBranches } from './flowBranchClassifier';
import { resolveFlowConfigForRepository } from './flowConfig';
import { loadFlowPullRequestTargets } from './flowPullRequestTargets';
import { createFlowGovernanceViewState } from './flowState';
import type { FlowGovernanceSettings, FlowGovernanceViewState } from './flowTypes';

export async function loadFlowGovernanceViewState(
  repositoryPath: string,
  branchRefNames: readonly string[],
  settings: FlowGovernanceSettings | undefined,
  signal?: AbortSignal
): Promise<FlowGovernanceViewState | undefined> {
  const resolution = await resolveFlowConfigForRepository(repositoryPath, settings);
  const classifiedReferences = classifyFlowBranches([...new Set(branchRefNames)], resolution.config);
  const branchTargets = await loadFlowBranchTargets(repositoryPath, signal);
  const references = applyFlowBranchTargets(classifiedReferences, branchTargets);
  const state = createFlowGovernanceViewState(resolution, references);
  const pullRequestTargets = state.enabled
    ? await loadFlowPullRequestTargets(repositoryPath, state.references, signal)
    : [];
  const enrichedState: FlowGovernanceViewState = { ...state, pullRequestTargets };
  return state.enabled || state.configSource === 'repository' || state.configSource === 'invalid'
    ? enrichedState
    : undefined;
}
