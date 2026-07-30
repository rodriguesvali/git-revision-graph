import { Ref, RefType, Repository } from '../../git';

export interface FlowBranchNameCollision {
  readonly branchName: string;
  readonly displayName: string;
  readonly location: 'local' | 'remote';
  readonly differsOnlyByCase: boolean;
}

export async function findFlowBranchNameCollision(
  repository: Repository,
  requestedBranchName: string
): Promise<FlowBranchNameCollision | undefined> {
  const refs = repository.state.HEAD
    ? [repository.state.HEAD, ...repository.state.refs]
    : repository.state.refs;
  for (const ref of refs) {
    const collision = compareFlowBranchRef(ref, requestedBranchName);
    if (collision) {
      return collision;
    }
  }

  try {
    const branch = await repository.getBranch(requestedBranchName);
    if (branch.name) {
      return createCollision(branch.name, branch.name, 'local', requestedBranchName);
    }
  } catch {
    // Missing branches are the expected outcome for a new name.
  }

  return undefined;
}

export function formatFlowBranchNameCollision(
  requestedBranchName: string,
  collision: FlowBranchNameCollision
): string {
  if (!collision.differsOnlyByCase) {
    return `Branch ${collision.displayName} already exists.`;
  }

  return `Branch ${requestedBranchName} conflicts with existing ${collision.location} branch ` +
    `${collision.displayName} because the names differ only by letter case.`;
}

function compareFlowBranchRef(
  ref: Ref,
  requestedBranchName: string
): FlowBranchNameCollision | undefined {
  if (!ref.name || (ref.type !== RefType.Head && ref.type !== RefType.RemoteHead)) {
    return undefined;
  }

  if (ref.type === RefType.Head) {
    return createCollision(ref.name, ref.name, 'local', requestedBranchName);
  }

  const remotePrefix = ref.remote ? `${ref.remote}/` : undefined;
  const branchName = remotePrefix && ref.name.startsWith(remotePrefix)
    ? ref.name.slice(remotePrefix.length)
    : ref.name;
  const displayName = remotePrefix && !ref.name.startsWith(remotePrefix)
    ? `${remotePrefix}${ref.name}`
    : ref.name;
  return createCollision(branchName, displayName, 'remote', requestedBranchName);
}

function createCollision(
  branchName: string,
  displayName: string,
  location: FlowBranchNameCollision['location'],
  requestedBranchName: string
): FlowBranchNameCollision | undefined {
  if (foldBranchName(branchName) !== foldBranchName(requestedBranchName)) {
    return undefined;
  }

  return {
    branchName,
    displayName,
    location,
    differsOnlyByCase: branchName !== requestedBranchName
  };
}

function foldBranchName(branchName: string): string {
  return branchName.normalize('NFC').toLowerCase();
}
