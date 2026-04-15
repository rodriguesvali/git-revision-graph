import { spawn } from 'node:child_process';

export interface GitExecOptions {
  readonly signal?: AbortSignal;
  readonly maxOutputBytes?: number;
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
  return execGitCapturedWithResult(repositoryPath, args, options, 'text');
}

export async function execGitBinaryWithResult(
  repositoryPath: string,
  args: readonly string[],
  options: GitExecOptions = {}
): Promise<GitBinaryExecResult> {
  return execGitCapturedWithResult(repositoryPath, args, options, 'binary');
}

function createAbortError(): Error {
  const error = new Error('The git command was aborted.');
  error.name = 'AbortError';
  return error;
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
      reject(createAbortError());
      return;
    }

    const child = spawn('git', [...args], {
      cwd: repositoryPath,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    const stdoutChunks: Buffer[] = [];
    let stderr = '';
    let settled = false;
    let capturedOutputBytes = 0;

    if (stdoutMode === 'text') {
      child.stdout.setEncoding('utf8');
    }
    child.stderr.setEncoding('utf8');

    const cleanup = () => {
      options.signal?.removeEventListener('abort', abortChildProcess);
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

    const rejectForOutputLimit = () => {
      if (child.exitCode === null && !child.killed) {
        child.kill();
      }

      const error = new Error(
        `git ${args.join(' ')} exceeded the maximum captured output of ${options.maxOutputBytes} bytes.`
      ) as GitExecError;
      error.stdout = currentStdout();
      error.stderr = stderr;
      rejectOnce(error);
    };

    const trackCapturedBytes = (byteLength: number) => {
      capturedOutputBytes += byteLength;
      if (options.maxOutputBytes !== undefined && capturedOutputBytes > options.maxOutputBytes) {
        rejectForOutputLimit();
      }
    };

    const abortChildProcess = () => {
      if (child.exitCode === null && !child.killed) {
        child.kill();
      }

      rejectOnce(createAbortError());
    };

    options.signal?.addEventListener('abort', abortChildProcess, { once: true });

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
      if (code === 0) {
        resolveOnce({ stdout: resolvedStdout as string & Buffer, stderr });
        return;
      }

      const error = new Error(
        signal
          ? `git ${args.join(' ')} exited with signal ${signal}.`
          : `git ${args.join(' ')} exited with code ${code ?? 'unknown'}.`
      ) as GitExecError;
      error.code = code ?? undefined;
      error.signal = signal;
      error.stdout = resolvedStdout;
      error.stderr = stderr;
      rejectOnce(error);
    });
  });
}
