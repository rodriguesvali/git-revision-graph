import { Ref, Repository } from './git';

export type RefNode = RepositoryNode | CategoryNode | RemoteNode | ReferenceNode;
export type RefCategory = 'branches' | 'tags' | 'remotes';

export interface RepositoryNode {
  readonly kind: 'repository';
  readonly repository: Repository;
}

export interface CategoryNode {
  readonly kind: 'category';
  readonly repository: Repository;
  readonly category: RefCategory;
}

export interface RemoteNode {
  readonly kind: 'remote';
  readonly repository: Repository;
  readonly remote: string;
}

export interface ReferenceNode {
  readonly kind: 'ref';
  readonly repository: Repository;
  readonly ref: Ref;
}

export function isReferenceNode(node: RefNode | undefined): node is ReferenceNode {
  return node?.kind === 'ref';
}
