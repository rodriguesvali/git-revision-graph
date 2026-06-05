import { execGit } from '../gitExec';
import { Repository } from '../git';
import { RevisionGraphViewReference, RevisionLogSource } from '../revisionGraphTypes';
import {
  CommitGraph,
  RevisionGraphProjectionOptions,
  RevisionGraphRef
} from './model/commitGraphTypes';
import { collectAncestorHashes } from './model/commitGraphQueries';
import { projectMajorOperationsGraph } from './projection/graphProjection';
import { buildRevisionGraphRefKinds } from './source/refIndex';
import { RevisionGraphSnapshot } from './source/graphSnapshot';
import {
  buildCommitGraphFromGitLog,
  buildRevisionGraphGitLogArgs
} from './source/graphGit';
import { isRefAncestorOfHead } from './repository/snapshot';
import { nowMs, traceDuration, RevisionGraphLoadTraceSink } from './loadTrace';
import { DefaultRevisionLogBackend } from './backendServices/revisionLog';
import type { RevisionGraphLogBackend, RevisionLogChangesBackend } from './backendServices/revisionLog';

export type { RevisionGraphLogBackend, RevisionLogChangesBackend } from './backendServices/revisionLog';

export interface RevisionGraphLimitPolicy {
  readonly initialLimit: number;
  readonly steppedLimits: readonly number[];
  readonly minVisibleNodes: number;
  readonly graphCommandTimeoutMs: number;
}

export interface RevisionGraphSnapshotBackend {
  loadGraphSnapshot(
    repository: Repository,
    options: RevisionGraphProjectionOptions,
    limitPolicy: RevisionGraphLimitPolicy,
    signal?: AbortSignal,
    trace?: RevisionGraphLoadTraceSink
  ): Promise<RevisionGraphSnapshot>;
}

export interface RevisionGraphDocumentBackend {
  loadUnifiedDiff(repository: Repository, left: string, right: string): Promise<string>;
  loadCommitDetails(repository: Repository, commitHash: string): Promise<string>;
}

export interface RevisionGraphMergeAnalysisBackend {
  getMergeBlockedTargets(
    repository: Repository,
    snapshot: RevisionGraphSnapshot,
    currentHeadName: string | undefined,
    visibleReferences: readonly RevisionGraphViewReference[],
    signal?: AbortSignal
  ): Promise<string[]>;
}

export type RevisionGraphStateBackend = RevisionGraphSnapshotBackend & RevisionGraphMergeAnalysisBackend;

export interface RevisionGraphBackend extends
  RevisionGraphSnapshotBackend,
  RevisionGraphLogBackend,
  RevisionGraphDocumentBackend,
  RevisionGraphMergeAnalysisBackend {}

export interface ShowLogBackend extends RevisionLogChangesBackend {}

const SNAPSHOT_CACHE_TTL_MS = 500;
const GRAPH_SNAPSHOT_MAX_OUTPUT_BYTES = 32 * 1024 * 1024;
const DEFAULT_GIT_COMMAND_TIMEOUT_MS = 15000;
const UNIFIED_DIFF_MAX_OUTPUT_BYTES = 32 * 1024 * 1024;
const COMMIT_DETAILS_MAX_OUTPUT_BYTES = 24 * 1024 * 1024;

interface SnapshotCacheEntry {
  readonly createdAt: number;
  snapshot?: RevisionGraphSnapshot;
  snapshotPromise: Promise<RevisionGraphSnapshot>;
}

export class DefaultRevisionGraphBackend implements RevisionGraphBackend, ShowLogBackend {
  private readonly snapshotCache = new Map<string, SnapshotCacheEntry>();

  constructor(
    private readonly revisionLogBackend: RevisionGraphLogBackend & RevisionLogChangesBackend = new DefaultRevisionLogBackend()
  ) {}

  async loadGraphSnapshot(
    repository: Repository,
    options: RevisionGraphProjectionOptions,
    limitPolicy: RevisionGraphLimitPolicy,
    signal?: AbortSignal,
    trace?: RevisionGraphLoadTraceSink
  ): Promise<RevisionGraphSnapshot> {
    const cacheStartedAt = nowMs();
    const prunedEntries = pruneExpiredSnapshotCacheEntries(this.snapshotCache, Date.now());
    const cacheKey = buildSnapshotCacheKey(repository, options, limitPolicy);
    const now = Date.now();
    const cached = this.snapshotCache.get(cacheKey);
    if (cached && (now - cached.createdAt) <= SNAPSHOT_CACHE_TTL_MS) {
      if (cached.snapshot) {
        traceSnapshotCache(trace, cacheStartedAt, 'hit', signal, this.snapshotCache.size, prunedEntries, 'completed');
        return cached.snapshot;
      }

      if (signal) {
        traceSnapshotCache(trace, cacheStartedAt, 'bypass', signal, this.snapshotCache.size, prunedEntries, 'pending-cancelable');
      } else {
        traceSnapshotCache(trace, cacheStartedAt, 'hit', signal, this.snapshotCache.size, prunedEntries, 'pending');
        return cached.snapshotPromise;
      }
    } else {
      traceSnapshotCache(trace, cacheStartedAt, 'miss', signal, this.snapshotCache.size, prunedEntries);
    }

    if (signal) {
      const snapshot = await this.loadGraphSnapshotInternal(repository, options, limitPolicy, signal, trace);
      this.snapshotCache.set(cacheKey, {
        createdAt: Date.now(),
        snapshot,
        snapshotPromise: Promise.resolve(snapshot)
      });
      return snapshot;
    }

    const cacheEntry: SnapshotCacheEntry = {
      createdAt: now,
      snapshotPromise: this.loadGraphSnapshotInternal(repository, options, limitPolicy, signal, trace)
    };
    cacheEntry.snapshotPromise = cacheEntry.snapshotPromise
      .then((snapshot) => {
        cacheEntry.snapshot = snapshot;
        return snapshot;
      })
      .catch((error) => {
        if (this.snapshotCache.get(cacheKey) === cacheEntry) {
          this.snapshotCache.delete(cacheKey);
        }
        throw error;
      });
    this.snapshotCache.set(cacheKey, cacheEntry);

    return cacheEntry.snapshotPromise;
  }

  async loadRevisionLog(
    repository: Repository,
    source: RevisionLogSource,
    limit: number,
    skip = 0,
    showAllBranches?: boolean,
    filterText?: string,
    signal?: AbortSignal
  ): ReturnType<RevisionGraphLogBackend['loadRevisionLog']> {
    return this.revisionLogBackend.loadRevisionLog(
      repository,
      source,
      limit,
      skip,
      showAllBranches,
      filterText,
      signal
    );
  }

  async loadRevisionLogChanges(
    repository: Repository,
    commitHash: string,
    parentHash?: string
  ): ReturnType<RevisionLogChangesBackend['loadRevisionLogChanges']> {
    return this.revisionLogBackend.loadRevisionLogChanges(repository, commitHash, parentHash);
  }

  async loadUnifiedDiff(repository: Repository, left: string, right: string): Promise<string> {
    return execGit(
      repository.rootUri.fsPath,
      ['diff', '--no-color', '--end-of-options', left, right],
      {
        maxOutputBytes: UNIFIED_DIFF_MAX_OUTPUT_BYTES,
        timeoutMs: DEFAULT_GIT_COMMAND_TIMEOUT_MS
      }
    );
  }

  async loadCommitDetails(repository: Repository, commitHash: string): Promise<string> {
    return execGit(
      repository.rootUri.fsPath,
      ['show', '--stat', '--patch', '--format=fuller', '--no-color', '--end-of-options', commitHash],
      {
        maxOutputBytes: COMMIT_DETAILS_MAX_OUTPUT_BYTES,
        timeoutMs: DEFAULT_GIT_COMMAND_TIMEOUT_MS
      }
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

    const commitHashesByRef = buildCommitHashesByRefKey(snapshot.graph);
    const blockedFromGraph = getMergeBlockedTargetsFromGraph(
      snapshot.graph,
      currentHeadName,
      uniqueReferences,
      commitHashesByRef
    );
    const blockedSet = new Set(blockedFromGraph);

    const unresolvedReferences = uniqueReferences.filter((ref) =>
      ref.kind !== 'head' &&
      ref.name !== currentHeadName &&
      !blockedSet.has(`${ref.kind}::${ref.name}`) &&
      (commitHashesByRef.get(createRefKey(ref.kind, ref.name)) ?? []).length === 0
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
    signal?: AbortSignal,
    trace?: RevisionGraphLoadTraceSink
  ): Promise<RevisionGraphSnapshot> {
    const limits = [
      limitPolicy.initialLimit,
      ...limitPolicy.steppedLimits.filter((limit) => limit !== limitPolicy.initialLimit)
    ];

    let selectedSnapshot: RevisionGraphSnapshot | undefined;
    for (const limit of limits) {
      throwIfAborted(signal);
      const snapshot = await loadSnapshot(
        repository,
        limit,
        options,
        limitPolicy.graphCommandTimeoutMs,
        signal,
        trace
      );
      selectedSnapshot = snapshot;

      if (snapshot.graph.orderedCommits.length < limit) {
        break;
      }

      if (countVisibleNodes(snapshot.graph, options) >= limitPolicy.minVisibleNodes) {
        break;
      }
    }

    if (!selectedSnapshot) {
      return loadSnapshot(
        repository,
        limitPolicy.initialLimit,
        options,
        limitPolicy.graphCommandTimeoutMs,
        signal,
        trace
      );
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
  visibleReferences: readonly Pick<RevisionGraphViewReference, 'kind' | 'name'>[],
  commitHashesByRef = buildCommitHashesByRefKey(graph)
): string[] {
  const headStartHashes = commitHashesByRef.get(createRefKey('head', currentHeadName)) ?? [];
  const fallbackHeadHashes = headStartHashes.length > 0
    ? headStartHashes
    : commitHashesByRef.get(createRefKey('branch', currentHeadName)) ?? [];

  if (fallbackHeadHashes.length === 0) {
    return [];
  }

  const headAncestors = collectAncestorHashes(graph, fallbackHeadHashes);
  const blockedTargets = new Set<string>();

  for (const ref of visibleReferences) {
    if (ref.kind === 'head' || ref.name === currentHeadName) {
      continue;
    }

    const tipHashes = commitHashesByRef.get(createRefKey(ref.kind, ref.name)) ?? [];
    if (tipHashes.some((hash) => headAncestors.has(hash))) {
      blockedTargets.add(`${ref.kind}::${ref.name}`);
    }
  }

  return [...blockedTargets];
}

function buildCommitHashesByRefKey(graph: CommitGraph): Map<string, string[]> {
  const commitHashesByRef = new Map<string, string[]>();
  for (const commit of graph.orderedCommits) {
    for (const ref of commit.refs) {
      const key = createRefKey(ref.kind, ref.name);
      const hashes = commitHashesByRef.get(key);
      if (hashes) {
        hashes.push(commit.hash);
      } else {
        commitHashesByRef.set(key, [commit.hash]);
      }
    }
  }

  return commitHashesByRef;
}

function createRefKey(kind: RevisionGraphRef['kind'], name: string): string {
  return `${kind}::${name}`;
}

function countVisibleNodes(graph: CommitGraph, options: RevisionGraphProjectionOptions): number {
  return projectMajorOperationsGraph(graph, options).nodes.length;
}

function buildSnapshotCacheKey(
  repository: Repository,
  options: RevisionGraphProjectionOptions,
  limitPolicy: RevisionGraphLimitPolicy
): string {
  // Ref names and upstream metadata are applied later as overlays; the snapshot
  // cache key keeps only data that can change the loaded history window.
  const refsKey = [...new Set(repository.state.refs.map(buildSnapshotTopologyRefKey))]
    .sort()
    .join('|');
  const headKey = repository.state.HEAD?.commit
    ? `commit:${repository.state.HEAD.commit}`
    : `name:${repository.state.HEAD?.name ?? ''}`;
  const policyKey = [
    limitPolicy.initialLimit,
    limitPolicy.steppedLimits.join(','),
    limitPolicy.minVisibleNodes,
    limitPolicy.graphCommandTimeoutMs
  ].join(':');

  return [
    repository.rootUri.fsPath,
    headKey,
    refsKey,
    JSON.stringify(options),
    policyKey
  ].join('::');
}

function buildSnapshotTopologyRefKey(ref: Repository['state']['refs'][number]): string {
  return ref.commit
    ? `${ref.type}:commit:${ref.commit}`
    : `${ref.type}:name:${ref.remote ?? ''}:${ref.name ?? ''}`;
}

async function loadSnapshot(
  repository: Repository,
  limit: number,
  options: RevisionGraphProjectionOptions,
  graphCommandTimeoutMs: number,
  signal?: AbortSignal,
  trace?: RevisionGraphLoadTraceSink
): Promise<RevisionGraphSnapshot> {
  throwIfAborted(signal);
  const snapshotStartedAt = nowMs();
  const refsStartedAt = nowMs();
  const refsPromise = repository.getRefs()
    .finally(() => traceDuration(trace, 'snapshot.getRefs', refsStartedAt));
  const gitLogStartedAt = nowMs();
  const stdoutPromise = execGit(
    repository.rootUri.fsPath,
    buildRevisionGraphGitLogArgs(limit, options),
    {
      signal,
      maxOutputBytes: GRAPH_SNAPSHOT_MAX_OUTPUT_BYTES,
      timeoutMs: graphCommandTimeoutMs
    }
  )
    .finally(() => traceDuration(trace, 'snapshot.gitLog', gitLogStartedAt, `limit=${limit}; timeoutMs=${graphCommandTimeoutMs}`));
  const [refs, stdout] = await Promise.all([refsPromise, stdoutPromise]);
  throwIfAborted(signal);
  const parseStartedAt = nowMs();
  const refKindsByName = buildRevisionGraphRefKinds(refs);
  const graph = buildCommitGraphFromGitLog(stdout, refKindsByName, 'git-decoration');
  traceDuration(trace, 'snapshot.parseCommitGraph', parseStartedAt, `commits=${graph.orderedCommits.length}`);
  traceDuration(trace, 'snapshot.total', snapshotStartedAt, `limit=${limit}; chars=${stdout.length}`);

  return {
    graph,
    loadedAt: Date.now(),
    requestedLimit: limit
  };
}

function pruneExpiredSnapshotCacheEntries<T extends { readonly createdAt: number }>(
  cache: Map<string, T>,
  now: number
): number {
  let pruned = 0;
  for (const [key, entry] of cache.entries()) {
    if ((now - entry.createdAt) > SNAPSHOT_CACHE_TTL_MS) {
      cache.delete(key);
      pruned += 1;
    }
  }

  return pruned;
}

function traceSnapshotCache(
  trace: RevisionGraphLoadTraceSink | undefined,
  startedAt: number,
  result: 'hit' | 'miss' | 'bypass',
  signal: AbortSignal | undefined,
  entries: number,
  pruned: number,
  reason?: string
): void {
  const details = [
    `result=${result}`,
    `signal=${signal ? 'true' : 'false'}`,
    `entries=${entries}`,
    `pruned=${pruned}`
  ];
  if (reason) {
    details.push(`reason=${reason}`);
  }

  traceDuration(trace, 'snapshot.cache', startedAt, details.join('; '));
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
