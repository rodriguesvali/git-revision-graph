import { spawn, type ChildProcess } from 'node:child_process';

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
export const GIT_EXEC_TERMINATION_GRACE_MS = 250;
export const GIT_EXEC_FALLBACK_PROFILE = GIT_EXEC_LOCAL_MUTATION_PROFILE;
let configuredGitExecutablePath: string | undefined;
let configuredGitExecutableArgumentPrefix: readonly string[] = [];

export interface GitExecOptions {
  readonly signal?: AbortSignal;
  readonly maxOutputBytes?: number;
  readonly timeoutMs?: number;
  readonly allowedExitCodes?: readonly number[];
  readonly gitIndexFile?: string;
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

interface ChildTerminationTarget {
  readonly child: ChildProcess;
  readonly pid: number;
  readonly processGroupId: number | undefined;
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
      env: options.gitIndexFile
        ? { ...process.env, GIT_INDEX_FILE: options.gitIndexFile }
        : process.env,
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
      void terminateChildProcess(child).then(
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

function terminateChildProcess(child: ChildProcess): Promise<void> {
  const target = createChildTerminationTarget(child);
  if (!target) {
    return Promise.resolve();
  }

  if (process.platform === 'win32') {
    return new Promise((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(target.pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true
      });
      killer.once('error', () => resolve());
      killer.once('close', () => resolve());
    });
  }

  return terminateUnixProcessGroup(target);
}

function createChildTerminationTarget(child: ChildProcess): ChildTerminationTarget | undefined {
  if (!child.pid) {
    return undefined;
  }

  return {
    child,
    pid: child.pid,
    processGroupId: process.platform === 'win32' ? undefined : child.pid
  };
}

function terminateUnixProcessGroup(target: ChildTerminationTarget): Promise<void> {
  return new Promise((resolve) => {
    let escalationTimeout: NodeJS.Timeout | undefined;
    const finish = () => {
      target.child.removeListener('exit', finish);
      if (escalationTimeout) {
        clearTimeout(escalationTimeout);
        escalationTimeout = undefined;
      }
      resolve();
    };

    target.child.once('exit', finish);
    signalUnixProcessGroup(target, 'SIGTERM');
    if (!isChildTerminationTargetRunning(target)) {
      finish();
      return;
    }

    escalationTimeout = setTimeout(() => {
      if (isChildTerminationTargetRunning(target)) {
        signalUnixProcessGroup(target, 'SIGKILL');
      }
      finish();
    }, GIT_EXEC_TERMINATION_GRACE_MS);
  });
}

function isChildTerminationTargetRunning(target: ChildTerminationTarget): boolean {
  return target.child.exitCode === null && target.child.signalCode === null;
}

function signalUnixProcessGroup(
  target: ChildTerminationTarget,
  signal: 'SIGTERM' | 'SIGKILL'
): void {
  if (target.processGroupId === undefined) {
    return;
  }

  try {
    process.kill(-target.processGroupId, signal);
  } catch {
    // Do not re-resolve or fall back to a PID that may no longer identify the spawned process.
  }
}
