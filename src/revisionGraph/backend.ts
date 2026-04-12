import { execGit } from '../gitExec';
import { Repository } from '../git';
import { RevisionLogEntry, RevisionGraphViewReference } from '../revisionGraphTypes';
import {
  CommitGraph,
  RevisionGraphProjectionOptions
} from './model/commitGraphTypes';
import { collectAncestorHashes, findCommitHashesByRef } from './model/commitGraphQueries';
import { projectDecoratedCommitGraph } from './projection/graphProjection';
import { buildRevisionGraphRefKinds } from './source/refIndex';
import { RevisionGraphSnapshot } from './source/graphSnapshot';
import {
  buildCommitGraphFromGitLog,
  buildRevisionGraphGitLogArgs
} from './source/graphGit';
import { isRefAncestorOfHead } from './repository/snapshot';

export interface RevisionGraphLimitPolicy {
  readonly initialLimit: number;
  readonly steppedLimits: readonly number[];
  readonly minVisibleNodes: number;
}

export interface RevisionGraphBackend {
  loadGraphSnapshot(
    repository: Repository,
    options: RevisionGraphProjectionOptions,
    limitPolicy: RevisionGraphLimitPolicy
  ): Promise<RevisionGraphSnapshot>;
  loadRevisionLog(
    repository: Repository,
    left: string,
    right: string,
    limit: number
  ): Promise<RevisionLogEntry[]>;
  loadUnifiedDiff(repository: Repository, left: string, right: string): Promise<string>;
  loadCommitDetails(repository: Repository, commitHash: string): Promise<string>;
  getMergeBlockedTargets(
    repository: Repository,
    snapshot: RevisionGraphSnapshot,
    currentHeadName: string | undefined,
    visibleReferences: readonly RevisionGraphViewReference[]
  ): Promise<string[]>;
}

const SNAPSHOT_CACHE_TTL_MS = 500;

export class DefaultRevisionGraphBackend implements RevisionGraphBackend {
  private readonly snapshotCache = new Map<string, {
    readonly createdAt: number;
    readonly snapshotPromise: Promise<RevisionGraphSnapshot>;
  }>();

  async loadGraphSnapshot(
    repository: Repository,
    options: RevisionGraphProjectionOptions,
    limitPolicy: RevisionGraphLimitPolicy
  ): Promise<RevisionGraphSnapshot> {
    const cacheKey = buildSnapshotCacheKey(repository, options, limitPolicy);
    const now = Date.now();
    const cached = this.snapshotCache.get(cacheKey);
    if (cached && (now - cached.createdAt) <= SNAPSHOT_CACHE_TTL_MS) {
      return cached.snapshotPromise;
    }

    const snapshotPromise = this.loadGraphSnapshotInternal(repository, options, limitPolicy)
      .catch((error) => {
        this.snapshotCache.delete(cacheKey);
        throw error;
      });

    this.snapshotCache.set(cacheKey, {
      createdAt: now,
      snapshotPromise
    });

    return snapshotPromise;
  }

  async loadRevisionLog(
    repository: Repository,
    left: string,
    right: string,
    limit: number
  ): Promise<RevisionLogEntry[]> {
    const fieldSeparator = '\u001f';
    const recordSeparator = '\u001e';
    const stdout = await execGit(
      repository.rootUri.fsPath,
      [
        'log',
        '--date=short',
        `--max-count=${limit}`,
        `--pretty=format:%H${fieldSeparator}%h${fieldSeparator}%ad${fieldSeparator}%an${fieldSeparator}%s${recordSeparator}`,
        `${left}..${right}`
      ]
    );

    return stdout
      .split(recordSeparator)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const [hash, shortHash, date, author, ...subjectParts] = line.split(fieldSeparator);
        return {
          hash,
          shortHash,
          date,
          author,
          subject: subjectParts.join(fieldSeparator)
        };
      });
  }

  async loadUnifiedDiff(repository: Repository, left: string, right: string): Promise<string> {
    return execGit(repository.rootUri.fsPath, ['diff', '--no-color', left, right]);
  }

  async loadCommitDetails(repository: Repository, commitHash: string): Promise<string> {
    return execGit(
      repository.rootUri.fsPath,
      ['show', '--stat', '--patch', '--format=fuller', '--no-color', commitHash]
    );
  }

  async getMergeBlockedTargets(
    repository: Repository,
    snapshot: RevisionGraphSnapshot,
    currentHeadName: string | undefined,
    visibleReferences: readonly RevisionGraphViewReference[]
  ): Promise<string[]> {
    if (!currentHeadName) {
      return [];
    }

    const uniqueReferences = [
      ...new Map(
        visibleReferences.map((ref) => [`${ref.kind}::${ref.name}`, ref] as const)
      ).values()
    ];

    const blockedFromGraph = getMergeBlockedTargetsFromGraph(snapshot.graph, currentHeadName, uniqueReferences);
    const blockedSet = new Set(blockedFromGraph);

    const unresolvedReferences = uniqueReferences.filter((ref) =>
      ref.kind !== 'head' &&
      ref.name !== currentHeadName &&
      !blockedSet.has(`${ref.kind}::${ref.name}`) &&
      findCommitHashesByRef(snapshot.graph, ref.name, ref.kind).length === 0
    );

    const fallbackResults = await Promise.all(
      unresolvedReferences.map(async (ref) => {
        try {
          const isAncestor = await isRefAncestorOfHead(repository, ref.name, currentHeadName);
          return isAncestor ? `${ref.kind}::${ref.name}` : undefined;
        } catch {
          return undefined;
        }
      })
    );

    for (const entry of fallbackResults) {
      if (entry) {
        blockedSet.add(entry);
      }
    }

    return [...blockedSet];
  }

  private async loadGraphSnapshotInternal(
    repository: Repository,
    options: RevisionGraphProjectionOptions,
    limitPolicy: RevisionGraphLimitPolicy
  ): Promise<RevisionGraphSnapshot> {
    const limits = [
      limitPolicy.initialLimit,
      ...limitPolicy.steppedLimits.filter((limit) => limit !== limitPolicy.initialLimit)
    ];

    let selectedSnapshot: RevisionGraphSnapshot | undefined;
    for (const limit of limits) {
      const snapshot = await loadSnapshot(repository, limit, options);
      selectedSnapshot = snapshot;

      if (snapshot.graph.orderedCommits.length < limit) {
        break;
      }

      if (countVisibleNodes(snapshot.graph, options) >= limitPolicy.minVisibleNodes) {
        break;
      }
    }

    if (!selectedSnapshot) {
      return loadSnapshot(repository, limitPolicy.initialLimit, options);
    }

    return selectedSnapshot;
  }
}

export function createRevisionGraphBackend(): RevisionGraphBackend {
  return new DefaultRevisionGraphBackend();
}

export function getMergeBlockedTargetsFromGraph(
  graph: CommitGraph,
  currentHeadName: string,
  visibleReferences: readonly Pick<RevisionGraphViewReference, 'kind' | 'name'>[]
): string[] {
  const headStartHashes = findCommitHashesByRef(graph, currentHeadName, 'head');
  const fallbackHeadHashes = headStartHashes.length > 0
    ? headStartHashes
    : findCommitHashesByRef(graph, currentHeadName, 'branch');

  if (fallbackHeadHashes.length === 0) {
    return [];
  }

  const headAncestors = collectAncestorHashes(graph, fallbackHeadHashes);
  const blockedTargets = new Set<string>();

  for (const ref of visibleReferences) {
    if (ref.kind === 'head' || ref.name === currentHeadName) {
      continue;
    }

    const tipHashes = findCommitHashesByRef(graph, ref.name, ref.kind);
    if (tipHashes.some((hash) => headAncestors.has(hash))) {
      blockedTargets.add(`${ref.kind}::${ref.name}`);
    }
  }

  return [...blockedTargets];
}

function countVisibleNodes(graph: CommitGraph, options: RevisionGraphProjectionOptions): number {
  return projectDecoratedCommitGraph(graph, options).nodes.length;
}

function buildSnapshotCacheKey(
  repository: Repository,
  options: RevisionGraphProjectionOptions,
  limitPolicy: RevisionGraphLimitPolicy
): string {
  const refsKey = repository.state.refs
    .map((ref) => `${ref.type}:${ref.remote ?? ''}:${ref.name ?? ''}:${ref.commit ?? ''}`)
    .join('|');
  const headKey = [
    repository.state.HEAD?.name ?? '',
    repository.state.HEAD?.commit ?? '',
    repository.state.HEAD?.upstream?.remote ?? '',
    repository.state.HEAD?.upstream?.name ?? ''
  ].join(':');
  const policyKey = [
    limitPolicy.initialLimit,
    limitPolicy.steppedLimits.join(','),
    limitPolicy.minVisibleNodes
  ].join(':');

  return [
    repository.rootUri.fsPath,
    headKey,
    refsKey,
    JSON.stringify(options),
    policyKey
  ].join('::');
}

async function loadSnapshot(
  repository: Repository,
  limit: number,
  options: RevisionGraphProjectionOptions
): Promise<RevisionGraphSnapshot> {
  const refKindsByName = buildRevisionGraphRefKinds(await repository.getRefs());
  const stdout = await execGit(
    repository.rootUri.fsPath,
    buildRevisionGraphGitLogArgs(limit, options)
  );

  return {
    graph: buildCommitGraphFromGitLog(stdout, refKindsByName, 'git-decoration'),
    loadedAt: Date.now(),
    requestedLimit: limit
  };
}
