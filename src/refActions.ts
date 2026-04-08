import { ChangeQuickPickItem, toChangeQuickPickItems } from './changePresentation';
import { toErrorDetail } from './errorDetail';
import { Branch, RefType, Repository } from './git';

export type RefActionKind = 'head' | 'branch' | 'remote' | 'tag';

export interface RefSelection {
  readonly refName: string;
  readonly label: string;
}

export interface RefActionTarget extends RefSelection {
  readonly kind: RefActionKind;
}

export interface RefActionUi {
  pickChange(items: readonly ChangeQuickPickItem[], placeHolder: string): Promise<ChangeQuickPickItem | undefined>;
  promptBranchName(options: { readonly prompt: string; readonly value: string }): Promise<string | undefined>;
  confirm(options: { readonly message: string; readonly confirmLabel: string }): Promise<boolean>;
  showInformationMessage(message: string): void;
  showWarningMessage(message: string): void;
  showErrorMessage(message: string): Promise<void>;
}

export interface DiffPresenter {
  openBetweenRefs(repository: Repository, change: ChangeQuickPickItem['change'], leftRef: string, rightRef: string): Promise<void>;
  openWithWorktree(repository: Repository, change: ChangeQuickPickItem['change'], ref: string): Promise<void>;
}

export interface RefreshController {
  refresh(): void;
  updateViewMessage(): void;
}

export interface ReferenceManager {
  deleteRemoteBranch(repository: Repository, remoteName: string, branchName: string): Promise<void>;
  unsetBranchUpstream(repository: Repository, branchName: string): Promise<void>;
}

export interface AncestryInspector {
  isRefAncestorOfHead(repository: Repository, refName: string, headRefName: string): Promise<boolean>;
}

export interface RefActionServices {
  readonly ui: RefActionUi;
  readonly diffPresenter: DiffPresenter;
  readonly refreshController: RefreshController;
  readonly referenceManager: ReferenceManager;
  readonly ancestryInspector: AncestryInspector;
  readonly formatPath: (fsPath: string) => string;
}

interface HeadSyncState {
  readonly branchName: string;
  readonly upstreamLabel: string;
  readonly ahead: number;
  readonly behind: number;
}

export async function compareResolvedRefs(
  repository: Repository,
  left: RefSelection,
  right: RefSelection,
  services: RefActionServices
): Promise<void> {
  try {
    const changes = await repository.diffBetween(left.refName, right.refName);
    if (changes.length === 0) {
      services.ui.showInformationMessage(`No differences found between ${left.label} and ${right.label}.`);
      return;
    }

    const pickedChange = await services.ui.pickChange(
      toChangeQuickPickItems(changes, services.formatPath),
      `Changed files between ${left.label} and ${right.label}`
    );
    if (!pickedChange) {
      return;
    }

    await services.diffPresenter.openBetweenRefs(repository, pickedChange.change, left.refName, right.refName);
  } catch (error) {
    await services.ui.showErrorMessage(`Could not compare references. ${toErrorDetail(error)}`);
  }
}

export async function compareResolvedRefWithWorktree(
  repository: Repository,
  target: RefSelection,
  services: RefActionServices
): Promise<void> {
  try {
    const changes = await repository.diffWith(target.refName);
    if (changes.length === 0) {
      services.ui.showInformationMessage(`The worktree is already aligned with ${target.label}.`);
      return;
    }

    const pickedChange = await services.ui.pickChange(
      toChangeQuickPickItems(changes, services.formatPath),
      `Changed files between ${target.label} and the worktree`
    );
    if (!pickedChange) {
      return;
    }

    await services.diffPresenter.openWithWorktree(repository, pickedChange.change, target.refName);
  } catch (error) {
    await services.ui.showErrorMessage(`Could not compare the reference with the worktree. ${toErrorDetail(error)}`);
  }
}

export async function checkoutResolvedReference(
  repository: Repository,
  target: RefActionTarget,
  services: RefActionServices
): Promise<void> {
  try {
    if ((target.kind === 'head' || target.kind === 'branch') && repository.state.HEAD?.name === target.refName) {
      services.ui.showInformationMessage(`${target.label} is already checked out.`);
      return;
    }

    if (target.kind === 'remote') {
      await createBranchFromResolvedReference(repository, target, services);
      return;
    }

    if (target.kind === 'tag') {
      await createBranchFromResolvedReference(repository, target, services);
      return;
    }

    const confirmed = await services.ui.confirm({
      message: `Check out ${target.label}?`,
      confirmLabel: 'Checkout'
    });
    if (!confirmed) {
      return;
    }

    await repository.checkout(target.refName);
    services.ui.showInformationMessage(`Checkout completed for ${target.label}.`);
    services.refreshController.refresh();
    services.refreshController.updateViewMessage();
  } catch (error) {
    await services.ui.showErrorMessage(`Could not check out the reference. ${toErrorDetail(error)}`);
  }
}

export async function createBranchFromResolvedReference(
  repository: Repository,
  target: RefActionTarget,
  services: RefActionServices
): Promise<void> {
  try {
    const branchCreation = getBranchCreationTarget(repository, target);
    const branchName = await services.ui.promptBranchName({
      prompt: branchCreation.prompt,
      value: branchCreation.suggestedLocalName
    });

    if (!branchName) {
      return;
    }

    await repository.createBranch(branchName, true, branchCreation.startPointRefName);
    if (branchCreation.upstreamRefName) {
      await repository.setBranchUpstream(branchName, branchCreation.upstreamRefName);
    } else {
      await services.referenceManager.unsetBranchUpstream(repository, branchName);
    }

    services.ui.showInformationMessage(
      branchCreation.upstreamRefName
        ? `Branch ${branchName} was created and checked out from ${branchCreation.upstreamRefName}.`
        : `Branch ${branchName} was created and checked out from ${target.label}.`
    );
    services.refreshController.refresh();
    services.refreshController.updateViewMessage();
  } catch (error) {
    await services.ui.showErrorMessage(`Could not create the branch. ${toErrorDetail(error)}`);
  }
}

export async function syncCurrentHeadWithUpstream(
  repository: Repository,
  services: RefActionServices
): Promise<void> {
  try {
    const syncState = getCurrentHeadSyncState(repository);
    if (!syncState) {
      services.ui.showInformationMessage('The current branch is not tracking a remote branch.');
      return;
    }

    if (syncState.ahead <= 0 && syncState.behind <= 0) {
      services.ui.showInformationMessage(`${syncState.branchName} is already synchronized with ${syncState.upstreamLabel}.`);
      return;
    }

    if (syncState.behind > 0) {
      await repository.pull();
    }

    if (syncState.ahead > 0) {
      await repository.push();
    }

    services.refreshController.refresh();
    services.refreshController.updateViewMessage();
    services.ui.showInformationMessage(buildSyncResultMessage(syncState));
  } catch (error) {
    await services.ui.showErrorMessage(`Could not synchronize the current branch. ${toErrorDetail(error)}`);
  }
}

export async function mergeResolvedReference(
  repository: Repository,
  target: RefSelection,
  services: RefActionServices
): Promise<void> {
  try {
    const currentBranch = repository.state.HEAD?.name ?? 'current HEAD';
    if (repository.state.HEAD?.name === target.refName) {
      services.ui.showInformationMessage('The current branch cannot be merged into itself.');
      return;
    }

    if (
      repository.state.HEAD?.name &&
      await services.ancestryInspector.isRefAncestorOfHead(repository, target.refName, repository.state.HEAD.name)
    ) {
      services.ui.showInformationMessage(`${target.label} is already contained in ${currentBranch}.`);
      return;
    }

    const confirmed = await services.ui.confirm({
      message: `Merge ${target.label} into ${currentBranch}?`,
      confirmLabel: 'Merge'
    });
    if (!confirmed) {
      return;
    }

    await repository.merge(target.refName);
    services.refreshController.refresh();
    services.refreshController.updateViewMessage();
    services.ui.showInformationMessage(`Merge from ${target.label} started in ${currentBranch}.`);
  } catch (error) {
    await services.ui.showErrorMessage(
      `Merge did not complete. If there were conflicts, finish it in the VS Code Source Control experience. ${toErrorDetail(error)}`
    );
  }
}

export async function deleteResolvedReference(
  repository: Repository,
  target: RefActionTarget,
  services: RefActionServices
): Promise<void> {
  try {
    if (target.kind === 'remote') {
      const remoteTarget = parseRemoteDeletionTarget(target.refName);
      if (!remoteTarget || remoteTarget.branchName === 'HEAD') {
        services.ui.showInformationMessage(`The remote reference ${target.label} cannot be deleted from this view.`);
        return;
      }

      const confirmed = await services.ui.confirm({
        message: `Delete the Remote Branch ${target.label}?\n\nThis will remove the branch from ${remoteTarget.remoteName} and may affect other collaborators.`,
        confirmLabel: 'Delete Remote Reference'
      });
      if (!confirmed) {
        return;
      }

      await services.referenceManager.deleteRemoteBranch(repository, remoteTarget.remoteName, remoteTarget.branchName);
      services.ui.showInformationMessage(`Remote branch ${target.label} was deleted from ${remoteTarget.remoteName}.`);
      services.refreshController.refresh();
      services.refreshController.updateViewMessage();
      return;
    }

    if (target.kind === 'tag') {
      const confirmed = await services.ui.confirm({
        message: `Delete the Tag ${target.label}?`,
        confirmLabel: 'Delete'
      });
      if (!confirmed) {
        return;
      }

      await repository.deleteTag(target.refName);
      services.ui.showInformationMessage(`Tag ${target.label} was deleted.`);
      services.refreshController.refresh();
      services.refreshController.updateViewMessage();
      return;
    }

    const branch = await getLocalBranchForDeletion(repository, target.refName);
    const upstreamLabel = branch?.upstream
      ? formatUpstreamLabel(branch.upstream.remote, branch.upstream.name)
      : undefined;

    const confirmed = await services.ui.confirm({
      message: buildDeleteBranchConfirmationMessage(target.label, upstreamLabel),
      confirmLabel: 'Delete'
    });
    if (!confirmed) {
      return;
    }

    await deleteLocalBranch(repository, target, upstreamLabel, services);
  } catch (error) {
    await services.ui.showErrorMessage(`Could not delete the reference. ${toErrorDetail(error)}`);
  }
}

function resolveRemoteCheckoutTarget(
  repository: Repository,
  refName: string
): {
  startPointRefName: string;
  upstreamRefName: string | undefined;
  suggestedLocalName: string;
} {
  const remoteTarget = parseRemoteDeletionTarget(refName);
  if (!remoteTarget || remoteTarget.branchName !== 'HEAD') {
    return {
      startPointRefName: refName,
      upstreamRefName: refName,
      suggestedLocalName: getSuggestedLocalBranchName(refName)
    };
  }

  const symbolicRef = repository.state.refs.find(
    (ref) => ref.type === RefType.RemoteHead && ref.name === refName
  );
  const candidates = repository.state.refs.filter(
    (ref) =>
      ref.type === RefType.RemoteHead &&
      ref.name &&
      ref.name.startsWith(`${remoteTarget.remoteName}/`) &&
      ref.name !== refName
  );

  const upstreamRef =
    candidates.find((ref) => ref.commit && symbolicRef?.commit && ref.commit === symbolicRef.commit) ??
    candidates.find((ref) => ref.name === `${remoteTarget.remoteName}/${repository.state.HEAD?.name}`) ??
    candidates.find((ref) => ref.name === `${remoteTarget.remoteName}/main`) ??
    candidates.find((ref) => ref.name === `${remoteTarget.remoteName}/master`) ??
    candidates[0];

  return {
    startPointRefName: upstreamRef?.name ?? refName,
    upstreamRefName: upstreamRef?.name,
    suggestedLocalName: upstreamRef?.name ? getSuggestedLocalBranchName(upstreamRef.name) : ''
  };
}

function getBranchCreationTarget(
  repository: Repository,
  target: RefActionTarget
): {
  startPointRefName: string;
  upstreamRefName: string | undefined;
  suggestedLocalName: string;
  prompt: string;
} {
  if (target.kind === 'remote') {
    const remoteCheckout = resolveRemoteCheckoutTarget(repository, target.refName);
    return {
      ...remoteCheckout,
      prompt: remoteCheckout.upstreamRefName
        ? `Create a New Local Branch Tracking ${remoteCheckout.upstreamRefName}`
        : `Create a New Local Branch from ${target.label}`
    };
  }

  return {
    startPointRefName: target.refName,
    upstreamRefName: undefined,
    suggestedLocalName: getSuggestedNewBranchName(target.refName, target.kind),
    prompt: `Create a New Local Branch from ${target.label}`
  };
}

function parseRemoteDeletionTarget(refName: string): { remoteName: string; branchName: string } | undefined {
  const firstSlash = refName.indexOf('/');
  if (firstSlash <= 0 || firstSlash === refName.length - 1) {
    return undefined;
  }

  return {
    remoteName: refName.slice(0, firstSlash),
    branchName: refName.slice(firstSlash + 1)
  };
}

function getSuggestedLocalBranchName(refName: string): string {
  const firstSlash = refName.indexOf('/');
  return firstSlash >= 0 ? refName.slice(firstSlash + 1) : refName;
}

function getSuggestedNewBranchName(refName: string, kind: RefActionKind): string {
  if (kind === 'head' || kind === 'branch') {
    return `${refName}-copy`;
  }

  return refName;
}

function getCurrentHeadSyncState(repository: Repository): HeadSyncState | undefined {
  const head = repository.state.HEAD;
  if (!head?.name || !head.upstream) {
    return undefined;
  }

  return {
    branchName: head.name,
    upstreamLabel: formatUpstreamLabel(head.upstream.remote, head.upstream.name),
    ahead: head.ahead ?? 0,
    behind: head.behind ?? 0
  };
}

function formatUpstreamLabel(remoteName: string, refName: string): string {
  return refName.startsWith(`${remoteName}/`) ? refName : `${remoteName}/${refName}`;
}

function buildSyncResultMessage(syncState: HeadSyncState): string {
  if (syncState.behind > 0 && syncState.ahead > 0) {
    return `${syncState.branchName} was synchronized with ${syncState.upstreamLabel}.`;
  }

  if (syncState.behind > 0) {
    return `${syncState.branchName} was updated from ${syncState.upstreamLabel}.`;
  }

  return `${syncState.branchName} was pushed to ${syncState.upstreamLabel}.`;
}

async function getLocalBranchForDeletion(repository: Repository, branchName: string): Promise<Branch | undefined> {
  try {
    return await repository.getBranch(branchName);
  } catch {
    return undefined;
  }
}

async function deleteLocalBranch(
  repository: Repository,
  target: RefActionTarget,
  upstreamLabel: string | undefined,
  services: RefActionServices
): Promise<void> {
  try {
    await repository.deleteBranch(target.refName, false);
    services.ui.showInformationMessage(`Branch ${target.label} was deleted.`);
    services.refreshController.refresh();
    services.refreshController.updateViewMessage();
  } catch (error) {
    if (!hasGitErrorCode(error, 'BranchNotFullyMerged')) {
      throw error;
    }

    const confirmed = await services.ui.confirm({
      message: buildForceDeleteBranchMessage(target.label, upstreamLabel),
      confirmLabel: 'Force Delete'
    });
    if (!confirmed) {
      return;
    }

    await repository.deleteBranch(target.refName, true);
    services.ui.showInformationMessage(`Branch ${target.label} was force deleted.`);
    services.refreshController.refresh();
    services.refreshController.updateViewMessage();
  }
}

function buildDeleteBranchConfirmationMessage(label: string, upstreamLabel: string | undefined): string {
  if (!upstreamLabel) {
    return `Delete the Branch ${label}?`;
  }

  return `Delete the Local Branch ${label}?\n\nThis removes only the local branch. The tracked remote branch ${upstreamLabel} will remain unchanged.`;
}

function buildForceDeleteBranchMessage(label: string, upstreamLabel: string | undefined): string {
  const mergeBaseLabel = upstreamLabel ?? 'HEAD';
  const remoteNotice = upstreamLabel
    ? ` The tracked remote branch ${upstreamLabel} will remain unchanged.`
    : '';

  return `${label} is not fully merged into ${mergeBaseLabel}.\n\nForce delete the local branch anyway?${remoteNotice}`;
}

function hasGitErrorCode(error: unknown, gitErrorCode: string): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  return 'gitErrorCode' in error && error.gitErrorCode === gitErrorCode;
}
