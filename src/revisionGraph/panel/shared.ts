import { Repository } from '../../git';
import {
  projectDecoratedCommitGraph,
  RevisionGraphProjectionOptions,
  RevisionGraphScene
} from '../../revisionGraphData';
import { loadRevisionGraphSnapshot, isRefAncestorOfHead } from '../../revisionGraphRepository';
import { RevisionGraphSnapshot } from '../source/graphSnapshot';

export const GRAPH_COMMIT_LIMIT = 6000;
export const GRAPH_COMMIT_LIMIT_STEPS = [6000, 12000];
export const GRAPH_MIN_VISIBLE_NODES = 24;

export async function loadSnapshotForGraph(
  repository: Repository,
  projectionOptions: RevisionGraphProjectionOptions
): Promise<RevisionGraphSnapshot> {
  let selectedSnapshot = await loadRevisionGraphSnapshot(repository, GRAPH_COMMIT_LIMIT, projectionOptions);

  for (const limit of GRAPH_COMMIT_LIMIT_STEPS) {
    const snapshot = limit === GRAPH_COMMIT_LIMIT
      ? selectedSnapshot
      : await loadRevisionGraphSnapshot(repository, limit, projectionOptions);
    const projection = projectDecoratedCommitGraph(snapshot.graph, projectionOptions);
    selectedSnapshot = snapshot;

    if (projection.nodes.length >= GRAPH_MIN_VISIBLE_NODES || snapshot.graph.orderedCommits.length < limit) {
      break;
    }
  }

  return selectedSnapshot;
}

export async function getMergeBlockedTargets(
  repository: Repository,
  currentHeadName: string | undefined,
  scene: RevisionGraphScene
): Promise<string[]> {
  if (!currentHeadName) {
    return [];
  }

  const refs = scene.nodes.flatMap((node) => node.refs);
  const uniqueRefs = [
    ...new Map(
      refs.map((ref) => [`${ref.kind}::${ref.name}`, ref] as const)
    ).values()
  ];

  const mergeBlockedEntries = await Promise.all(
    uniqueRefs.map(async (ref) => {
      if (ref.kind === 'head' || ref.name === currentHeadName) {
        return undefined;
      }

      try {
        const isAncestor = await isRefAncestorOfHead(repository, ref.name, currentHeadName);
        return isAncestor ? `${ref.kind}::${ref.name}` : undefined;
      } catch {
        return undefined;
      }
    })
  );

  return mergeBlockedEntries.filter((entry): entry is string => typeof entry === 'string');
}

export function formatUpstreamLabel(remoteName: string, refName: string): string {
  return refName.startsWith(`${remoteName}/`) ? refName : `${remoteName}/${refName}`;
}

export function hasWorkspaceChanges(repository: Repository): boolean {
  return repository.state.mergeChanges.length > 0
    || repository.state.indexChanges.length > 0
    || repository.state.workingTreeChanges.length > 0
    || repository.state.untrackedChanges.length > 0;
}
