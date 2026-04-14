import { Ref, RefType } from '../../git';
import { RevisionGraphRef } from '../model/commitGraphTypes';

export function buildRevisionGraphRefKinds(refs: readonly Ref[]): Map<string, RevisionGraphRef['kind']> {
  const refKindsByName = new Map<string, RevisionGraphRef['kind']>();

  for (const ref of refs) {
    const refName = getRefName(ref);
    if (!refName) {
      continue;
    }

    const nextKind = toRevisionGraphRefKind(ref.type);
    const currentKind = refKindsByName.get(refName);
    if (!currentKind || getRefKindPriority(nextKind) < getRefKindPriority(currentKind)) {
      refKindsByName.set(refName, nextKind);
    }
  }

  return refKindsByName;
}

function getRefName(ref: Ref): string {
  if (ref.type === RefType.RemoteHead && ref.remote && ref.name) {
    return ref.name.startsWith(`${ref.remote}/`) ? ref.name : `${ref.remote}/${ref.name}`;
  }

  return ref.name ?? '';
}

function toRevisionGraphRefKind(type: RefType): RevisionGraphRef['kind'] {
  switch (type) {
    case RefType.Head:
      return 'branch';
    case RefType.RemoteHead:
      return 'remote';
    case RefType.Tag:
      return 'tag';
  }
}

function getRefKindPriority(kind: RevisionGraphRef['kind']): number {
  switch (kind) {
    case 'head':
      return 0;
    case 'branch':
      return 1;
    case 'remote':
      return 2;
    case 'stash':
      return 3;
    case 'tag':
      return 4;
  }
}
