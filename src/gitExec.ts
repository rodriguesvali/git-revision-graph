import { spawn } from 'node:child_process';

export interface GitExecOptions {
  readonly signal?: AbortSignal;
  readonly maxOutputBytes?: number;
}

export interface GitExecResult {
  readonly stdout: string;
  readonly stderr: string;
}

interface GitExecError extends Error {
  code?: number;
  signal?: NodeJS.Signals | null;
  stdout?: string;
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
  return new Promise<GitExecResult>((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(createAbortError());
      return;
    }

    const child = spawn('git', [...args], {
      cwd: repositoryPath,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let settled = false;
    let capturedOutputBytes = 0;

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    const cleanup = () => {
      options.signal?.removeEventListener('abort', abortChildProcess);
    };

    const resolveOnce = (result: GitExecResult) => {
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
      error.stdout = stdout;
      error.stderr = stderr;
      rejectOnce(error);
    };

    const appendOutput = (current: string, chunk: string): string => {
      capturedOutputBytes += Buffer.byteLength(chunk, 'utf8');
      if (options.maxOutputBytes !== undefined && capturedOutputBytes > options.maxOutputBytes) {
        rejectForOutputLimit();
      }
      return current + chunk;
    };

    const abortChildProcess = () => {
      if (child.exitCode === null && !child.killed) {
        child.kill();
      }

      rejectOnce(createAbortError());
    };

    options.signal?.addEventListener('abort', abortChildProcess, { once: true });

    child.stdout.on('data', (chunk: string) => {
      if (settled) {
        return;
      }

      stdout = appendOutput(stdout, chunk);
    });

    child.stderr.on('data', (chunk: string) => {
      if (settled) {
        return;
      }

      stderr = appendOutput(stderr, chunk);
    });

    child.on('error', (error) => {
      rejectOnce(error);
    });

    child.on('close', (code, signal) => {
      if (settled) {
        return;
      }

      if (code === 0) {
        resolveOnce({ stdout, stderr });
        return;
      }

      const error = new Error(
        signal
          ? `git ${args.join(' ')} exited with signal ${signal}.`
          : `git ${args.join(' ')} exited with code ${code ?? 'unknown'}.`
      ) as GitExecError;
      error.code = code ?? undefined;
      error.signal = signal;
      error.stdout = stdout;
      error.stderr = stderr;
      rejectOnce(error);
    });
  });
}

function createAbortError(): Error {
  const error = new Error('The git command was aborted.');
  error.name = 'AbortError';
  return error;
}
