import { toOperationError } from '../../errorDetail';
import { Repository } from '../../git';
import { validateGitBranchName } from '../../refActions/branchValidation';
import {
  ensureWorkspaceReadyForMutation,
  prepareFullRebuildRefresh,
  shouldRevealSourceControlAfterWorkspaceConflict
} from '../../refActions/shared';
import type { RefActionServices } from '../../refActions/types';
import {
  findFlowBranchNameCollision,
  formatFlowBranchNameCollision
} from './flowBranchNameCollision';
import { setFlowBranchDescription } from './flowBranchDescription';
import { DEFAULT_FLOW_CONFIG } from './flowDefaults';
import { resolveFlowEqualizationBranchName } from './flowEqualizationNaming';
import {
  prepareFlowEqualizationSources
} from './flowEqualizationPreflight';
import { setFlowEqualizationTarget } from './flowEqualizationTarget';
import type { FlowBranchStartPreflightDependencies } from './flowBranchStartPreflight';
import type { NormalizedFlowConfig } from './flowTypes';

export interface PrepareFlowEqualizationOptions {
  readonly originBranch: string;
  readonly targetBranch: string;
  readonly description: string;
  readonly config?: Pick<NormalizedFlowConfig, 'patterns'>;
}

export interface FlowEqualizationDependencies {
  readonly setDescription?: typeof setFlowBranchDescription;
  readonly setTarget?: typeof setFlowEqualizationTarget;
  readonly prepareSources?: typeof prepareFlowEqualizationSources;
  readonly sourcePreflight?: FlowBranchStartPreflightDependencies;
}

export async function prepareFlowEqualizationBranch(
  repository: Repository,
  options: PrepareFlowEqualizationOptions,
  services: RefActionServices,
  dependencies: FlowEqualizationDependencies = {}
): Promise<void> {
  const { originBranch, targetBranch } = options;
  if (!await ensureWorkspaceReadyForMutation(repository, 'preparing branch equalization', services)) {
    return;
  }

  const description = await validateEqualizationRequest(options, services);
  if (!description) {
    return;
  }

  if (!await (dependencies.prepareSources ?? prepareFlowEqualizationSources)(
    repository,
    { targetBranch, originBranch },
    services,
    dependencies.sourcePreflight
  )) {
    return;
  }

  const branchName = await resolveAvailableEqualizationBranchName(
    repository,
    targetBranch,
    options.config ?? DEFAULT_FLOW_CONFIG,
    services
  );
  if (!branchName) {
    return;
  }

  const branchBaseRefName = targetBranch;
  const mergeRefName = originBranch;
  const preparedRefresh = prepareFullRebuildRefresh(repository, services);
  let branchCreated = false;
  try {
    await repository.createBranch(branchName, true, branchBaseRefName);
    branchCreated = true;
    await (dependencies.setTarget ?? setFlowEqualizationTarget)(
      repository.rootUri.fsPath,
      branchName,
      targetBranch
    );
    try {
      await (dependencies.setDescription ?? setFlowBranchDescription)(
        repository.rootUri.fsPath,
        branchName,
        description
      );
    } catch (error) {
      await services.ui.showWarningMessage(
        toOperationError(`${branchName} was created, but its description could not be saved.`, error),
        { modal: true }
      );
    }
    await repository.merge(mergeRefName);
    services.refreshController.refresh(preparedRefresh.request);
    services.ui.showInformationMessage(
      `${branchName} was created locally from ${branchBaseRefName} and equalized with ${mergeRefName}. Review it, then publish and open a Pull Request when ready.`
    );
  } catch (error) {
    if (!branchCreated) {
      preparedRefresh.cancel();
    } else {
      services.refreshController.refresh(preparedRefresh.request);
    }

    const hasWorkspaceConflict = shouldRevealSourceControlAfterWorkspaceConflict(error, repository);
    await services.ui.showErrorMessage(
      toOperationError(
        branchCreated
          ? `The local branch ${branchName} was created, but equalization did not complete.`
          : 'Could not prepare the local equalization branch.',
        error
      ),
      hasWorkspaceConflict
        ? { modal: true, detail: 'Resolve the merge conflicts in Source Control. No branch was pushed.' }
        : undefined
    );
    if (hasWorkspaceConflict) {
      await services.ui.showSourceControl();
    }
  }
}

async function validateEqualizationRequest(
  options: PrepareFlowEqualizationOptions,
  services: RefActionServices
): Promise<string | undefined> {
  const description = options.description.trim();
  if (!description) {
    await services.ui.showErrorMessage('Could not prepare equalization. Description is required.');
    return undefined;
  }

  if (options.originBranch === options.targetBranch) {
    await services.ui.showErrorMessage(
      'Could not prepare equalization. Origin branch must differ from the target branch.'
    );
    return undefined;
  }

  return description;
}

async function resolveAvailableEqualizationBranchName(
  repository: Repository,
  targetBranch: string,
  config: Pick<NormalizedFlowConfig, 'patterns'>,
  services: RefActionServices
): Promise<string | undefined> {
  const branchNameResult = resolveFlowEqualizationBranchName(targetBranch, config);
  if (!branchNameResult.ok) {
    await services.ui.showErrorMessage(
      `Could not prepare equalization. ${branchNameResult.message}`
    );
    return undefined;
  }

  const branchName = branchNameResult.branchName;
  const validationMessage = validateGitBranchName(branchName);
  if (validationMessage) {
    await services.ui.showErrorMessage(`Could not prepare equalization. ${validationMessage}`);
    return undefined;
  }

  const collision = await findFlowBranchNameCollision(repository, branchName);
  if (collision) {
    await services.ui.showErrorMessage(
      `Could not prepare equalization. ${formatFlowBranchNameCollision(branchName, collision)}`
    );
    return undefined;
  }

  return branchName;
}
