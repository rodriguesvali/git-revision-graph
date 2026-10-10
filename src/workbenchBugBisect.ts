import * as vscode from 'vscode';
import { isAbsolute, relative, sep } from 'node:path';
import { BugBisectSessions } from './bugBisect/session';
import type { RepositoryMutationCoordinator } from './repositoryMutationCoordinator';
import type { ShowLogPresenter } from './showLogView';
import type { API } from './git';

const STORAGE_KEY = 'gitRevisionGraph.bugBisectSessions.v1';

export function createWorkbenchBugBisectSessions(
  context: vscode.ExtensionContext,
  git: API,
  coordinator: RepositoryMutationCoordinator,
  showLog: ShowLogPresenter,
  changed: (root: string, state: RevisionGraphProtocol.BisectView | null, reveal: boolean) => void
): BugBisectSessions {
  return new BugBisectSessions(coordinator, {
    hasUnsavedDocuments(repository) {
      return vscode.workspace.textDocuments.some((document) => {
        if (!document.isDirty || document.uri.scheme !== 'file') return false;
        const owners = git.repositories.filter((candidate) => {
          const inside = relative(candidate.rootUri.fsPath, document.uri.fsPath);
          return inside !== '..' && !inside.startsWith(`..${sep}`) && !isAbsolute(inside);
        }).sort((left, right) => right.rootUri.fsPath.length - left.rootUri.fsPath.length);
        return owners[0]?.rootUri.fsPath === repository.rootUri.fsPath;
      });
    },
    save: (sessions) => context.workspaceState.update(STORAGE_KEY, sessions),
    changed,
    async confirmStop(destination, detached) {
      const label = detached ? 'Return to Original Commit' : 'Finish and Return';
      return await vscode.window.showWarningMessage(
        `End the bug search and return to ${detached ? 'the original commit' : destination}?`,
        { modal: true }, label
      ) === label;
    },
    async confirmAbandon(destination) {
      return await vscode.window.showWarningMessage(
        `Detach the bug-search controls? Git state and the current checkout will stay as they are. The original commit was ${destination}. Restore it manually when ready.`,
        { modal: true }, 'Detach Controls'
      ) === 'Detach Controls';
    },
    async inspect(repository, hash) {
      await showLog.showSource(repository, { kind: 'target', revision: hash, label: hash.slice(0, 7) });
    },
    copy: (hash) => vscode.env.clipboard.writeText(hash),
    async openSourceControl() { await vscode.commands.executeCommand('workbench.view.scm'); }
  }, context.workspaceState.get<unknown>(STORAGE_KEY));
}
