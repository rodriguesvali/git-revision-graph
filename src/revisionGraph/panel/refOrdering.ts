import type { RevisionGraphRef } from '../model/commitGraphTypes';

export function sortRevisionGraphRefs(refs: readonly RevisionGraphRef[]): RevisionGraphRef[] {
  const dedupedRefs = coalesceHeadBranchRefs(refs);
  return [...dedupedRefs].sort((left, right) => {
    const priority = getRevisionGraphRefPriority(left.kind) - getRevisionGraphRefPriority(right.kind);
    if (priority !== 0) {
      return priority;
    }

    const family = getRevisionGraphRefFamilyKey(left).localeCompare(getRevisionGraphRefFamilyKey(right));
    return family !== 0 ? family : left.name.localeCompare(right.name);
  });
}

function getRevisionGraphRefPriority(kind: RevisionGraphRef['kind']): number {
  switch (kind) {
    case 'bisect': return -1;
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

function coalesceHeadBranchRefs(refs: readonly RevisionGraphRef[]): RevisionGraphRef[] {
  const headNames = new Set(refs.filter((ref) => ref.kind === 'head').map((ref) => ref.name));
  return refs.filter((ref) => !(ref.kind === 'branch' && headNames.has(ref.name)));
}

function getRevisionGraphRefFamilyKey(ref: RevisionGraphRef): string {
  if (ref.kind === 'remote') {
    const slashIndex = ref.name.indexOf('/');
    return slashIndex >= 0 ? ref.name.slice(slashIndex + 1) : ref.name;
  }

  return ref.name;
}

