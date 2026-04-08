import { API, RefType, Repository } from './git';
import { RefCategory, RefNode, ReferenceNode, RemoteNode, RepositoryNode } from './refNodes';
import { compareRefsByName } from './refPresentation';

export function getViewMessage(git: API): string | undefined {
  return git.repositories.length === 0
    ? 'Open a workspace with a Git repository to view references.'
    : undefined;
}

export function getRootNodes(git: API): RefNode[] {
  const repositories = getSortedRepositories(git.repositories);

  if (repositories.length <= 1) {
    return repositories.length === 0 ? [] : getRepositoryChildren(repositories[0]);
  }

  return repositories.map<RepositoryNode>((repository) => ({
    kind: 'repository',
    repository
  }));
}

export function getRepositoryChildren(repository: Repository): RefNode[] {
  return [
    { kind: 'category', repository, category: 'branches' },
    { kind: 'category', repository, category: 'tags' },
    { kind: 'category', repository, category: 'remotes' }
  ];
}

export async function getCategoryChildren(repository: Repository, category: RefCategory): Promise<RefNode[]> {
  const refs = await repository.getRefs({ sort: 'alphabetically' });

  if (category === 'branches') {
    return refs
      .filter((ref) => ref.type === RefType.Head)
      .sort(compareRefsByName)
      .map<ReferenceNode>((ref) => ({
        kind: 'ref',
        repository,
        ref
      }));
  }

  if (category === 'tags') {
    return refs
      .filter((ref) => ref.type === RefType.Tag)
      .sort(compareRefsByName)
      .map<ReferenceNode>((ref) => ({
        kind: 'ref',
        repository,
        ref
      }));
  }

  const remotes = [
    ...new Set(
      refs
        .filter((ref) => ref.type === RefType.RemoteHead)
        .map((ref) => ref.remote)
        .filter((remote): remote is string => typeof remote === 'string' && remote.length > 0)
    )
  ].sort((left, right) => left.localeCompare(right));

  return remotes.map<RemoteNode>((remote) => ({
    kind: 'remote',
    repository,
    remote
  }));
}

export async function getRemoteChildren(repository: Repository, remote: string): Promise<ReferenceNode[]> {
  const refs = await repository.getRefs({ sort: 'alphabetically' });

  return refs
    .filter((ref) => ref.type === RefType.RemoteHead && ref.remote === remote)
    .sort(compareRefsByName)
    .map<ReferenceNode>((ref) => ({
      kind: 'ref',
      repository,
      ref
    }));
}

function getSortedRepositories(repositories: readonly Repository[]): Repository[] {
  return [...repositories].sort((left, right) => left.rootUri.fsPath.localeCompare(right.rootUri.fsPath));
}
