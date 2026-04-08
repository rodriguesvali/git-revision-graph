import { ChangeQuickPickItem, getLeftUri, getRightUri, isAddition, isDeletion, toChangeQuickPickItems } from './changePresentation';
import { API, Change, Ref, RefType, Repository } from './git';
import { isReferenceNode, RefNode } from './refNodes';
import {
  getReferenceDescription,
  getReferenceHandle,
  getReferenceShortLabel,
  getSuggestedLocalBranchName
} from './refPresentation';

export interface RefQuickPickItem {
  readonly label: string;
  readonly description?: string;
  readonly detail: string;
  readonly repository: Repository;
  readonly ref: Ref;
  readonly refName: string;
}

export interface RefCommandUi {
  pickRepository(items: readonly RepositoryPickItem[], placeHolder: string): Promise<Repository | undefined>;
  pickReference(items: readonly RefQuickPickItem[], placeHolder: string): Promise<RefQuickPickItem | undefined>;
  pickChange(items: readonly ChangeQuickPickItem[], placeHolder: string): Promise<ChangeQuickPickItem | undefined>;
  promptBranchName(options: { readonly prompt: string; readonly value: string }): Promise<string | undefined>;
  confirm(options: { readonly message: string; readonly confirmLabel: string }): Promise<boolean>;
  showInformationMessage(message: string): void;
  showWarningMessage(message: string): void;
  showErrorMessage(message: string): Promise<void>;
}

export interface RepositoryPickItem {
  readonly label: string;
  readonly description: string;
  readonly repository: Repository;
}

export interface DiffPresenter {
  openBetweenRefs(repository: Repository, change: Change, leftRef: string, rightRef: string): Promise<void>;
  openWithWorktree(repository: Repository, change: Change, ref: string): Promise<void>;
}

export interface RefreshController {
  refresh(): void;
  updateViewMessage(): void;
}

export interface RefCommandServices {
  readonly ui: RefCommandUi;
  readonly diffPresenter: DiffPresenter;
  readonly refreshController: RefreshController;
  readonly formatPath: (fsPath: string) => string;
}

export async function compareRefs(
  git: API,
  node: RefNode | undefined,
  services: RefCommandServices
): Promise<void> {
  const repository = await resolveRepository(git, node, services);
  if (!repository) {
    return;
  }

  const first = isReferenceNode(node)
    ? toQuickPickItem(repository, node.ref)
    : await pickReference(repository, 'Choose the first reference to compare', undefined, services);
  if (!first) {
    return;
  }

  const second = await pickReference(
    repository,
    `Compare ${first.label} with...`,
    first.refName,
    services
  );
  if (!second) {
    return;
  }

  try {
    const changes = await repository.diffBetween(first.refName, second.refName);
    if (changes.length === 0) {
      services.ui.showInformationMessage(
        `No differences found between ${first.label} and ${second.label}.`
      );
      return;
    }

    const pickedChange = await services.ui.pickChange(
      toChangeQuickPickItems(changes, services.formatPath),
      `Changed files between ${first.label} and ${second.label}`
    );
    if (!pickedChange) {
      return;
    }

    await services.diffPresenter.openBetweenRefs(repository, pickedChange.change, first.refName, second.refName);
  } catch (error) {
    await services.ui.showErrorMessage(`Could not compare references. ${toErrorDetail(error)}`);
  }
}

export async function compareWithWorktree(
  git: API,
  node: RefNode | undefined,
  services: RefCommandServices
): Promise<void> {
  const repository = await resolveRepository(git, node, services);
  if (!repository) {
    return;
  }

  const selected = isReferenceNode(node)
    ? toQuickPickItem(repository, node.ref)
    : await pickReference(repository, 'Choose a reference to compare with the worktree', undefined, services);
  if (!selected) {
    return;
  }

  try {
    const changes = await repository.diffWith(selected.refName);
    if (changes.length === 0) {
      services.ui.showInformationMessage(`The worktree is already aligned with ${selected.label}.`);
      return;
    }

    const pickedChange = await services.ui.pickChange(
      toChangeQuickPickItems(changes, services.formatPath),
      `Changed files between ${selected.label} and the worktree`
    );
    if (!pickedChange) {
      return;
    }

    await services.diffPresenter.openWithWorktree(repository, pickedChange.change, selected.refName);
  } catch (error) {
    await services.ui.showErrorMessage(`Could not compare the reference with the worktree. ${toErrorDetail(error)}`);
  }
}

export async function checkoutReference(
  git: API,
  node: RefNode | undefined,
  services: RefCommandServices
): Promise<void> {
  const repository = await resolveRepository(git, node, services);
  if (!repository) {
    return;
  }

  const selected = isReferenceNode(node)
    ? toQuickPickItem(repository, node.ref)
    : await pickReference(repository, 'Choose a reference to check out', undefined, services);
  if (!selected) {
    return;
  }

  try {
    if (selected.ref.type === RefType.Head && repository.state.HEAD?.name === selected.ref.name) {
      services.ui.showInformationMessage(`${selected.label} is already checked out.`);
      return;
    }

    if (selected.ref.type === RefType.RemoteHead) {
      const suggestedName = getSuggestedLocalBranchName(selected.ref);
      const branchName = await services.ui.promptBranchName({
        prompt: `Create a local branch tracking ${selected.label}`,
        value: suggestedName
      });

      if (!branchName) {
        return;
      }

      await repository.createBranch(branchName, true, selected.refName);
      await repository.setBranchUpstream(branchName, selected.refName);
      services.ui.showInformationMessage(
        `Branch ${branchName} was created and checked out from ${selected.label}.`
      );
    } else {
      const confirmed = await services.ui.confirm({
        message: `Check out ${selected.label}?`,
        confirmLabel: 'Checkout'
      });
      if (!confirmed) {
        return;
      }

      await repository.checkout(selected.refName);
      services.ui.showInformationMessage(`Checkout completed for ${selected.label}.`);
    }

    services.refreshController.refresh();
    services.refreshController.updateViewMessage();
  } catch (error) {
    await services.ui.showErrorMessage(`Could not check out the reference. ${toErrorDetail(error)}`);
  }
}

export async function mergeReference(
  git: API,
  node: RefNode | undefined,
  services: RefCommandServices
): Promise<void> {
  const repository = await resolveRepository(git, node, services);
  if (!repository) {
    return;
  }

  const selected = isReferenceNode(node)
    ? toQuickPickItem(repository, node.ref)
    : await pickReference(repository, 'Choose a reference to merge', undefined, services);
  if (!selected) {
    return;
  }

  const currentBranch = repository.state.HEAD?.name ?? 'current HEAD';
  if (selected.ref.type === RefType.Head && selected.ref.name === repository.state.HEAD?.name) {
    services.ui.showInformationMessage('The current branch cannot be merged into itself.');
    return;
  }

  const confirmed = await services.ui.confirm({
    message: `Merge ${selected.label} into ${currentBranch}?`,
    confirmLabel: 'Merge'
  });
  if (!confirmed) {
    return;
  }

  try {
    await repository.merge(selected.refName);
    services.refreshController.refresh();
    services.refreshController.updateViewMessage();
    services.ui.showInformationMessage(`Merge from ${selected.label} started in ${currentBranch}.`);
  } catch (error) {
    await services.ui.showErrorMessage(
      `Merge did not complete. If there were conflicts, finish it in the VS Code Source Control experience. ${toErrorDetail(error)}`
    );
  }
}

export function buildRepositoryPickItems(
  repositories: readonly Repository[],
  formatPath: (fsPath: string) => string
): RepositoryPickItem[] {
  return repositories
    .map((repository) => ({
      label: formatPath(repository.rootUri.fsPath),
      description: repository.rootUri.fsPath,
      repository
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function buildRefUriQuery(repository: Repository, ref: string, filePath: string): URLSearchParams {
  return new URLSearchParams({
    repo: repository.rootUri.fsPath,
    ref,
    path: filePath
  });
}

export function getDiffChangeUris(change: Change): { readonly leftPath: string; readonly rightPath: string } {
  return {
    leftPath: getLeftUri(change).fsPath,
    rightPath: getRightUri(change).fsPath
  };
}

export function getDiffChangeKinds(change: Change): { readonly leftIsEmpty: boolean; readonly rightIsEmpty: boolean } {
  return {
    leftIsEmpty: isAddition(change.status),
    rightIsEmpty: isDeletion(change.status)
  };
}

async function resolveRepository(
  git: API,
  node: RefNode | undefined,
  services: RefCommandServices
): Promise<Repository | undefined> {
  if (node) {
    return node.repository;
  }

  if (git.repositories.length === 1) {
    return git.repositories[0];
  }

  if (git.repositories.length === 0) {
    services.ui.showInformationMessage('No Git repository is open in the workspace.');
    return undefined;
  }

  return services.ui.pickRepository(
    buildRepositoryPickItems(git.repositories, services.formatPath),
    'Choose a repository'
  );
}

async function pickReference(
  repository: Repository,
  placeHolder: string,
  excludeRefName: string | undefined,
  services: RefCommandServices
): Promise<RefQuickPickItem | undefined> {
  const refs = await repository.getRefs({ sort: 'alphabetically' });
  const items = refs
    .filter((ref) => {
      const refName = getReferenceHandle(ref);
      return refName.length > 0 && refName !== excludeRefName;
    })
    .sort((left, right) => left.name?.localeCompare(right.name ?? '') ?? 0)
    .map((ref) => toQuickPickItem(repository, ref));

  return services.ui.pickReference(items, placeHolder);
}

function toQuickPickItem(repository: Repository, ref: Ref): RefQuickPickItem {
  return {
    label: getReferenceShortLabel(ref),
    description: getReferenceDescription(repository, ref),
    detail: getReferenceHandle(ref),
    repository,
    ref,
    refName: getReferenceHandle(ref)
  };
}

function toErrorDetail(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
