import { ChangeQuickPickItem } from './changePresentation';
import { API, Ref, RefType, Repository } from './git';
import { isReferenceNode, RefNode } from './refNodes';
import {
  checkoutResolvedReference,
  compareResolvedRefs,
  compareResolvedRefWithWorktree,
  mergeResolvedReference,
  RefActionKind,
  RefActionServices
} from './refActions';
import {
  getReferenceDescription,
  getReferenceHandle,
  getReferenceShortLabel
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
}

export interface RepositoryPickItem {
  readonly label: string;
  readonly description: string;
  readonly repository: Repository;
}

export interface RefCommandServices extends RefActionServices {
  readonly ui: RefActionServices['ui'] & RefCommandUi;
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
    await compareResolvedRefs(
      repository,
      { refName: first.refName, label: first.label },
      { refName: second.refName, label: second.label },
      services
    );
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
    : await pickReference(repository, 'Choose a Reference to Compare With the Worktree', undefined, services);
  if (!selected) {
    return;
  }

  await compareResolvedRefWithWorktree(
    repository,
    { refName: selected.refName, label: selected.label },
    services
  );
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
    : await pickReference(repository, 'Choose a Reference to Check Out', undefined, services);
  if (!selected) {
    return;
  }

  await checkoutResolvedReference(
    repository,
    {
      refName: selected.refName,
      label: selected.label,
      kind: toActionKind(selected.ref)
    },
    services
  );
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
    : await pickReference(repository, 'Choose a Reference to Merge', undefined, services);
  if (!selected) {
    return;
  }

  await mergeResolvedReference(
    repository,
    { refName: selected.refName, label: selected.label },
    services
  );
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
    services.ui.showInformationMessage('No Git Repository Is Open in the Workspace.');
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

function toActionKind(ref: Ref): RefActionKind {
  switch (ref.type) {
    case RefType.RemoteHead:
      return 'remote';
    case RefType.Tag:
      return 'tag';
    case RefType.Head:
      return 'branch';
  }
}

function toErrorDetail(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
