import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { execGit, execGitBinaryWithResult } from '../gitExec';
import { PATCH_MAX_BYTES } from './input';

// A separate index makes every existing, nonignored file visible to diff without
// changing the user's staging area. Cached paths also retain ignored staged files.
export async function loadWorktreePatch(root: string, source: string, signal?: AbortSignal): Promise<Buffer> {
  const options = { signal, timeoutMs: 15_000, maxOutputBytes: PATCH_MAX_BYTES };
  const sparse = await execGit(root, ['config', '--bool', 'core.sparseCheckout'], { ...options, allowedExitCodes: [1] });
  if (sparse.trim() === 'true') throw new Error('Worktree patch export is not supported in a sparse checkout. Compare two references instead.');
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'grg-patch-export-'));
  try {
    const paths = (await execGitBinaryWithResult(root, [
      'ls-files', '-z', '--cached', '--others', '--exclude-standard'
    ], options)).stdout;
    const gitIndexFile = path.join(temporaryRoot, 'index');
    const pathspec = path.join(temporaryRoot, 'paths');
    await fs.writeFile(pathspec, paths, { flag: 'wx', mode: 0o600 });
    await execGit(root, ['read-tree', 'HEAD'], { ...options, gitIndexFile });
    if (paths.length) {
      await execGit(root, ['--literal-pathspecs', 'add', '--force', '--intent-to-add', '--ignore-removal',
        `--pathspec-from-file=${pathspec}`, '--pathspec-file-nul'], { ...options, gitIndexFile });
    }
    return (await execGitBinaryWithResult(root, [
      'diff', '--binary', '--full-index', '--no-color', '--no-ext-diff', '--no-textconv',
      '--src-prefix=a/', '--dst-prefix=b/', '--find-renames', '--end-of-options', source, '--'
    ], { ...options, gitIndexFile })).stdout;
  } finally {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
}
