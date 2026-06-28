import { spawn } from 'node:child_process';

import { createAbortError } from './errors';

const DEFAULT_GIT_EXECUTABLE = 'git';
export const GIT_EXEC_METADATA_PROFILE = Object.freeze({
  timeoutMs: 15_000,
  maxOutputBytes: 1024 * 1024
});
export const GIT_EXEC_LOCAL_MUTATION_PROFILE = Object.freeze({
  timeoutMs: 60_000,
  maxOutputBytes: 4 * 1024 * 1024
});
export const GIT_EXEC_REMOTE_PROFILE = Object.freeze({
  timeoutMs: 120_000,
  maxOutputBytes: 4 * 1024 * 1024
});
export const GIT_EXEC_FALLBACK_PROFILE = GIT_EXEC_LOCAL_MUTATION_PROFILE;
let configuredGitExecutablePath: string | undefined;
let configuredGitExecutableArgumentPrefix: readonly string[] = [];

export interface GitExecOptions {
  readonly signal?: AbortSignal;
  readonly maxOutputBytes?: number;
  readonly timeoutMs?: number;
  readonly allowedExitCodes?: readonly number[];
}

export interface GitExecResult {
  readonly stdout: string;
  readonly stderr: string;
}

export interface GitBinaryExecResult {
  readonly stdout: Buffer;
  readonly stderr: string;
}

interface GitExecError extends Error {
  code?: number;
  signal?: NodeJS.Signals | null;
  stdout?: string | Buffer;
  stderr?: string;
}

export function configureGitExecutablePath(
  value: unknown,
  argumentPrefix: readonly string[] = []
): void {
  configuredGitExecutablePath = normalizeGitExecutablePath(value);
  configuredGitExecutableArgumentPrefix = configuredGitExecutablePath
    ? [...argumentPrefix]
    : [];
}

export function getGitExecutablePath(): string {
  return configuredGitExecutablePath ?? DEFAULT_GIT_EXECUTABLE;
}

export async function execGit(
  repositoryPath: string,
  args: readonly string[],
  options?: GitExecOptions
): Promise<string> {
  const { stdout } = await execGitWithResult(repositoryPath, args, options);
  return stdout;
}

export async function execGitWithResult(
  repositoryPath: string,
  args: readonly string[],
  options: GitExecOptions = {}
): Promise<GitExecResult> {
  return execGitCapturedWithResult(repositoryPath, args, resolveGitExecOptions(options), 'text');
}

export async function execGitBinaryWithResult(
  repositoryPath: string,
  args: readonly string[],
  options: GitExecOptions = {}
): Promise<GitBinaryExecResult> {
  return execGitCapturedWithResult(repositoryPath, args, resolveGitExecOptions(options), 'binary');
}

export function resolveGitExecOptions(options: GitExecOptions = {}): GitExecOptions {
  return {
    ...options,
    timeoutMs: options.timeoutMs ?? GIT_EXEC_FALLBACK_PROFILE.timeoutMs,
    maxOutputBytes: options.maxOutputBytes ?? GIT_EXEC_FALLBACK_PROFILE.maxOutputBytes
  };
}

function createTimeoutError(timeoutMs: number): Error {
  const error = new Error(`The git command exceeded the timeout of ${timeoutMs} ms.`);
  error.name = 'TimeoutError';
  return error;
}

function normalizeGitExecutablePath(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const normalizedEntry = normalizeGitExecutablePath(entry);
      if (normalizedEntry) {
        return normalizedEntry;
      }
    }

    return undefined;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

function formatGitCommand(gitExecutablePath: string, args: readonly string[]): string {
  return `${gitExecutablePath} ${args.join(' ')}`;
}

function execGitCapturedWithResult(
  repositoryPath: string,
  args: readonly string[],
  options: GitExecOptions,
  stdoutMode: 'text'
): Promise<GitExecResult>;
function execGitCapturedWithResult(
  repositoryPath: string,
  args: readonly string[],
  options: GitExecOptions,
  stdoutMode: 'binary'
): Promise<GitBinaryExecResult>;
function execGitCapturedWithResult(
  repositoryPath: string,
  args: readonly string[],
  options: GitExecOptions,
  stdoutMode: 'text' | 'binary'
): Promise<GitExecResult | GitBinaryExecResult> {
  return new Promise<GitExecResult | GitBinaryExecResult>((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(createAbortError('The git command was aborted.'));
      return;
    }

    const gitExecutablePath = getGitExecutablePath();
    const child = spawn(gitExecutablePath, [...configuredGitExecutableArgumentPrefix, ...args], {
      cwd: repositoryPath,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });

    let stdout = '';
    const stdoutChunks: Buffer[] = [];
    let stderr = '';
    let settled = false;
    let capturedOutputBytes = 0;
    let timeout: NodeJS.Timeout | undefined;

    if (stdoutMode === 'text') {
      child.stdout.setEncoding('utf8');
    }
    child.stderr.setEncoding('utf8');

    const cleanup = () => {
      options.signal?.removeEventListener('abort', abortChildProcess);
      if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
      }
    };

    const currentStdout = (): string | Buffer =>
      stdoutMode === 'text' ? stdout : Buffer.concat(stdoutChunks);

    const resolveOnce = (result: GitExecResult | GitBinaryExecResult) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve(result);
    };

    const rejectOnce = (error: unknown) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(error);
    };

    const terminateAndReject = (error: unknown) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      void terminateChildProcess(child.pid).then(
        () => reject(error),
        () => reject(error)
      );
    };

    const rejectForOutputLimit = () => {
      const error = new Error(
        `${formatGitCommand(gitExecutablePath, args)} exceeded the maximum captured output of ${options.maxOutputBytes} bytes.`
      ) as GitExecError;
      error.stdout = currentStdout();
      error.stderr = stderr;
      terminateAndReject(error);
    };

    const trackCapturedBytes = (byteLength: number) => {
      capturedOutputBytes += byteLength;
      if (options.maxOutputBytes !== undefined && capturedOutputBytes > options.maxOutputBytes) {
        rejectForOutputLimit();
      }
    };

    const abortChildProcess = () => {
      terminateAndReject(createAbortError('The git command was aborted.'));
    };

    const timeoutChildProcess = () => {
      terminateAndReject(createTimeoutError(options.timeoutMs ?? 0));
    };

    options.signal?.addEventListener('abort', abortChildProcess, { once: true });
    if (options.timeoutMs !== undefined) {
      timeout = setTimeout(timeoutChildProcess, options.timeoutMs);
    }

    child.stdout.on('data', (chunk: string | Buffer) => {
      if (settled) {
        return;
      }

      const chunkByteLength = typeof chunk === 'string' ? Buffer.byteLength(chunk, 'utf8') : chunk.byteLength;
      trackCapturedBytes(chunkByteLength);
      if (settled) {
        return;
      }

      if (stdoutMode === 'text') {
        stdout += chunk as string;
      } else {
        stdoutChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, 'utf8'));
      }
    });

    child.stderr.on('data', (chunk: string) => {
      if (settled) {
        return;
      }

      trackCapturedBytes(Buffer.byteLength(chunk, 'utf8'));
      if (settled) {
        return;
      }

      stderr += chunk;
    });

    child.on('error', (error) => {
      rejectOnce(error);
    });

    child.on('close', (code, signal) => {
      if (settled) {
        return;
      }

      const resolvedStdout = currentStdout();
      if (code === 0 || (code !== null && options.allowedExitCodes?.includes(code))) {
        resolveOnce({ stdout: resolvedStdout as string & Buffer, stderr });
        return;
      }

      const error = new Error(
        signal
          ? `${formatGitCommand(gitExecutablePath, args)} exited with signal ${signal}.`
          : `${formatGitCommand(gitExecutablePath, args)} exited with code ${code ?? 'unknown'}.`
      ) as GitExecError;
      error.code = code ?? undefined;
      error.signal = signal;
      error.stdout = resolvedStdout;
      error.stderr = stderr;
      rejectOnce(error);
    });
  });
}

function terminateChildProcess(pid: number | undefined): Promise<void> {
  if (!pid) {
    return Promise.resolve();
  }

  if (process.platform === 'win32') {
    return new Promise((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true
      });
      killer.once('error', () => resolve());
      killer.once('close', () => resolve());
    });
  }

  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // The process already exited between the state check and termination.
    }
  }

  return Promise.resolve();
}
