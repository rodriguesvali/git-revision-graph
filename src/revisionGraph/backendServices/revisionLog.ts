import { throwIfAborted } from '../../errors';
import { execGit } from '../../gitExec';
import { Change, Repository } from '../../git';
import { loadComparisonChanges, type ComparisonChangesLoader } from '../../compareResults/endpointChanges';
import { emptyTreeHashForCommit } from '../../emptyTree';
import {
  REVISION_LOG_FILTER_SCAN_MAX_COMMITS,
  type RevisionLogEntry,
  type RevisionLogSource
} from '../revisionLogTypes';
import { RevisionGraphRef } from '../model/commitGraphTypes';
import { buildRevisionGraphRefKinds } from '../source/refIndex';
import {
  buildRevisionLogGitArgs,
  parseRevisionLogEntries
} from '../source/graphGit';
import { parseRevisionLogQuery, type RevisionLogQuery } from '../source/revisionLogQuery';
import { filterRevisionLogQueryBatch } from './revisionLogSearch';
import { qualifiedRevision } from '../../refActions/qualifiedRevision';

export interface RevisionGraphLogBackend {
  loadRevisionLog(
    repository: Repository,
    source: RevisionLogSource,
    limit: number,
    skip?: number,
    showAllBranches?: boolean,
    filterText?: string,
    signal?: AbortSignal
  ): Promise<{
    readonly entries: readonly RevisionLogEntry[];
    readonly hasMore: boolean;
    readonly searchTruncated: boolean;
  }>;
}

export interface RevisionLogChangesBackend {
  loadRevisionLogChanges(
    repository: Repository,
    commitHash: string,
    parentHash?: string
  ): Promise<readonly Change[]>;
}

const REVISION_LOG_MAX_OUTPUT_BYTES = 12 * 1024 * 1024;
const REVISION_LOG_FILTER_SCAN_BATCH_SIZE = 200;
const DEFAULT_GIT_COMMAND_TIMEOUT_MS = 15000;
const REVISION_LOG_ANCHOR_SCAN_BATCH_SIZE = 10000;
const REVISION_LOG_ANCHOR_SCAN_MAX_COMMITS = 200000;

export class DefaultRevisionLogBackend implements RevisionGraphLogBackend, RevisionLogChangesBackend {
  constructor(private readonly loadChanges: ComparisonChangesLoader = loadComparisonChanges) {}
  async loadRevisionLog(
    repository: Repository,
    source: RevisionLogSource,
    limit: number,
    skip = 0,
    showAllBranches = source.kind === 'range',
    filterText?: string,
    signal?: AbortSignal
  ): Promise<{
    readonly entries: readonly RevisionLogEntry[];
    readonly hasMore: boolean;
    readonly searchTruncated: boolean;
  }> {
    throwIfAborted(signal, 'The revision graph load was aborted.');
    const resolvedSource = source.kind === 'target' && source.refKind
      ? { ...source, revision: await resolveLogTarget(repository, source.revision, source.refKind, signal) }
      : source;
    const refSnapshot = showAllBranches && resolvedSource.kind === 'target'
      ? await captureRevisionTips(repository, signal)
      : undefined;
    const anchor = refSnapshot !== undefined && resolvedSource.kind === 'target'
      ? await findAllBranchesAnchor(repository, resolvedSource.revision, refSnapshot, signal)
      : undefined;
    const effectiveSource: RevisionLogSource = anchor && resolvedSource.kind === 'target'
      ? { ...resolvedSource, revision: anchor.hash }
      : resolvedSource;
    const anchorOffset = anchor?.offset ?? 0;
    const refKindsByName = buildRevisionGraphRefKinds(repository.state.refs);
    const query = parseRevisionLogQuery(filterText);
    if (query.text || query.file !== undefined || query.change !== undefined) {
      return this.loadFilteredRevisionLog(
        repository,
        effectiveSource,
        limit,
        skip,
        showAllBranches,
        query,
        refKindsByName,
        anchorOffset,
        refSnapshot,
        signal
      );
    }

    const stdout = await execGit(
      repository.rootUri.fsPath,
      buildRevisionLogGitArgs(effectiveSource, limit + 1, anchorOffset + skip, showAllBranches, refSnapshot !== undefined),
      {
        signal,
        stdin: refSnapshot,
        maxOutputBytes: REVISION_LOG_MAX_OUTPUT_BYTES,
        timeoutMs: DEFAULT_GIT_COMMAND_TIMEOUT_MS
      }
    );
    throwIfAborted(signal, 'The revision graph load was aborted.');
    const parsedEntries = parseRevisionLogEntries(stdout, refKindsByName);

    return {
      entries: parsedEntries.slice(0, limit),
      hasMore: parsedEntries.length > limit,
      searchTruncated: false
    };
  }

  async loadRevisionLogChanges(
    repository: Repository,
    commitHash: string,
    parentHash?: string
  ): Promise<readonly Change[]> {
    return this.loadChanges(repository, parentHash ?? emptyTreeHashForCommit(commitHash), commitHash);
  }

  private async loadFilteredRevisionLog(
    repository: Repository,
    source: RevisionLogSource,
    limit: number,
    skip: number,
    showAllBranches: boolean,
    query: RevisionLogQuery,
    refKindsByName: ReadonlyMap<string, RevisionGraphRef['kind']>,
    anchorOffset: number,
    refSnapshot: string | undefined,
    signal?: AbortSignal
  ): Promise<{
    readonly entries: readonly RevisionLogEntry[];
    readonly hasMore: boolean;
    readonly searchTruncated: boolean;
  }> {
    const matchedEntries: RevisionLogEntry[] = [];
    let skippedMatches = 0;
    let scannedCommits = 0;
    let searchTruncated = false;

    while (scannedCommits < REVISION_LOG_FILTER_SCAN_MAX_COMMITS && matchedEntries.length <= limit) {
      throwIfAborted(signal, 'The revision graph load was aborted.');
      const remainingScanBudget = REVISION_LOG_FILTER_SCAN_MAX_COMMITS - scannedCommits;
      const batchSize = Math.min(REVISION_LOG_FILTER_SCAN_BATCH_SIZE, remainingScanBudget);
      const isFinalScanBatch = batchSize === remainingScanBudget;
      const requestedBatchSize = batchSize + (isFinalScanBatch ? 1 : 0);
      const stdout = await execGit(
        repository.rootUri.fsPath,
        buildRevisionLogGitArgs(source, requestedBatchSize, anchorOffset + scannedCommits, showAllBranches, refSnapshot !== undefined),
        {
          signal,
          stdin: refSnapshot,
          maxOutputBytes: REVISION_LOG_MAX_OUTPUT_BYTES,
          timeoutMs: DEFAULT_GIT_COMMAND_TIMEOUT_MS
        }
      );
      throwIfAborted(signal, 'The revision graph load was aborted.');
      const parsedEntries = parseRevisionLogEntries(stdout, refKindsByName);
      const entriesToScan = parsedEntries.slice(0, batchSize);
      scannedCommits += entriesToScan.length;
      if (isFinalScanBatch && parsedEntries.length > batchSize) {
        searchTruncated = true;
      }

      const matchingEntries = await filterRevisionLogQueryBatch(repository, entriesToScan, query, signal);
      for (const entry of matchingEntries) {
        if (skippedMatches < skip) {
          skippedMatches += 1;
          continue;
        }

        matchedEntries.push(entry);
        if (matchedEntries.length > limit) {
          break;
        }
      }

      if (entriesToScan.length < batchSize) {
        break;
      }
    }

    return {
      entries: matchedEntries.slice(0, limit),
      hasMore: matchedEntries.length > limit,
      searchTruncated
    };
  }
}

async function resolveLogTarget(repository: Repository, revision: string, kind: RevisionGraphProtocol.TargetKind, signal?: AbortSignal): Promise<string> {
  if (kind === 'stash' && revision !== 'stash') throw new Error('Invalid stash reference.');
  const qualified = qualifiedRevision(revision, kind);
  const options = { signal, timeoutMs: DEFAULT_GIT_COMMAND_TIMEOUT_MS, maxOutputBytes: REVISION_LOG_MAX_OUTPUT_BYTES };
  const object = qualified.startsWith('refs/')
    ? (await execGit(repository.rootUri.fsPath, ['show-ref', '--verify', '--hash', '--', qualified], options)).trim()
    : qualified;
  const hash = (await execGit(repository.rootUri.fsPath, ['rev-parse', '--verify', '--end-of-options', `${object}^{commit}`], options)).trim();
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(hash)) throw new Error('The selected reference does not resolve to a commit.');
  return hash;
}

async function captureRevisionTips(repository: Repository, signal?: AbortSignal): Promise<string> {
  const output = await execGit(repository.rootUri.fsPath, ['rev-list', '--no-walk=unsorted', '--all'],
    { signal, timeoutMs: DEFAULT_GIT_COMMAND_TIMEOUT_MS, maxOutputBytes: REVISION_LOG_MAX_OUTPUT_BYTES });
  const hashes = output.trim() ? output.trim().split(/\r?\n/) : [];
  if (hashes.some(hash => !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(hash))) {
    throw new Error('Could not capture valid repository revision tips.');
  }
  return hashes.length ? `${hashes.join('\n')}\n` : '';
}

async function findAllBranchesAnchor(repository: Repository, revision: string, refSnapshot: string, signal?: AbortSignal): Promise<{ hash: string; offset: number }> {
  const options = { signal, timeoutMs: DEFAULT_GIT_COMMAND_TIMEOUT_MS, maxOutputBytes: REVISION_LOG_MAX_OUTPUT_BYTES };
  const hash = (await execGit(repository.rootUri.fsPath,
    ['rev-parse', '--verify', '--end-of-options', `${revision}^{commit}`], options)).trim();
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(hash)) throw new Error('Could not resolve the selected revision to a commit.');
  for (let offset = 0; offset < REVISION_LOG_ANCHOR_SCAN_MAX_COMMITS; offset += REVISION_LOG_ANCHOR_SCAN_BATCH_SIZE) {
    const output = await execGit(repository.rootUri.fsPath,
      ['rev-list', '--topo-order', '--stdin', `--max-count=${REVISION_LOG_ANCHOR_SCAN_BATCH_SIZE}`,
        `--skip=${offset}`, '--end-of-options', hash], { ...options, stdin: refSnapshot });
    const hashes = output.trim() ? output.trim().split('\n') : [];
    const index = hashes.indexOf(hash);
    if (index >= 0) return { hash, offset: offset + index };
    if (hashes.length < REVISION_LOG_ANCHOR_SCAN_BATCH_SIZE) break;
  }
  throw new Error('The selected revision could not be located within the first 200,000 commits of the all-branches history.');
}
