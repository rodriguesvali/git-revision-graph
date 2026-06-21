import { throwIfAborted } from '../../errors';
import { execGit } from '../../gitExec';
import { Ref, Repository } from '../../git';
import { CommitGraph, RevisionGraphProjectionOptions } from '../model/commitGraphTypes';
import { projectMajorOperationsGraph } from '../projection/graphProjection';
import { buildRevisionGraphRefKinds } from '../source/refIndex';
import { RevisionGraphSnapshot } from '../source/graphSnapshot';
import {
  buildCommitGraphFromGitLog,
  buildRevisionGraphGitLogArgs
} from '../source/graphGit';
import { nowMs, traceDuration, RevisionGraphLoadTraceSink } from '../loadTrace';

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
    trace?: RevisionGraphLoadTraceSink,
    context?: RevisionGraphSnapshotLoadContext
  ): Promise<RevisionGraphSnapshot>;
  clearGraphSnapshotCache?(): void;
}

export interface RevisionGraphSnapshotLoadContext {
  readonly repositoryRefs?: readonly Ref[] | PromiseLike<readonly Ref[]>;
}

const SNAPSHOT_CACHE_TTL_MS = 500;
const GRAPH_SNAPSHOT_MAX_OUTPUT_BYTES = 32 * 1024 * 1024;

interface SnapshotCacheEntry {
  readonly createdAt: number;
  snapshot?: RevisionGraphSnapshot;
  snapshotPromise: Promise<RevisionGraphSnapshot>;
}

export class DefaultRevisionGraphSnapshotBackend implements RevisionGraphSnapshotBackend {
  private readonly snapshotCache = new Map<string, SnapshotCacheEntry>();

  clearGraphSnapshotCache(): void {
    this.snapshotCache.clear();
  }

  async loadGraphSnapshot(
    repository: Repository,
    options: RevisionGraphProjectionOptions,
    limitPolicy: RevisionGraphLimitPolicy,
    signal?: AbortSignal,
    trace?: RevisionGraphLoadTraceSink,
    context?: RevisionGraphSnapshotLoadContext
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
      const snapshot = await loadGraphSnapshotInternal(repository, options, limitPolicy, signal, trace, context);
      this.snapshotCache.set(cacheKey, {
        createdAt: Date.now(),
        snapshot,
        snapshotPromise: Promise.resolve(snapshot)
      });
      return snapshot;
    }

    const cacheEntry: SnapshotCacheEntry = {
      createdAt: now,
      snapshotPromise: loadGraphSnapshotInternal(repository, options, limitPolicy, signal, trace, context)
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
}

async function loadGraphSnapshotInternal(
  repository: Repository,
  options: RevisionGraphProjectionOptions,
  limitPolicy: RevisionGraphLimitPolicy,
  signal?: AbortSignal,
  trace?: RevisionGraphLoadTraceSink,
  context?: RevisionGraphSnapshotLoadContext
): Promise<RevisionGraphSnapshot> {
  const limits = [
    limitPolicy.initialLimit,
    ...limitPolicy.steppedLimits.filter((limit) => limit !== limitPolicy.initialLimit)
  ];

  let selectedSnapshot: RevisionGraphSnapshot | undefined;
  for (const limit of limits) {
    throwIfAborted(signal, 'The revision graph load was aborted.');
    const snapshot = await loadSnapshot(
      repository,
      limit,
      options,
      limitPolicy.graphCommandTimeoutMs,
      signal,
      trace,
      context
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
      trace,
      context
    );
  }

  return selectedSnapshot;
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
  trace?: RevisionGraphLoadTraceSink,
  context?: RevisionGraphSnapshotLoadContext
): Promise<RevisionGraphSnapshot> {
  throwIfAborted(signal, 'The revision graph load was aborted.');
  const snapshotStartedAt = nowMs();
  const refsStartedAt = nowMs();
  const refsPromise = resolveSnapshotRepositoryRefs(repository, context)
    .finally(() => traceDuration(
      trace,
      'snapshot.getRefs',
      refsStartedAt,
      context?.repositoryRefs ? 'source=request-context' : 'source=repository'
    ));
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
  throwIfAborted(signal, 'The revision graph load was aborted.');
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

function resolveSnapshotRepositoryRefs(
  repository: Repository,
  context: RevisionGraphSnapshotLoadContext | undefined
): Promise<readonly Ref[]> {
  if (context?.repositoryRefs) {
    return Promise.resolve(context.repositoryRefs);
  }

  return repository.getRefs();
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
