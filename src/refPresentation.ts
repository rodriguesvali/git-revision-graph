import { Branch, Ref, RefType, Repository } from './git';

export function getReferenceHandle(ref: Ref): string {
  if (ref.type === RefType.RemoteHead && ref.remote && ref.name) {
    return ref.name.startsWith(`${ref.remote}/`) ? ref.name : `${ref.remote}/${ref.name}`;
  }

  return ref.name ?? ref.commit ?? '';
}

export function getReferenceShortLabel(ref: Ref): string {
  if (ref.type === RefType.RemoteHead && ref.remote && ref.name) {
    return ref.name.startsWith(`${ref.remote}/`)
      ? ref.name.slice(ref.remote.length + 1)
      : ref.name;
  }

  return ref.name ?? ref.commit ?? '<unknown>';
}

export function getReferenceDescription(repository: Repository, ref: Ref): string | undefined {
  if (ref.type === RefType.Head && repository.state.HEAD?.name === ref.name) {
    const head = repository.state.HEAD as Branch;
    const counters = [
      typeof head.ahead === 'number' && head.ahead > 0 ? `+${head.ahead}` : undefined,
      typeof head.behind === 'number' && head.behind > 0 ? `-${head.behind}` : undefined
    ].filter(Boolean);

    return counters.length > 0 ? `current ${counters.join(' ')}` : 'current';
  }

  if (ref.type === RefType.RemoteHead && ref.remote) {
    return ref.remote;
  }

  return ref.commit ? ref.commit.slice(0, 8) : undefined;
}

export function getReferenceTooltip(repository: Repository, ref: Ref): string {
  const parts = [getReferenceHandle(ref)];
  const description = getReferenceDescription(repository, ref);

  if (description) {
    parts.push(description);
  }

  if (ref.commit) {
    parts.push(ref.commit);
  }

  return parts.join('\n');
}

export function getReferenceIcon(ref: Ref): string {
  switch (ref.type) {
    case RefType.Head:
      return 'git-branch';
    case RefType.RemoteHead:
      return 'cloud';
    case RefType.Tag:
      return 'tag';
  }

  return 'git-commit';
}

export function getSuggestedLocalBranchName(ref: Ref): string {
  return getReferenceShortLabel(ref);
}

export function compareRefsByName(left: Ref, right: Ref): number {
  return getReferenceShortLabel(left).localeCompare(getReferenceShortLabel(right));
}
