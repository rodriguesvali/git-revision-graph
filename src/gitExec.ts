import { spawn } from 'node:child_process';

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

export async function execGit(repositoryPath: string, args: readonly string[]): Promise<string> {
  const { stdout } = await execGitWithResult(repositoryPath, args);
  return stdout;
}

export async function execGitWithResult(
  repositoryPath: string,
  args: readonly string[]
): Promise<GitExecResult> {
  return new Promise<GitExecResult>((resolve, reject) => {
    const child = spawn('git', [...args], {
      cwd: repositoryPath,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });

    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code, signal) => {
      if (code === 0) {
        resolve({ stdout, stderr });
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
      reject(error);
    });
  });
}
