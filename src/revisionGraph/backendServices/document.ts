import * as path from 'node:path';

import { execGit, execGitWithResult } from '../../gitExec';
import { Repository } from '../../git';

export interface RevisionGraphDocumentBackend {
  loadChangedPaths(
    repository: Repository,
    left: string,
    right: string,
    options?: RevisionGraphChangedPathOptions
  ): Promise<readonly RevisionGraphChangedPath[]>;
  loadUnifiedDiff(
    repository: Repository,
    left: string,
    right: string,
    options?: RevisionGraphUnifiedDiffOptions
  ): Promise<string>;
  loadUnifiedDiffWithWorktree(
    repository: Repository,
    ref: string,
    untrackedPaths: readonly string[],
    options?: RevisionGraphUnifiedDiffOptions
  ): Promise<string>;
  loadCommitDetails(repository: Repository, commitHash: string): Promise<string>;
}

export interface RevisionGraphChangedPath {
  readonly status: string;
  readonly paths: readonly string[];
}

export interface RevisionGraphChangedPathOptions {
  readonly signal?: AbortSignal;
  readonly maxOutputBytes?: number;
}

export interface RevisionGraphUnifiedDiffOptions {
  readonly paths?: readonly string[];
  readonly signal?: AbortSignal;
  readonly maxOutputBytes?: number;
}

const DEFAULT_GIT_COMMAND_TIMEOUT_MS = 15000;
const UNIFIED_DIFF_MAX_OUTPUT_BYTES = 32 * 1024 * 1024;
const COMMIT_DETAILS_MAX_OUTPUT_BYTES = 24 * 1024 * 1024;

export class DefaultRevisionGraphDocumentBackend implements RevisionGraphDocumentBackend {
  async loadChangedPaths(
    repository: Repository,
    left: string,
    right: string,
    options?: RevisionGraphChangedPathOptions
  ): Promise<readonly RevisionGraphChangedPath[]> {
    const output = await execGit(
      repository.rootUri.fsPath,
      ['diff', '--name-status', '-z', '--find-renames', '--find-copies', '--end-of-options', left, right],
      {
        maxOutputBytes: options?.maxOutputBytes ?? UNIFIED_DIFF_MAX_OUTPUT_BYTES,
        signal: options?.signal,
        timeoutMs: DEFAULT_GIT_COMMAND_TIMEOUT_MS
      }
    );
    return parseRevisionGraphChangedPaths(output);
  }

  async loadUnifiedDiff(
    repository: Repository,
    left: string,
    right: string,
    options?: RevisionGraphUnifiedDiffOptions
  ): Promise<string> {
    const paths = normalizeRepositoryRelativePaths(options?.paths);
    return execGit(
      repository.rootUri.fsPath,
      ['diff', '--no-color', '--end-of-options', left, right, ...toGitPathArgs(paths)],
      {
        maxOutputBytes: options?.maxOutputBytes ?? UNIFIED_DIFF_MAX_OUTPUT_BYTES,
        signal: options?.signal,
        timeoutMs: DEFAULT_GIT_COMMAND_TIMEOUT_MS
      }
    );
  }

  async loadUnifiedDiffWithWorktree(
    repository: Repository,
    ref: string,
    untrackedPaths: readonly string[],
    options?: RevisionGraphUnifiedDiffOptions
  ): Promise<string> {
    const normalizedUntrackedPaths = normalizeRepositoryRelativePaths(untrackedPaths) ?? [];
    const paths = normalizeRepositoryRelativePaths(options?.paths);
    const maxOutputBytes = options?.maxOutputBytes ?? UNIFIED_DIFF_MAX_OUTPUT_BYTES;
    const sections = [await execGit(
      repository.rootUri.fsPath,
      ['diff', '--no-color', '--end-of-options', ref, ...toGitPathArgs(paths)],
      {
        maxOutputBytes,
        signal: options?.signal,
        timeoutMs: DEFAULT_GIT_COMMAND_TIMEOUT_MS
      }
    )];

    let capturedBytes = Buffer.byteLength(sections[0], 'utf8');
    let hasContent = sections[0].length > 0;
    for (const untrackedPath of normalizedUntrackedPaths) {
      const separatorBytes = hasContent ? 1 : 0;
      const remainingBytes = maxOutputBytes - capturedBytes - separatorBytes;
      if (remainingBytes <= 0) {
        throw new Error('The unified diff exceeded the maximum captured output.');
      }

      const result = await execGitWithResult(
        repository.rootUri.fsPath,
        ['diff', '--no-color', '--no-index', '--', '/dev/null', untrackedPath],
        {
          allowedExitCodes: [1],
          maxOutputBytes: remainingBytes,
          signal: options?.signal,
          timeoutMs: DEFAULT_GIT_COMMAND_TIMEOUT_MS
        }
      );
      if (result.stderr.trim().length > 0) {
        throw new Error(result.stderr.trim());
      }

      const section = result.stdout;
      if (section.length > 0) {
        capturedBytes += separatorBytes + Buffer.byteLength(section, 'utf8');
        hasContent = true;
      }
      sections.push(section);
    }

    return sections.filter((section) => section.length > 0).join('\n');
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
}

export function parseRevisionGraphChangedPaths(output: string): readonly RevisionGraphChangedPath[] {
  const records = output.split('\0');
  const changes: RevisionGraphChangedPath[] = [];
  let index = 0;
  while (index < records.length) {
    const status = records[index++];
    if (!status) continue;
    const pathCount = status.startsWith('R') || status.startsWith('C') ? 2 : 1;
    const paths = records.slice(index, index + pathCount);
    index += pathCount;
    if (paths.length === pathCount && paths.every((value) => value.length > 0)) {
      changes.push({ status, paths });
    }
  }
  return changes;
}

function normalizeRepositoryRelativePaths(
  values: readonly string[] | undefined
): string[] | undefined {
  if (!values) {
    return undefined;
  }

  return [...new Set(values.map((value) => normalizeRepositoryRelativePath(value)))].sort();
}

function toGitPathArgs(paths: readonly string[] | undefined): string[] {
  return paths ? ['--', ...paths] : [];
}

function normalizeRepositoryRelativePath(value: string): string {
  const normalized = path.normalize(value);
  if (
    normalized.length === 0
    || normalized === '.'
    || normalized === '..'
    || normalized.startsWith(`..${path.sep}`)
    || path.isAbsolute(normalized)
  ) {
    throw new Error(`Cannot include an untracked path outside the repository: ${value}`);
  }

  return normalized.split(path.sep).join('/');
}
