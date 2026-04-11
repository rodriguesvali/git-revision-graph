import { Ref, Repository } from './git';

export interface ReferenceNode {
  readonly kind: 'ref';
  readonly repository: Repository;
  readonly ref: Ref;
}

export type RefNode = ReferenceNode;

export function isReferenceNode(node: RefNode | undefined): node is ReferenceNode {
  return node?.kind === 'ref';
}
