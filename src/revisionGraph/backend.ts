import { execGit } from '../gitExec';
import { Repository } from '../git';
import { RevisionGraphViewReference, RevisionLogSource } from '../revisionGraphTypes';
import {
  CommitGraph,
  RevisionGraphProjectionOptions
} from './model/commitGraphTypes';
import { projectMajorOperationsGraph } from './projection/graphProjection';
import { buildRevisionGraphRefKinds } from './source/refIndex';
import { RevisionGraphSnapshot } from './source/graphSnapshot';
import {
  buildCommitGraphFromGitLog,
  buildRevisionGraphGitLogArgs
} from './source/graphGit';
import { nowMs, traceDuration, RevisionGraphLoadTraceSink } from './loadTrace';
import { DefaultRevisionGraphDocumentBackend } from './backendServices/document';
import { DefaultRevisionGraphMergeAnalysisBackend } from './backendServices/mergeAnalysis';
import { DefaultRevisionLogBackend } from './backendServices/revisionLog';
import type { RevisionGraphDocumentBackend } from './backendServices/document';
import type { RevisionGraphMergeAnalysisBackend } from './backendServices/mergeAnalysis';
import type { RevisionGraphLogBackend, RevisionLogChangesBackend } from './backendServices/revisionLog';

export type { RevisionGraphDocumentBackend } from './backendServices/document';
export type { RevisionGraphMergeAnalysisBackend } from './backendServices/mergeAnalysis';
export type { RevisionGraphLogBackend, RevisionLogChangesBackend } from './backendServices/revisionLog';
export { getMergeBlockedTargetsFromGraph } from './backendServices/mergeAnalysis';

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

export type RevisionGraphStateBackend = RevisionGraphSnapshotBackend & RevisionGraphMergeAnalysisBackend;

export interface RevisionGraphBackend extends
  RevisionGraphSnapshotBackend,
  RevisionGraphLogBackend,
  RevisionGraphDocumentBackend,
  RevisionGraphMergeAnalysisBackend {}

export interface ShowLogBackend extends RevisionLogChangesBackend {}

const SNAPSHOT_CACHE_TTL_MS = 500;
const GRAPH_SNAPSHOT_MAX_OUTPUT_BYTES = 32 * 1024 * 1024;

interface SnapshotCacheEntry {
  readonly createdAt: number;
  snapshot?: RevisionGraphSnapshot;
  snapshotPromise: Promise<RevisionGraphSnapshot>;
}

export class DefaultRevisionGraphBackend implements RevisionGraphBackend, ShowLogBackend {
  private readonly snapshotCache = new Map<string, SnapshotCacheEntry>();

  constructor(
    private readonly revisionLogBackend: RevisionGraphLogBackend & RevisionLogChangesBackend = new DefaultRevisionLogBackend(),
    private readonly documentBackend: RevisionGraphDocumentBackend = new DefaultRevisionGraphDocumentBackend(),
    private readonly mergeAnalysisBackend: RevisionGraphMergeAnalysisBackend = new DefaultRevisionGraphMergeAnalysisBackend()
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
    return this.documentBackend.loadUnifiedDiff(repository, left, right);
  }

  async loadCommitDetails(repository: Repository, commitHash: string): Promise<string> {
    return this.documentBackend.loadCommitDetails(repository, commitHash);
  }

  async getMergeBlockedTargets(
    repository: Repository,
    snapshot: RevisionGraphSnapshot,
    currentHeadName: string | undefined,
    visibleReferences: readonly RevisionGraphViewReference[],
    signal?: AbortSignal
  ): Promise<string[]> {
    return this.mergeAnalysisBackend.getMergeBlockedTargets(
      repository,
      snapshot,
      currentHeadName,
      visibleReferences,
      signal
    );
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
