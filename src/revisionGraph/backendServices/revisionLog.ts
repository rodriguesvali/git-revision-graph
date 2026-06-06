import { throwIfAborted } from '../../errors';
import { execGit } from '../../gitExec';
import { Change, Repository } from '../../git';
import { RevisionLogEntry, RevisionLogSource } from '../../revisionGraphTypes';
import { RevisionGraphRef } from '../model/commitGraphTypes';
import { buildRevisionGraphRefKinds } from '../source/refIndex';
import {
  buildRevisionLogGitArgs,
  matchesRevisionLogFilter,
  normalizeRevisionLogFilterText,
  parseRevisionLogEntries
} from '../source/graphGit';

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
const REVISION_LOG_FILTER_SCAN_MAX_COMMITS = 2000;
const DEFAULT_GIT_COMMAND_TIMEOUT_MS = 15000;
const EMPTY_TREE_HASH = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';

export class DefaultRevisionLogBackend implements RevisionGraphLogBackend, RevisionLogChangesBackend {
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
  }> {
    throwIfAborted(signal, 'The revision graph load was aborted.');
    const refKindsByName = buildRevisionGraphRefKinds(repository.state.refs);
    const normalizedFilterText = normalizeRevisionLogFilterText(filterText);
    if (normalizedFilterText) {
      return this.loadFilteredRevisionLog(
        repository,
        source,
        limit,
        skip,
        showAllBranches,
        normalizedFilterText,
        refKindsByName,
        signal
      );
    }

    const stdout = await execGit(
      repository.rootUri.fsPath,
      buildRevisionLogGitArgs(source, limit + 1, skip, showAllBranches),
      {
        signal,
        maxOutputBytes: REVISION_LOG_MAX_OUTPUT_BYTES,
        timeoutMs: DEFAULT_GIT_COMMAND_TIMEOUT_MS
      }
    );
    throwIfAborted(signal, 'The revision graph load was aborted.');
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
  ): Promise<readonly Change[]> {
    return repository.diffBetween(parentHash ?? EMPTY_TREE_HASH, commitHash);
  }

  private async loadFilteredRevisionLog(
    repository: Repository,
    source: RevisionLogSource,
    limit: number,
    skip: number,
    showAllBranches: boolean,
    normalizedFilterText: string,
    refKindsByName: ReadonlyMap<string, RevisionGraphRef['kind']>,
    signal?: AbortSignal
  ): Promise<{
    readonly entries: readonly RevisionLogEntry[];
    readonly hasMore: boolean;
  }> {
    const matchedEntries: RevisionLogEntry[] = [];
    let skippedMatches = 0;
    let scannedCommits = 0;

    while (scannedCommits < REVISION_LOG_FILTER_SCAN_MAX_COMMITS && matchedEntries.length <= limit) {
      throwIfAborted(signal, 'The revision graph load was aborted.');
      const remainingScanBudget = REVISION_LOG_FILTER_SCAN_MAX_COMMITS - scannedCommits;
      const batchSize = Math.min(REVISION_LOG_FILTER_SCAN_BATCH_SIZE, remainingScanBudget);
      const stdout = await execGit(
        repository.rootUri.fsPath,
        buildRevisionLogGitArgs(source, batchSize, scannedCommits, showAllBranches),
        {
          signal,
          maxOutputBytes: REVISION_LOG_MAX_OUTPUT_BYTES,
          timeoutMs: DEFAULT_GIT_COMMAND_TIMEOUT_MS
        }
      );
      throwIfAborted(signal, 'The revision graph load was aborted.');
      const parsedEntries = parseRevisionLogEntries(stdout, refKindsByName);
      scannedCommits += parsedEntries.length;

      for (const entry of parsedEntries) {
        if (!matchesRevisionLogFilter(entry, normalizedFilterText)) {
          continue;
        }

        if (skippedMatches < skip) {
          skippedMatches += 1;
          continue;
        }

        matchedEntries.push(entry);
        if (matchedEntries.length > limit) {
          break;
        }
      }

      if (parsedEntries.length < batchSize) {
        break;
      }
    }

    return {
      entries: matchedEntries.slice(0, limit),
      hasMore: matchedEntries.length > limit
    };
  }
}
