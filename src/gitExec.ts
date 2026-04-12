import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const GIT_MAX_BUFFER = 8 * 1024 * 1024;

export async function execGit(repositoryPath: string, args: readonly string[]): Promise<string> {
  const { stdout } = await execFile(
    'git',
    [...args],
    {
      cwd: repositoryPath,
      maxBuffer: GIT_MAX_BUFFER
    }
  );

  return stdout;
}

export async function execGitWithResult(repositoryPath: string, args: readonly string[]) {
  return execFile(
    'git',
    [...args],
    {
      cwd: repositoryPath,
      maxBuffer: GIT_MAX_BUFFER
    }
  );
}
