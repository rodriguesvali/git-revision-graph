import { toOperationError } from '../../errorDetail';
import { execGit, GIT_EXEC_LOCAL_MUTATION_PROFILE } from '../../gitExec';
import { Repository } from '../../git';
import { validateGitBranchName } from '../../refActions/branchValidation';
import {
  ensureWorkspaceReadyForMutation,
  prepareFullRebuildRefresh
} from '../../refActions/shared';
import type { RefActionServices } from '../../refActions/types';
import type { NormalizedFlowConfig } from './flowTypes';

export interface StartFlowReleaseBranchOptions {
  readonly sourceBranch: string;
  readonly name: string;
  readonly description?: string;
  readonly config: NormalizedFlowConfig;
}

export interface FlowReleaseBranchNameResult {
  readonly ok: boolean;
  readonly branchName?: string;
  readonly message?: string;
}

export function resolveFlowReleaseBranchName(
  name: string,
  config: Pick<NormalizedFlowConfig, 'patterns'>
): FlowReleaseBranchNameResult {
  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    return { ok: false, message: 'Name is required.' };
  }

  const releasePattern = config.patterns.release;
  const releaseRegex = new RegExp(releasePattern);
  const prefix = inferFlowBranchLiteralPrefix(releasePattern);
  const candidates = getUniqueCandidates([
    trimmedName,
    prefix && !trimmedName.startsWith(prefix) ? `${prefix}${trimmedName}` : undefined
  ]);

  for (const candidate of candidates) {
    const validationMessage = validateGitBranchName(candidate);
    if (validationMessage) {
      continue;
    }

    if (releaseRegex.test(candidate)) {
      return { ok: true, branchName: candidate };
    }
  }

  return {
    ok: false,
    message: `Release branch name must be a valid Git branch and match ${releasePattern}.`
  };
}

export async function startFlowReleaseBranch(
  repository: Repository,
  options: StartFlowReleaseBranchOptions,
  services: RefActionServices
): Promise<void> {
  if (!await ensureWorkspaceReadyForMutation(repository, 'starting a new release', services, { allowWorkspaceChanges: true })) {
    return;
  }

  const branchNameResult = resolveFlowReleaseBranchName(options.name, options.config);
  if (!branchNameResult.ok || !branchNameResult.branchName) {
    await services.ui.showErrorMessage(`Could not start the release. ${branchNameResult.message ?? 'Invalid release name.'}`);
    return;
  }

  const branchName = branchNameResult.branchName;
  if (await getLocalBranch(repository, branchName)) {
    await services.ui.showErrorMessage(`Could not start the release. Branch ${branchName} already exists.`);
    return;
  }

  const preparedRefresh = prepareFullRebuildRefresh(repository, services);
  let branchCreated = false;
  try {
    await repository.createBranch(branchName, true, options.sourceBranch);
    branchCreated = true;
    await services.referenceManager.unsetBranchUpstream(repository, branchName);
    const description = options.description?.trim();
    if (description) {
      try {
        await setGitBranchDescription(repository.rootUri.fsPath, branchName, description);
      } catch (error) {
        await services.ui.showWarningMessage(
          toOperationError(`Release branch ${branchName} was created, but its description could not be saved.`, error)
        );
      }
    }

    services.refreshController.refresh(preparedRefresh.request);
    services.ui.showInformationMessage(`Release branch ${branchName} was created and checked out from ${options.sourceBranch}.`);
  } catch (error) {
    if (!branchCreated) {
      preparedRefresh.cancel();
    } else {
      services.refreshController.refresh(preparedRefresh.request);
    }

    await services.ui.showErrorMessage(toOperationError('Could not start the release.', error));
  }
}

function inferFlowBranchLiteralPrefix(pattern: string): string | undefined {
  if (!pattern.startsWith('^')) {
    return undefined;
  }

  let prefix = '';
  for (let index = 1; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (!char) {
      break;
    }

    if (char === '\\') {
      const next = pattern[index + 1];
      if (!next) {
        break;
      }
      prefix += next;
      index += 1;
      continue;
    }

    if ('.+*?()[]{}|$^'.includes(char)) {
      break;
    }

    prefix += char;
  }

  return prefix.length > 0 ? prefix : undefined;
}

function getUniqueCandidates(values: readonly (string | undefined)[]): readonly string[] {
  return [...new Set(values.filter((value): value is string => !!value))];
}

async function getLocalBranch(repository: Repository, branchName: string): Promise<unknown | undefined> {
  try {
    return await repository.getBranch(branchName);
  } catch {
    return undefined;
  }
}

async function setGitBranchDescription(
  repositoryPath: string,
  branchName: string,
  description: string
): Promise<void> {
  await execGit(
    repositoryPath,
    ['config', `branch.${branchName}.description`, description],
    GIT_EXEC_LOCAL_MUTATION_PROFILE
  );
}
