import * as path from 'node:path';
import type { Change, Repository } from './git';

export type FileOpenSide = 'worktree' | 'source' | 'target';
export type FileOpenMessageType = 'openWorktreeFile' | 'openSourceFile' | 'openTargetFile';
export interface FileOpenTarget {
  readonly uri: Change['uri'];
  readonly revision?: string;
}

export interface FileOpenAction {
  readonly action: FileOpenMessageType;
  readonly label: string;
  readonly disabled: boolean;
  readonly title: string;
}

export function fileOpenAction(action: FileOpenMessageType, label: string, target?: FileOpenTarget): FileOpenAction {
  const disabled = !target || (!!target.revision && !/^[0-9a-f]{40,64}$/i.test(target.revision));
  return { action, label, disabled, title: disabled
    ? 'The file does not exist in this revision.'
    : action === 'openWorktreeFile' ? 'Open the current worktree file for editing.' : 'Open this revision read-only.' };
}

export interface FileOpenServices {
  isAvailable(uri: Change['uri']): Promise<boolean>;
  openWorktree(uri: Change['uri']): Promise<void>;
  openRevision(repository: Repository, uri: Change['uri'], revision: string, isCurrent: () => boolean): Promise<void>;
}

export function getFileOpenSide(type: string): FileOpenSide | undefined {
  switch (type) {
    case 'openWorktreeFile': return 'worktree';
    case 'openSourceFile': return 'source';
    case 'openTargetFile': return 'target';
    default: return undefined;
  }
}

export async function openFileTarget(
  repository: Repository,
  target: FileOpenTarget | undefined,
  isCurrent: () => boolean,
  services?: FileOpenServices
): Promise<void> {
  if (!target || !isCurrent()) return;
  const relative = path.relative(repository.rootUri.fsPath, target.uri.fsPath);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('The selected file is outside its repository.');
  }
  const effects = services ?? await import('./workbenchFileOpen');
  if (!isCurrent()) return;
  if (target.revision) {
    if (!/^[0-9a-f]{40,64}$/i.test(target.revision)) throw new Error('The file revision is not an immutable commit.');
    await effects.openRevision(repository, target.uri, target.revision, isCurrent);
    return;
  }
  const available = await effects.isAvailable(target.uri);
  if (!isCurrent()) return;
  if (!available) throw new Error('The file no longer exists in the worktree. Open an available historical version instead.');
  await effects.openWorktree(target.uri);
}
