import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { hasGitExitCode } from '../../errorDetail';
import { execGit, execGitWithResult } from '../../gitExec';

const UNTRACKED_DIFF_MAX_PATHS = 4096;
const UNTRACKED_DIFF_MAX_PATHSPEC_BYTES = 2 * 1024 * 1024;
const UNTRACKED_DIFF_SETUP_MAX_OUTPUT_BYTES = 256 * 1024;
const UNTRACKED_DIFF_FALLBACK_BATCH_MAX_PATHS = 128;
const UNTRACKED_DIFF_FALLBACK_BATCH_MAX_BYTES = 16 * 1024;

export interface UntrackedUnifiedDiffOptions {
  readonly maxOutputBytes: number;
  readonly signal?: AbortSignal;
  readonly timeoutMs: number;
}

export function validateUntrackedUnifiedDiffPaths(
  untrackedPaths: readonly string[]
): void {
  if (untrackedPaths.length > UNTRACKED_DIFF_MAX_PATHS) {
    throw new Error(
      `The unified diff includes ${untrackedPaths.length} untracked paths; `
      + `the maximum is ${UNTRACKED_DIFF_MAX_PATHS}. Track, ignore, or remove files and try again.`
    );
  }

  const pathspecBytes = untrackedPaths.reduce(
    (total, untrackedPath) => total + Buffer.byteLength(untrackedPath, 'utf8') + 1,
    0
  );
  if (pathspecBytes > UNTRACKED_DIFF_MAX_PATHSPEC_BYTES) {
    throw new Error(
      'The untracked paths exceed the 2 MiB unified-diff path input limit. '
      + 'Track, ignore, or shorten paths and try again.'
    );
  }
}

export async function loadUntrackedUnifiedDiff(
  repositoryPath: string,
  untrackedPaths: readonly string[],
  options: UntrackedUnifiedDiffOptions
): Promise<string> {
  validateUntrackedUnifiedDiffPaths(untrackedPaths);
  if (untrackedPaths.length === 0) {
    return '';
  }

  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'git-revision-graph-diff-'));
  const indexPath = path.join(temporaryRoot, 'index');
  const pathspecPath = path.join(temporaryRoot, 'paths');
  try {
    await fs.writeFile(
      pathspecPath,
      Buffer.from(`${untrackedPaths.join('\0')}\0`, 'utf8'),
      { flag: 'wx', mode: 0o600 }
    );
    await addUntrackedPathsToTemporaryIndex(
      repositoryPath,
      indexPath,
      pathspecPath,
      untrackedPaths,
      options
    );
    const result = await execGitWithResult(
      repositoryPath,
      ['diff', '--no-color', '--no-ext-diff', '--no-textconv'],
      {
        gitIndexFile: indexPath,
        maxOutputBytes: options.maxOutputBytes,
        signal: options.signal,
        timeoutMs: options.timeoutMs
      }
    );
    if (result.stderr.trim().length > 0) {
      throw new Error(result.stderr.trim());
    }
    return result.stdout;
  } finally {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function addUntrackedPathsToTemporaryIndex(
  repositoryPath: string,
  indexPath: string,
  pathspecPath: string,
  untrackedPaths: readonly string[],
  options: UntrackedUnifiedDiffOptions
): Promise<void> {
  try {
    await execGit(
      repositoryPath,
      [
        '--literal-pathspecs',
        'add',
        '--intent-to-add',
        `--pathspec-from-file=${pathspecPath}`,
        '--pathspec-file-nul'
      ],
      createSetupOptions(indexPath, options)
    );
    return;
  } catch (error) {
    if (!hasGitExitCode(error, 129)) {
      throwActionableGitError(error);
    }
  }

  await Promise.all([
    fs.rm(indexPath, { force: true }),
    fs.rm(`${indexPath}.lock`, { force: true })
  ]);
  for (const batch of createFallbackPathBatches(untrackedPaths)) {
    try {
      await execGit(
        repositoryPath,
        ['--literal-pathspecs', 'add', '--intent-to-add', '--', ...batch],
        createSetupOptions(indexPath, options)
      );
    } catch (error) {
      throwActionableGitError(error);
    }
  }
}

function createSetupOptions(
  indexPath: string,
  options: UntrackedUnifiedDiffOptions
) {
  return {
    gitIndexFile: indexPath,
    maxOutputBytes: UNTRACKED_DIFF_SETUP_MAX_OUTPUT_BYTES,
    signal: options.signal,
    timeoutMs: options.timeoutMs
  };
}

function createFallbackPathBatches(
  untrackedPaths: readonly string[]
): readonly string[][] {
  const batches: string[][] = [];
  let currentBatch: string[] = [];
  let currentBytes = 0;
  for (const untrackedPath of untrackedPaths) {
    const pathBytes = Buffer.byteLength(untrackedPath, 'utf8') + 1;
    if (
      currentBatch.length > 0
      && (
        currentBatch.length >= UNTRACKED_DIFF_FALLBACK_BATCH_MAX_PATHS
        || currentBytes + pathBytes > UNTRACKED_DIFF_FALLBACK_BATCH_MAX_BYTES
      )
    ) {
      batches.push(currentBatch);
      currentBatch = [];
      currentBytes = 0;
    }
    currentBatch.push(untrackedPath);
    currentBytes += pathBytes;
  }
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }
  return batches;
}

function throwActionableGitError(error: unknown): never {
  const stderr = typeof error === 'object'
    && error !== null
    && typeof (error as { readonly stderr?: unknown }).stderr === 'string'
    ? (error as { readonly stderr: string }).stderr.trim()
    : '';
  if (stderr.length > 0) {
    throw new Error(stderr);
  }
  throw error;
}
