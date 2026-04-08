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
    : await pickReference(repository, 'Escolha a primeira referencia para comparar', undefined, services);
  if (!first) {
    return;
  }

  const second = await pickReference(
    repository,
    `Compare ${first.label} com...`,
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
        `Nenhuma diferenca encontrada entre ${first.label} e ${second.label}.`
      );
      return;
    }

    const pickedChange = await services.ui.pickChange(
      toChangeQuickPickItems(changes, services.formatPath),
      `Arquivos alterados entre ${first.label} e ${second.label}`
    );
    if (!pickedChange) {
      return;
    }

    await services.diffPresenter.openBetweenRefs(repository, pickedChange.change, first.refName, second.refName);
  } catch (error) {
    await services.ui.showErrorMessage(`Nao foi possivel comparar as referencias. ${toErrorDetail(error)}`);
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
    : await pickReference(repository, 'Escolha a referencia para comparar com a worktree', undefined, services);
  if (!selected) {
    return;
  }

  try {
    const changes = await repository.diffWith(selected.refName);
    if (changes.length === 0) {
      services.ui.showInformationMessage(`A worktree ja esta alinhada com ${selected.label}.`);
      return;
    }

    const pickedChange = await services.ui.pickChange(
      toChangeQuickPickItems(changes, services.formatPath),
      `Arquivos alterados entre ${selected.label} e a worktree`
    );
    if (!pickedChange) {
      return;
    }

    await services.diffPresenter.openWithWorktree(repository, pickedChange.change, selected.refName);
  } catch (error) {
    await services.ui.showErrorMessage(`Nao foi possivel comparar a referencia com a worktree. ${toErrorDetail(error)}`);
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
    : await pickReference(repository, 'Escolha a referencia para fazer checkout', undefined, services);
  if (!selected) {
    return;
  }

  try {
    if (selected.ref.type === RefType.Head && repository.state.HEAD?.name === selected.ref.name) {
      services.ui.showInformationMessage(`${selected.label} ja esta selecionada.`);
      return;
    }

    if (selected.ref.type === RefType.RemoteHead) {
      const suggestedName = getSuggestedLocalBranchName(selected.ref);
      const branchName = await services.ui.promptBranchName({
        prompt: `Criar branch local rastreando ${selected.label}`,
        value: suggestedName
      });

      if (!branchName) {
        return;
      }

      await repository.createBranch(branchName, true, selected.refName);
      await repository.setBranchUpstream(branchName, selected.refName);
      services.ui.showInformationMessage(
        `Branch ${branchName} criada e selecionada a partir de ${selected.label}.`
      );
    } else {
      const confirmed = await services.ui.confirm({
        message: `Fazer checkout de ${selected.label}?`,
        confirmLabel: 'Checkout'
      });
      if (!confirmed) {
        return;
      }

      await repository.checkout(selected.refName);
      services.ui.showInformationMessage(`Checkout concluido para ${selected.label}.`);
    }

    services.refreshController.refresh();
    services.refreshController.updateViewMessage();
  } catch (error) {
    await services.ui.showErrorMessage(`Nao foi possivel fazer checkout da referencia. ${toErrorDetail(error)}`);
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
    : await pickReference(repository, 'Escolha a referencia para fazer merge', undefined, services);
  if (!selected) {
    return;
  }

  const currentBranch = repository.state.HEAD?.name ?? 'HEAD atual';
  if (selected.ref.type === RefType.Head && selected.ref.name === repository.state.HEAD?.name) {
    services.ui.showInformationMessage('A branch atual nao pode ser merged nela mesma.');
    return;
  }

  const confirmed = await services.ui.confirm({
    message: `Fazer merge de ${selected.label} em ${currentBranch}?`,
    confirmLabel: 'Merge'
  });
  if (!confirmed) {
    return;
  }

  try {
    await repository.merge(selected.refName);
    services.refreshController.refresh();
    services.refreshController.updateViewMessage();
    services.ui.showInformationMessage(`Merge de ${selected.label} iniciado em ${currentBranch}.`);
  } catch (error) {
    await services.ui.showErrorMessage(
      `Merge nao concluido. Se houve conflitos, finalize pela experiencia de Source Control do VS Code. ${toErrorDetail(error)}`
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
    services.ui.showInformationMessage('Nenhum repositorio Git aberto no workspace.');
    return undefined;
  }

  return services.ui.pickRepository(
    buildRepositoryPickItems(git.repositories, services.formatPath),
    'Escolha o repositorio'
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
