import { execGit, execGitBinaryWithResult } from '../gitExec';
import { PATCH_MAX_BYTES } from './input';
import { loadWorktreePatch } from './worktreeExport';

export const PATCH_DIFF_ARGS = [
  '--binary', '--full-index', '--no-color', '--no-ext-diff', '--no-textconv',
  '--src-prefix=a/', '--dst-prefix=b/', '--find-renames'
] as const;

export function assertPatchRevision(hash: string): void {
  if (!/^[0-9a-f]{40,64}$/i.test(hash)) throw new Error('Patch export requires an immutable commit hash.');
}

export async function loadCommitPatch(root: string, hash: string, signal?: AbortSignal): Promise<Buffer> {
  assertPatchRevision(hash);
  const options = { signal, timeoutMs: 15_000, maxOutputBytes: PATCH_MAX_BYTES };
  const parents = await execGit(root, ['rev-list', '--parents', '-n', '1', hash, '--'], options);
  if (parents.trim().split(/\s+/).length > 2) throw new Error('Format Patch is not available for merge commits.');
  const result = await execGitBinaryWithResult(root, [
    '-c', 'format.coverLetter=false', '-c', 'format.useAutoBase=false',
    'format-patch', '-1', '--stdout', '--no-cover-letter', '--no-signature', '--no-attach', '--no-thread',
    ...PATCH_DIFF_ARGS, hash, '--'
  ], options);
  if (!result.stdout.length) throw new Error('This commit has no exportable changes.');
  return result.stdout;
}

export async function loadComparisonPatch(
  root: string, source: string, target?: string, signal?: AbortSignal
): Promise<Buffer> {
  assertPatchRevision(source);
  if (target === undefined) return loadWorktreePatch(root, source, signal);
  assertPatchRevision(target);
  return (await execGitBinaryWithResult(root, [
    'diff', ...PATCH_DIFF_ARGS, '--end-of-options', source, target, '--'
  ], { signal, timeoutMs: 15_000, maxOutputBytes: PATCH_MAX_BYTES })).stdout;
}
