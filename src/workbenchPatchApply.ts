import * as vscode from 'vscode';
import { getCurrentBranch, hasWorkspaceChanges } from './gitState';
import type { Repository } from './git';
import { createAbortError } from './errors';
import { inspectCleanPatchTarget, checkPatch, type PatchTarget } from './patches/applyGit';
import { applyPatchWorkflow } from './patches/applyWorkflow';
import { readPatchFile, preparePatchInput } from './patches/input';
import { RepositoryMutationCoordinator } from './repositoryMutationCoordinator';
import { showConcurrentRepositoryMutationWarning } from './repositoryMutationWarning';
import { hasDirtyPatchEditors } from './workbenchPatchFiles';

export async function applyPatchFromGraph(
  repository: Repository, target: PatchTarget, coordinator: RepositoryMutationCoordinator,
  isCurrent: () => boolean, refresh: () => Promise<void>
): Promise<void> {
  const root = repository.rootUri.fsPath;
  const outcome = await coordinator.run(root, async lease => {
    const assertCurrent = () => {
      lease.assertCurrent();
      if (!isCurrent()) throw createAbortError('The patch destination is no longer current.');
      const head = getCurrentBranch(repository);
      if (head?.name !== target.branchName || head.commit !== target.commitHash || hasDirtyPatchEditors(root) || hasWorkspaceChanges(repository)) {
        throw createAbortError('The checked-out branch or editor state changed. Reopen Apply Patch.');
      }
    };
    await applyPatchWorkflow({
      assertCurrent,
      async inspectTarget() {
        const head = getCurrentBranch(repository);
        if (head?.name !== target.branchName || head.commit !== target.commitHash) {
          throw new Error('Apply Patch is available only on the currently checked-out branch.');
        }
        if (hasWorkspaceChanges(repository) || hasDirtyPatchEditors(root)) {
          throw new Error('The workspace must be clean, including unsaved editors, before applying a patch.');
        }
        await inspectCleanPatchTarget(root, target, lease.signal);
      },
      async pickPatch() {
        const files = await vscode.window.showOpenDialog({ canSelectMany: false, openLabel: 'Select Patch',
          filters: { Patch: ['patch', 'diff'], 'All files': ['*'] } });
        assertCurrent(); return files?.[0] ? readPatchFile(files[0].fsPath) : undefined;
      },
      prepare: preparePatchInput,
      check: filePath => checkPatch(root, filePath, lease.signal),
      async confirm(summary) {
        return await vscode.window.showWarningMessage(
          `Apply patch to ${target.branchName}?`, { modal: true,
            detail: `${root}\n\n${summary.slice(0, 8000)}\n\nChanges will remain unstaged. No commit will be created.` },
          'Apply Patch') === 'Apply Patch';
      },
      async apply(filePath) { assertCurrent(); await repository.apply(filePath); },
      async refresh() {
        if (isCurrent()) { await refresh(); await vscode.commands.executeCommand('workbench.view.scm'); }
      }
    });
  });
  if (outcome.status === 'rejected') await showConcurrentRepositoryMutationWarning(vscode.window);
}
