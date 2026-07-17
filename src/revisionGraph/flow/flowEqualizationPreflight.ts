import type { Repository } from '../../git';
import type { RefActionServices } from '../../refActions/types';
import {
  prepareFlowBranchSource,
  type FlowBranchStartPreflightDependencies
} from './flowBranchStartPreflight';

export interface PrepareFlowEqualizationSourcesOptions {
  readonly targetBranch: string;
  readonly originBranch: string;
}

const EQUALIZATION_SOURCE_OPTIONS = {
  syncPolicy: 'not-behind' as const,
  actionLabel: 'preparing equalization',
  failureMessage: 'Equalization was not started.'
};

export async function prepareFlowEqualizationSources(
  repository: Repository,
  options: PrepareFlowEqualizationSourcesOptions,
  services: RefActionServices,
  dependencies?: FlowBranchStartPreflightDependencies
): Promise<boolean> {
  for (const sourceBranch of [options.targetBranch, options.originBranch]) {
    if (!await prepareFlowBranchSource(repository, {
      ...EQUALIZATION_SOURCE_OPTIONS,
      sourceBranch
    }, services, dependencies)) {
      return false;
    }
  }
  return true;
}
