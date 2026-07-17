import { toOperationError } from '../../errorDetail';
import type { Branch, Repository } from '../../git';
import { formatUpstreamLabel } from '../../gitState';
import { syncCurrentHeadWithUpstream } from '../../refActions/currentBranch';
import { prepareFullRebuildRefresh } from '../../refActions/shared';
import type { RefActionServices } from '../../refActions/types';
import {
  checkFlowPullRequestSourcePublication,
  type FlowPullRequestSourcePublication
} from './flowPullRequestPreflight';
import type { FlowStartBranchKind } from './flowTypes';

export type FlowBranchStartSyncPolicy = 'exact-sync' | 'not-behind';

export interface PrepareFlowBranchStartOptions {
  readonly kind: FlowStartBranchKind;
  readonly sourceBranch: string;
}

export interface PrepareFlowBranchSourceOptions {
  readonly sourceBranch: string;
  readonly syncPolicy: FlowBranchStartSyncPolicy;
  readonly actionLabel: string;
  readonly failureMessage: string;
}

export interface FlowBranchStartPreflightDependencies {
  runWithRemoteFetchLoading<T>(operation: () => Promise<T>): Promise<T>;
  readonly checkSourcePublication?: typeof checkFlowPullRequestSourcePublication;
}

const DEFAULT_DEPENDENCIES: FlowBranchStartPreflightDependencies = {
  runWithRemoteFetchLoading: (operation) => operation(),
  checkSourcePublication: checkFlowPullRequestSourcePublication
};

export function getFlowBranchStartSyncPolicy(kind: FlowStartBranchKind): FlowBranchStartSyncPolicy {
  return kind === 'release' || kind === 'feature' || kind === 'hotfix'
    ? 'exact-sync'
    : 'not-behind';
}

export async function prepareFlowBranchStart(
  repository: Repository,
  options: PrepareFlowBranchStartOptions,
  services: RefActionServices,
  dependencies: FlowBranchStartPreflightDependencies = DEFAULT_DEPENDENCIES
): Promise<boolean> {
  return prepareFlowBranchSource(repository, {
    sourceBranch: options.sourceBranch,
    syncPolicy: getFlowBranchStartSyncPolicy(options.kind),
    actionLabel: `starting a new ${options.kind}`,
    failureMessage: `The new ${options.kind} form was not opened.`
  }, services, dependencies);
}

export async function prepareFlowBranchSource(
  repository: Repository,
  options: PrepareFlowBranchSourceOptions,
  services: RefActionServices,
  dependencies: FlowBranchStartPreflightDependencies = DEFAULT_DEPENDENCIES
): Promise<boolean> {
  const branchBeforeFetch = await getLocalBranch(repository, options.sourceBranch);
  if (!branchBeforeFetch) {
    await services.ui.showErrorMessage(
      `Could not verify the local ${options.sourceBranch} branch before ${options.actionLabel}.`,
      { modal: true }
    );
    return false;
  }
  if (!branchBeforeFetch.upstream) {
    return prepareUntrackedFlowBranchSource(repository, options, services, dependencies);
  }

  if (!await fetchFlowBranchUpstream(
    repository,
    options.sourceBranch,
    branchBeforeFetch,
    services,
    dependencies
  )) {
    return false;
  }

  const sourceBranch = await getLocalBranch(repository, options.sourceBranch);
  if (!sourceBranch?.upstream) {
    await services.ui.showErrorMessage(
      `Could not verify whether ${options.sourceBranch} is synchronized after fetching its upstream.`,
      { modal: true }
    );
    return false;
  }

  const ahead = sourceBranch.ahead ?? 0;
  const behind = sourceBranch.behind ?? 0;
  const policy = options.syncPolicy;
  if (behind <= 0 && (policy === 'not-behind' || ahead <= 0)) {
    return true;
  }

  const upstreamLabel = formatUpstreamLabel(sourceBranch.upstream.remote, sourceBranch.upstream.name);
  if (policy === 'not-behind' && ahead > 0) {
    await services.ui.showWarningMessage(
      `${options.sourceBranch} has diverged from ${upstreamLabel} (${formatFlowBranchSyncState(ahead, behind)}). ` +
      `Reconcile the branch manually before ${options.actionLabel}.`,
      { modal: true }
    );
    return false;
  }

  const confirmed = await services.ui.confirm({
    message: `${options.sourceBranch} is not synchronized with ${upstreamLabel} ` +
      `(${formatFlowBranchSyncState(ahead, behind)}). Synchronize it before ${options.actionLabel}?`,
    confirmLabel: 'Synchronize and Continue'
  });
  if (!confirmed) {
    return false;
  }

  if (repository.state.HEAD?.name === options.sourceBranch) {
    return syncCurrentHeadWithUpstream(repository, services);
  }

  if (ahead > 0) {
    await services.ui.showWarningMessage(
      `${options.sourceBranch} cannot be synchronized safely while another branch is checked out ` +
      `(${formatFlowBranchSyncState(ahead, behind)}). Check it out and synchronize it before ${options.actionLabel}.`,
      { modal: true }
    );
    return false;
  }

  return fastForwardNonCurrentFlowBranch(
    repository,
    options.sourceBranch,
    sourceBranch.upstream.remote,
    sourceBranch.upstream.name,
    upstreamLabel,
    services,
    dependencies
  );
}

async function prepareUntrackedFlowBranchSource(
  repository: Repository,
  options: PrepareFlowBranchSourceOptions,
  services: RefActionServices,
  dependencies: FlowBranchStartPreflightDependencies
): Promise<boolean> {
  try {
    const remoteNames = await services.referenceManager.getRemoteNames(repository);
    if (remoteNames.length === 0) {
      return true;
    }

    const remoteName = remoteNames.length === 1
      ? remoteNames[0]
      : await services.ui.pickRemoteName(
        remoteNames,
        `Choose a remote to verify ${options.sourceBranch} before ${options.actionLabel}`
      );
    if (!remoteName) {
      return false;
    }

    const checkSourcePublication = dependencies.checkSourcePublication ?? checkFlowPullRequestSourcePublication;
    let publication = await dependencies.runWithRemoteFetchLoading(() => checkSourcePublication(
      repository,
      remoteName,
      options.sourceBranch
    ));
    const policy = options.syncPolicy;
    if (publication.status === 'ready' || (publication.status === 'unpushed' && policy === 'not-behind')) {
      return true;
    }
    if (!await canPublishUntrackedFlowBranch(publication, repository, options, services)) {
      return false;
    }

    const isPublish = publication.status === 'unpublished';
    const confirmed = await services.ui.confirm({
      message: isPublish
        ? `${options.sourceBranch} is not available on ${remoteName}. Publish it before ${options.actionLabel}?`
        : `${options.sourceBranch} has commits that are not available on ${remoteName}. Push them before ${options.actionLabel}?`,
      confirmLabel: isPublish ? 'Publish and Continue' : 'Push and Continue'
    });
    if (!confirmed) {
      return false;
    }

    await repository.push(remoteName, options.sourceBranch, true);
    publication = await dependencies.runWithRemoteFetchLoading(() => checkSourcePublication(
      repository,
      remoteName,
      options.sourceBranch
    ));
    if (publication.status !== 'ready') {
      await services.ui.showWarningMessage(
        `${options.sourceBranch} was pushed, but could not be confirmed as synchronized with ` +
        `${remoteName}/${options.sourceBranch}. ${options.failureMessage}`,
        { modal: true }
      );
      return false;
    }

    services.refreshController.refresh();
    return true;
  } catch (error) {
    await services.ui.showErrorMessage(
      toOperationError(`Could not verify or publish ${options.sourceBranch} before ${options.actionLabel}.`, error),
      { modal: true }
    );
    return false;
  }
}

async function canPublishUntrackedFlowBranch(
  publication: FlowPullRequestSourcePublication,
  repository: Repository,
  options: PrepareFlowBranchSourceOptions,
  services: RefActionServices
): Promise<boolean> {
  if (publication.status === 'remote-ahead') {
    await services.ui.showWarningMessage(
      `${publication.remoteName}/${options.sourceBranch} contains commits that are not present locally. ` +
      `Configure and synchronize the upstream before ${options.actionLabel}.`,
      { modal: true }
    );
    return false;
  }
  if (publication.status === 'diverged') {
    await services.ui.showWarningMessage(
      `${options.sourceBranch} has diverged from ${publication.remoteName}/${options.sourceBranch}. ` +
      `Resolve the divergence before ${options.actionLabel}.`,
      { modal: true }
    );
    return false;
  }
  if (publication.status === 'unknown') {
    await services.ui.showWarningMessage(
      `Could not verify ${options.sourceBranch} on ${publication.remoteName}. ` +
      `${options.failureMessage} ${publication.detail ?? ''}`,
      { modal: true }
    );
    return false;
  }

  const remote = repository.state.remotes.find((candidate) => candidate.name === publication.remoteName);
  if (remote?.isReadOnly) {
    await services.ui.showWarningMessage(
      `${publication.remoteName} is read-only and ${options.sourceBranch} cannot be published or updated before ` +
      `${options.actionLabel}.`,
      { modal: true }
    );
    return false;
  }
  return publication.status === 'unpublished' || publication.status === 'unpushed';
}

async function fetchFlowBranchUpstream(
  repository: Repository,
  branchName: string,
  branch: Branch,
  services: RefActionServices,
  dependencies: FlowBranchStartPreflightDependencies
): Promise<boolean> {
  const upstream = branch.upstream;
  if (!upstream) {
    return true;
  }

  const upstreamLabel = formatUpstreamLabel(upstream.remote, upstream.name);
  const upstreamBranchName = getUpstreamBranchName(upstream.remote, upstream.name);
  try {
    await dependencies.runWithRemoteFetchLoading(() => repository.fetch({
      remote: upstream.remote,
      ref: `refs/heads/${upstreamBranchName}:refs/remotes/${upstream.remote}/${upstreamBranchName}`
    }));
    return true;
  } catch (error) {
    await services.ui.showErrorMessage(
      toOperationError(`Could not fetch ${upstreamLabel} before checking ${branchName} synchronization.`, error),
      { modal: true }
    );
    return false;
  }
}

async function fastForwardNonCurrentFlowBranch(
  repository: Repository,
  branchName: string,
  remoteName: string,
  upstreamName: string,
  upstreamLabel: string,
  services: RefActionServices,
  dependencies: FlowBranchStartPreflightDependencies
): Promise<boolean> {
  const remoteBranchName = getUpstreamBranchName(remoteName, upstreamName);
  const preparedRefresh = prepareFullRebuildRefresh(repository, services);
  try {
    await dependencies.runWithRemoteFetchLoading(() => repository.fetch({
      remote: remoteName,
      ref: `refs/heads/${remoteBranchName}:refs/heads/${branchName}`
    }));
  } catch (error) {
    preparedRefresh.cancel();
    await services.ui.showErrorMessage(
      toOperationError(`Could not synchronize ${branchName} with ${upstreamLabel}.`, error),
      { modal: true }
    );
    return false;
  }

  services.refreshController.refresh(preparedRefresh.request);
  services.ui.showInformationMessage(`${branchName} was updated from ${upstreamLabel}.`);
  return true;
}

async function getLocalBranch(repository: Repository, branchName: string): Promise<Branch | undefined> {
  try {
    return await repository.getBranch(branchName);
  } catch {
    return undefined;
  }
}

function formatFlowBranchSyncState(ahead: number, behind: number): string {
  if (ahead > 0 && behind > 0) {
    return `${ahead} ahead, ${behind} behind`;
  }
  if (behind > 0) {
    return `${behind} behind`;
  }
  return `${ahead} ahead`;
}

function getUpstreamBranchName(remoteName: string, upstreamName: string): string {
  const remotePrefix = `${remoteName}/`;
  const fullRemotePrefix = `refs/remotes/${remoteName}/`;
  if (upstreamName.startsWith(fullRemotePrefix)) {
    return upstreamName.slice(fullRemotePrefix.length);
  }
  return upstreamName.startsWith(remotePrefix) ? upstreamName.slice(remotePrefix.length) : upstreamName;
}
