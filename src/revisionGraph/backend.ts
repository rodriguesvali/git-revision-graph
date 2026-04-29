import { execGit } from '../gitExec';
import { Repository } from '../git';
import { RevisionLogEntry, RevisionLogSource, RevisionGraphViewReference } from '../revisionGraphTypes';
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
  buildRevisionGraphGitLogArgs,
  buildRevisionLogGitArgs,
  parseRevisionLogEntries
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
    limitPolicy: RevisionGraphLimitPolicy,
    signal?: AbortSignal
  ): Promise<RevisionGraphSnapshot>;
  loadRevisionLog(
    repository: Repository,
    source: RevisionLogSource,
    limit: number,
    skip?: number,
    showAllBranches?: boolean
  ): Promise<{
    readonly entries: readonly RevisionLogEntry[];
    readonly hasMore: boolean;
  }>;
  loadUnifiedDiff(repository: Repository, left: string, right: string): Promise<string>;
  loadCommitDetails(repository: Repository, commitHash: string): Promise<string>;
  getMergeBlockedTargets(
    repository: Repository,
    snapshot: RevisionGraphSnapshot,
    currentHeadName: string | undefined,
    visibleReferences: readonly RevisionGraphViewReference[],
    signal?: AbortSignal
  ): Promise<string[]>;
}

export interface ShowLogBackend {
  loadRevisionLogChanges(
    repository: Repository,
    commitHash: string,
    parentHash?: string
  ): Promise<readonly import('../git').Change[]>;
}

const SNAPSHOT_CACHE_TTL_MS = 500;
const GRAPH_SNAPSHOT_MAX_OUTPUT_BYTES = 32 * 1024 * 1024;
const EMPTY_TREE_HASH = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';

export class DefaultRevisionGraphBackend implements RevisionGraphBackend, ShowLogBackend {
  private readonly snapshotCache = new Map<string, {
    readonly createdAt: number;
    readonly snapshotPromise: Promise<RevisionGraphSnapshot>;
  }>();

  async loadGraphSnapshot(
    repository: Repository,
    options: RevisionGraphProjectionOptions,
    limitPolicy: RevisionGraphLimitPolicy,
    signal?: AbortSignal
  ): Promise<RevisionGraphSnapshot> {
    if (signal) {
      return this.loadGraphSnapshotInternal(repository, options, limitPolicy, signal);
    }

    pruneExpiredSnapshotCacheEntries(this.snapshotCache, Date.now());
    const cacheKey = buildSnapshotCacheKey(repository, options, limitPolicy);
    const now = Date.now();
    const cached = this.snapshotCache.get(cacheKey);
    if (cached && (now - cached.createdAt) <= SNAPSHOT_CACHE_TTL_MS) {
      return cached.snapshotPromise;
    }

    const snapshotPromise = this.loadGraphSnapshotInternal(repository, options, limitPolicy, signal)
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
    source: RevisionLogSource,
    limit: number,
    skip = 0,
    showAllBranches = source.kind === 'range'
  ): Promise<{
    readonly entries: readonly RevisionLogEntry[];
    readonly hasMore: boolean;
  }> {
    const refKindsByName = buildRevisionGraphRefKinds(repository.state.refs);
    const stdout = await execGit(
      repository.rootUri.fsPath,
      buildRevisionLogGitArgs(source, limit + 1, skip, showAllBranches)
    );
    const parsedEntries = parseRevisionLogEntries(stdout, refKindsByName);

    return {
      entries: parsedEntries.slice(0, limit),
      hasMore: parsedEntries.length > limit
    };
  }

  async loadRevisionLogChanges(
    repository: Repository,
    commitHash: string,
    parentHash?: string
  ): Promise<readonly import('../git').Change[]> {
    return repository.diffBetween(parentHash ?? EMPTY_TREE_HASH, commitHash);
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
    visibleReferences: readonly RevisionGraphViewReference[],
    signal?: AbortSignal
  ): Promise<string[]> {
    throwIfAborted(signal);
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
          throwIfAborted(signal);
          const isAncestor = await isRefAncestorOfHead(repository, ref.name, currentHeadName, signal);
          return isAncestor ? `${ref.kind}::${ref.name}` : undefined;
        } catch (error) {
          if (isAbortError(error)) {
            throw error;
          }

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
    limitPolicy: RevisionGraphLimitPolicy,
    signal?: AbortSignal
  ): Promise<RevisionGraphSnapshot> {
    const limits = [
      limitPolicy.initialLimit,
      ...limitPolicy.steppedLimits.filter((limit) => limit !== limitPolicy.initialLimit)
    ];

    let selectedSnapshot: RevisionGraphSnapshot | undefined;
    for (const limit of limits) {
      throwIfAborted(signal);
      const snapshot = await loadSnapshot(repository, limit, options, signal);
      selectedSnapshot = snapshot;

      if (snapshot.graph.orderedCommits.length < limit) {
        break;
      }

      if (countVisibleNodes(snapshot.graph, options) >= limitPolicy.minVisibleNodes) {
        break;
      }
    }

    if (!selectedSnapshot) {
      return loadSnapshot(repository, limitPolicy.initialLimit, options, signal);
    }

    return selectedSnapshot;
  }
}

export function createRevisionGraphBackend(): RevisionGraphBackend & ShowLogBackend {
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
  options: RevisionGraphProjectionOptions,
  signal?: AbortSignal
): Promise<RevisionGraphSnapshot> {
  throwIfAborted(signal);
  const refsPromise = repository.getRefs();
  const stdoutPromise = execGit(
    repository.rootUri.fsPath,
    buildRevisionGraphGitLogArgs(limit, options),
    {
      signal,
      maxOutputBytes: GRAPH_SNAPSHOT_MAX_OUTPUT_BYTES
    }
  );
  const [refs, stdout] = await Promise.all([refsPromise, stdoutPromise]);
  throwIfAborted(signal);
  const refKindsByName = buildRevisionGraphRefKinds(refs);

  return {
    graph: buildCommitGraphFromGitLog(stdout, refKindsByName, 'git-decoration'),
    loadedAt: Date.now(),
    requestedLimit: limit
  };
}

function pruneExpiredSnapshotCacheEntries<T extends { readonly createdAt: number }>(
  cache: Map<string, T>,
  now: number
): void {
  for (const [key, entry] of cache.entries()) {
    if ((now - entry.createdAt) > SNAPSHOT_CACHE_TTL_MS) {
      cache.delete(key);
    }
  }
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    const error = new Error('The revision graph load was aborted.');
    error.name = 'AbortError';
    throw error;
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
