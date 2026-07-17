import {
  isNonInteractiveGitAuthenticationError,
  isRemotePermissionDeniedError,
  toErrorDetail,
  toOperationError
} from '../../errorDetail';
import { Branch, Repository } from '../../git';
import { validateGitBranchName } from '../../refActions/branchValidation';
import {
  ensureWorkspaceReadyForMutation,
  prepareFullRebuildRefresh
} from '../../refActions/shared';
import type { RefActionServices } from '../../refActions/types';
import type { FlowStartBranchKind, NormalizedFlowConfig } from './flowTypes';
import { setFlowBranchDescription } from './flowBranchDescription';
import { setFlowBranchTarget } from './flowEqualizationTarget';

export type { FlowStartBranchKind } from './flowTypes';

export interface StartFlowBranchOptions {
  readonly kind: FlowStartBranchKind;
  readonly sourceBranch: string;
  readonly name: string;
  readonly description: string;
  readonly config: NormalizedFlowConfig;
}

export interface StartFlowBranchDependencies {
  readonly setDescription?: typeof setFlowBranchDescription;
  readonly setTarget?: typeof setFlowBranchTarget;
}

export interface FlowBranchNameResult {
  readonly ok: boolean;
  readonly branchName?: string;
  readonly message?: string;
}

export function resolveFlowBranchName(
  kind: FlowStartBranchKind,
  name: string,
  config: Pick<NormalizedFlowConfig, 'patterns'>
): FlowBranchNameResult {
  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    return { ok: false, message: 'Name is required.' };
  }

  const branchPattern = config.patterns[kind];
  const branchRegex = new RegExp(branchPattern);
  const prefix = inferFlowBranchLiteralPrefix(branchPattern);
  const candidates = getUniqueCandidates([
    trimmedName,
    prefix && !trimmedName.startsWith(prefix) ? `${prefix}${trimmedName}` : undefined
  ]);

  for (const candidate of candidates) {
    const validationMessage = validateGitBranchName(candidate);
    if (validationMessage) {
      continue;
    }

    if (branchRegex.test(candidate)) {
      return { ok: true, branchName: candidate };
    }
  }

  return {
    ok: false,
    message: `${getFlowBranchKindLabel(kind)} branch name must be a valid Git branch and match ${branchPattern}.`
  };
}

export async function startFlowBranch(
  repository: Repository,
  options: StartFlowBranchOptions,
  services: RefActionServices,
  dependencies: StartFlowBranchDependencies = {}
): Promise<void> {
  const branchKindLabel = getFlowBranchKindLabel(options.kind);
  const operationLabel = `starting a new ${options.kind}`;
  if (!await ensureWorkspaceReadyForMutation(repository, operationLabel, services, { allowWorkspaceChanges: true })) {
    return;
  }

  const branchNameResult = resolveFlowBranchName(options.kind, options.name, options.config);
  if (!branchNameResult.ok || !branchNameResult.branchName) {
    await services.ui.showErrorMessage(`Could not start the ${options.kind}. ${branchNameResult.message ?? `Invalid ${options.kind} name.`}`);
    return;
  }

  if (!options.description.trim()) {
    await services.ui.showErrorMessage(`Could not start the ${options.kind}. Description is required.`);
    return;
  }

  const branchName = branchNameResult.branchName;
  if (await getLocalBranch(repository, branchName)) {
    await services.ui.showErrorMessage(`Could not start the ${options.kind}. Branch ${branchName} already exists.`);
    return;
  }

  const preparedRefresh = prepareFullRebuildRefresh(repository, services);
  let branchCreated = false;
  try {
    await repository.createBranch(branchName, true, options.sourceBranch);
    branchCreated = true;
    await services.referenceManager.unsetBranchUpstream(repository, branchName);
    if (options.kind === 'task') {
      await (dependencies.setTarget ?? setFlowBranchTarget)(
        repository.rootUri.fsPath,
        branchName,
        options.sourceBranch
      );
    }
    const description = options.description.trim();
    try {
      await (dependencies.setDescription ?? setFlowBranchDescription)(
        repository.rootUri.fsPath,
        branchName,
        description
      );
    } catch (error) {
      await services.ui.showWarningMessage(
        toOperationError(`${branchKindLabel} branch ${branchName} was created, but its description could not be saved.`, error),
        { modal: true }
      );
    }

    await offerFlowBranchPublication(repository, branchName, branchKindLabel, options.sourceBranch, services);
    services.refreshController.refresh(preparedRefresh.request);
  } catch (error) {
    if (!branchCreated) {
      preparedRefresh.cancel();
    } else {
      services.refreshController.refresh(preparedRefresh.request);
    }

    await services.ui.showErrorMessage(toOperationError(`Could not start the ${options.kind}.`, error));
  }
}

async function offerFlowBranchPublication(
  repository: Repository,
  branchName: string,
  branchKindLabel: string,
  sourceBranch: string,
  services: RefActionServices
): Promise<void> {
  const publishRequested = await services.ui.confirm({
    message: `${branchKindLabel} branch ${branchName} was created and checked out. Publish it to a remote now?`,
    confirmLabel: 'Publish Branch'
  });
  if (!publishRequested) {
    services.ui.showInformationMessage(
      `${branchKindLabel} branch ${branchName} was created and checked out from ${sourceBranch}.`
    );
    return;
  }

  try {
    const remoteNames = await services.referenceManager.getRemoteNames(repository);
    if (remoteNames.length === 0) {
      services.ui.showInformationMessage(
        `${branchKindLabel} branch ${branchName} was created locally, but no Git remote is configured.`
      );
      return;
    }

    const remoteName = remoteNames.length === 1
      ? remoteNames[0]
      : await services.ui.pickRemoteName(remoteNames, `Choose a remote for ${branchName}`);
    if (!remoteName) {
      services.ui.showInformationMessage(
        `${branchKindLabel} branch ${branchName} was created locally and was not published.`
      );
      return;
    }

    await repository.push(remoteName, branchName, true);
    services.ui.showInformationMessage(
      `${branchKindLabel} branch ${branchName} was created and published to ${remoteName}/${branchName}.`
    );
  } catch (error) {
    const operationMessage = `${branchKindLabel} branch ${branchName} was created locally, but could not be published.`;
    if (isNonInteractiveGitAuthenticationError(error)) {
      await services.ui.showErrorMessage(
        `${operationMessage} Git authentication is unavailable for this operation. ` +
        `Open Source Control and run "Git: Publish Branch", or configure Git credentials for command-line pushes. ${toErrorDetail(error)}`
      );
      await services.ui.showSourceControl();
      return;
    }

    await services.ui.showErrorMessage(
      toOperationError(operationMessage, error),
      isRemotePermissionDeniedError(error) ? { modal: true } : undefined
    );
  }
}

export function resolveFlowReleaseBranchName(
  name: string,
  config: Pick<NormalizedFlowConfig, 'patterns'>
): FlowBranchNameResult {
  return resolveFlowBranchName('release', name, config);
}

export async function startFlowReleaseBranch(
  repository: Repository,
  options: Omit<StartFlowBranchOptions, 'kind'>,
  services: RefActionServices
): Promise<void> {
  await startFlowBranch(repository, { ...options, kind: 'release' }, services);
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

async function getLocalBranch(repository: Repository, branchName: string): Promise<Branch | undefined> {
  try {
    return await repository.getBranch(branchName);
  } catch {
    return undefined;
  }
}

function getFlowBranchKindLabel(kind: FlowStartBranchKind): string {
  if (kind === 'release') {
    return 'Release';
  }
  if (kind === 'feature') {
    return 'Feature';
  }
  if (kind === 'task') {
    return 'Task';
  }
  return kind === 'bug' ? 'Bug' : 'Hotfix';
}
