import {
  applyFlowBranchTargets,
  loadFlowBranchTargets
} from './flowEqualizationTarget';
import { classifyFlowBranches } from './flowBranchClassifier';
import { resolveFlowConfigForRepository } from './flowConfig';
import { loadFlowPullRequestTargets } from './flowPullRequestTargets';
import { createFlowGovernanceViewState } from './flowState';
import type {
  FlowBranchInfo,
  FlowGovernanceSettings,
  FlowGovernanceViewState,
  FlowPullRequestTargetInfo,
  NormalizedFlowConfig
} from './flowTypes';

export interface FlowGovernanceViewStateLoadServices {
  readonly loadBranchTargets?: typeof loadFlowBranchTargets;
  readonly loadPullRequestTargets?: (
    repositoryPath: string,
    references: readonly FlowBranchInfo[],
    signal: AbortSignal | undefined,
    config: Pick<NormalizedFlowConfig, 'patterns'>
  ) => Promise<readonly FlowPullRequestTargetInfo[]>;
}

export async function loadFlowGovernanceViewState(
  repositoryPath: string,
  branchRefNames: readonly string[],
  settings: FlowGovernanceSettings | undefined,
  signal?: AbortSignal,
  services: FlowGovernanceViewStateLoadServices = {}
): Promise<FlowGovernanceViewState | undefined> {
  const resolution = await resolveFlowConfigForRepository(repositoryPath, settings);
  const classifiedReferences = classifyFlowBranches([...new Set(branchRefNames)], resolution.config);
  const baseState = createFlowGovernanceViewState(resolution, classifiedReferences);
  if (!baseState.enabled) {
    return baseState.configSource === 'repository' || baseState.configSource === 'invalid'
      ? { ...baseState, pullRequestTargets: [] }
      : undefined;
  }

  const branchTargets = await (services.loadBranchTargets ?? loadFlowBranchTargets)(
    repositoryPath,
    signal
  );
  const references = applyFlowBranchTargets(classifiedReferences, branchTargets);
  const state = createFlowGovernanceViewState(resolution, references);
  const pullRequestTargets = services.loadPullRequestTargets
    ? await services.loadPullRequestTargets(
      repositoryPath,
      state.references,
      signal,
      resolution.config
    )
    : await loadFlowPullRequestTargets(
      repositoryPath,
      state.references,
      signal,
      undefined,
      resolution.config
    );
  const enrichedState: FlowGovernanceViewState = { ...state, pullRequestTargets };
  return enrichedState;
}
