import * as path from 'node:path';
import type * as vscode from 'vscode';
import { execGit } from '../gitExec';
import { Status, type Change, type Repository } from '../git';

export type ComparisonChangesLoader = (repository: Repository, source: string, target: string) => Promise<readonly Change[]>;

interface EndpointChangesOptions {
  readonly signal?: AbortSignal;
  readonly fileUri?: (filePath: string) => vscode.Uri;
}

/** vscode.git.diffBetween uses a merge base; review surfaces require the two exact endpoints. */
export async function loadComparisonChanges(
  repository: Repository, source: string, target: string, options?: EndpointChangesOptions
): Promise<readonly Change[]> {
  if (![source, target].every(hash => /^[0-9a-f]{40,64}$/i.test(hash))) {
    throw new Error('Comparison requires immutable revision hashes.');
  }
  const output = await execGit(repository.rootUri.fsPath,
    ['diff', '--name-status', '-z', '--no-ext-diff', '--no-textconv', '--find-renames',
      '--diff-filter=ADMRT', '--end-of-options', source, target, '--'],
    { signal: options?.signal, timeoutMs: 15_000, maxOutputBytes: 32 * 1024 * 1024 });
  const fileUri = options?.fileUri ?? (await import('vscode')).Uri.file;
  return parseEndpointChanges(output, repository.rootUri.fsPath, fileUri);
}

function parseEndpointChanges(output: string, root: string, fileUri: (filePath: string) => vscode.Uri): Change[] {
  if (!output) return [];
  if (!output.endsWith('\0')) throw new Error('Git returned an incomplete comparison change list.');
  const records = output.slice(0, -1).split('\0');
  const changes: Change[] = [];
  let index = 0;
  while (index < records.length) {
    const code = records[index++];
    const status = endpointChangeStatus(code);
    const sourcePath = resolveChangePath(root, records[index++]);
    const originalUri = fileUri(sourcePath);
    const renameUri = status === Status.INDEX_RENAMED ? fileUri(resolveChangePath(root, records[index++])) : undefined;
    changes.push({ uri: originalUri, originalUri, renameUri, status });
  }
  return changes;
}

function endpointChangeStatus(code: string): Status {
  switch (code) {
    case 'A': return Status.INDEX_ADDED;
    case 'D': return Status.INDEX_DELETED;
    case 'M': return Status.MODIFIED;
    case 'T': return Status.TYPE_CHANGED;
    default:
      if (/^R\d{1,3}$/.test(code)) return Status.INDEX_RENAMED;
      throw new Error(`Git returned an unsupported comparison status: ${code}`);
  }
}

function resolveChangePath(root: string, value: string | undefined): string {
  if (!value || path.isAbsolute(value)) throw new Error('Git returned an invalid comparison path.');
  const absolute = path.resolve(root, value), relative = path.relative(root, absolute);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('Git returned a comparison path outside the repository.');
  }
  return absolute;
}
