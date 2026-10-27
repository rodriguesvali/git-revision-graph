import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { execGit } from '../gitExec';
import { assertPatchRevision } from './exportGit';

export interface PatchTarget { readonly branchName: string; readonly commitHash: string }
const ACTIVE_OPERATIONS = ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'BISECT_START',
  'rebase-apply', 'rebase-merge', 'sequencer'];

export async function inspectCleanPatchTarget(root: string, target: PatchTarget, signal?: AbortSignal): Promise<void> {
  assertPatchRevision(target.commitHash);
  const options = { signal, timeoutMs: 15_000, maxOutputBytes: 4 * 1024 * 1024 };
  const sparse = await execGit(root, ['config', '--bool', 'core.sparseCheckout'], { ...options, allowedExitCodes: [1] });
  if (sparse.trim() === 'true') throw new Error('Patch application is not supported in a sparse checkout.');
  const head = await execGit(root, ['rev-parse', '--verify', 'HEAD'], options);
  const branch = await execGit(root, ['symbolic-ref', '--quiet', 'HEAD'], options);
  if (head.trim() !== target.commitHash || branch.trim() !== `refs/heads/${target.branchName}`) {
    throw new Error('The checked-out branch or HEAD changed. Reopen Apply Patch on the current branch.');
  }
  const status = await execGit(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all'], options);
  if (status.length) throw new Error('The workspace must be clean before applying a patch. Commit, stash or remove current changes first.');
  for (const marker of ACTIVE_OPERATIONS) {
    const location = (await execGit(root, ['rev-parse', '--git-path', marker], options)).trim();
    if (await exists(path.resolve(root, location))) throw new Error('Finish the current Git operation before applying a patch.');
  }
}

export async function checkPatch(root: string, filePath: string, signal?: AbortSignal): Promise<string> {
  const options = { signal, timeoutMs: 15_000, maxOutputBytes: 4 * 1024 * 1024 };
  await execGit(root, ['apply', '--check', '--', filePath], options);
  const summary = await execGit(root, ['apply', '--stat', '--summary', '--', filePath], options);
  if (!summary.trim()) throw new Error('The patch contains no applicable changes.');
  if (/mode 160000|Subproject commit/.test(summary)) throw new Error('Submodule patches are not supported.');
  return summary;
}

async function exists(filePath: string): Promise<boolean> {
  try { await fs.lstat(filePath); return true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; }
}
