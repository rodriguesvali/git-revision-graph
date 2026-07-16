import { isRemotePermissionDeniedError, toOperationError } from '../../errorDetail';
import type { Branch, Repository } from '../../git';
import { formatUpstreamLabel } from '../../gitState';
import { syncCurrentHeadWithUpstream } from '../../refActions/currentBranch';
import { prepareFullRebuildRefresh } from '../../refActions/shared';
import type { RefActionServices } from '../../refActions/types';
import type { FlowStartBranchKind } from './flowTypes';

export type FlowBranchStartSyncPolicy = 'exact-sync' | 'not-behind';

export interface PrepareFlowBranchStartOptions {
  readonly kind: FlowStartBranchKind;
  readonly sourceBranch: string;
}

export interface FlowBranchStartPreflightDependencies {
  runWithRemoteFetchLoading<T>(operation: () => Promise<T>): Promise<T>;
}

const DEFAULT_DEPENDENCIES: FlowBranchStartPreflightDependencies = {
  runWithRemoteFetchLoading: (operation) => operation()
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
  const branchBeforeFetch = await getLocalBranch(repository, options.sourceBranch);
  if (!branchBeforeFetch?.upstream) {
    return true;
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
  const policy = getFlowBranchStartSyncPolicy(options.kind);
  if (behind <= 0 && (policy === 'not-behind' || ahead <= 0)) {
    return true;
  }

  const upstreamLabel = formatUpstreamLabel(sourceBranch.upstream.remote, sourceBranch.upstream.name);
  if (policy === 'not-behind' && ahead > 0) {
    await services.ui.showWarningMessage(
      `${options.sourceBranch} has diverged from ${upstreamLabel} (${formatFlowBranchSyncState(ahead, behind)}). ` +
      `Reconcile the branch manually before starting a new ${options.kind}.`,
      { modal: true }
    );
    return false;
  }

  const confirmed = await services.ui.confirm({
    message: `${options.sourceBranch} is not synchronized with ${upstreamLabel} ` +
      `(${formatFlowBranchSyncState(ahead, behind)}). Synchronize it before starting a new ${options.kind}?`,
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
      `(${formatFlowBranchSyncState(ahead, behind)}). Check it out and synchronize it before starting a new ${options.kind}.`,
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
      isRemotePermissionDeniedError(error) ? { modal: true } : undefined
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
