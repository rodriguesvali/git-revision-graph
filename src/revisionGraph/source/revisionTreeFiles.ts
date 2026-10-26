import * as path from 'node:path';
import { execGit } from '../../gitExec';

const MAX_REVISION_FILES = 100_000;

export function parseRevisionTreeFiles(output: string): string[] {
  if (output && !output.endsWith('\0')) throw new Error('The revision file list is incomplete.');
  const files: string[] = [];
  for (const record of output.split('\0')) {
    if (!record) continue;
    const entry = /^([0-7]{6}) (blob|commit) ([0-9a-f]{40,64})\t([\s\S]+)$/.exec(record);
    if (!entry) throw new Error('Git returned an invalid revision file entry.');
    if (entry[2] !== 'blob') continue;
    const file = entry[4];
    if (path.isAbsolute(file) || file.split('/').some(part => !part || part === '.' || part === '..')
      || (process.platform === 'win32' && file.includes('\\'))) {
      throw new Error('The revision file path is outside its repository.');
    }
    files.push(file);
    if (files.length > MAX_REVISION_FILES) throw new Error('This revision has too many files to display (limit: 100,000).');
  }
  return files;
}

export async function loadRevisionTreeFiles(
  repositoryPath: string,
  commitHash: string,
  signal: AbortSignal,
  execute: typeof execGit = execGit
): Promise<string[]> {
  if (!/^[0-9a-f]{40,64}$/i.test(commitHash)) throw new Error('The revision must be an immutable commit.');
  const output = await execute(repositoryPath, ['ls-tree', '-r', '-z', '--full-tree', commitHash, '--'],
    { signal, timeoutMs: 15_000, maxOutputBytes: 16 * 1024 * 1024 });
  return parseRevisionTreeFiles(output);
}
