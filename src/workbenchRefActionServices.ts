import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import * as vscode from 'vscode';

import { getLeftUri, getRightUri, isAddition, isDeletion } from './changePresentation';
import { Change, Repository } from './git';
import { EMPTY_SCHEME, REF_SCHEME } from './refContentProvider';
import { RefActionServices } from './refActions';
import { isRefAncestorOfHead } from './revisionGraphRepository';

const execFile = promisify(execFileCallback);

export function createWorkbenchRefActionServices(refresh?: () => void): RefActionServices {
  return {
    ui: {
      async pickChange(items, placeHolder) {
        return vscode.window.showQuickPick(items, {
          placeHolder,
          matchOnDescription: true,
          matchOnDetail: true
        });
      },
      async promptBranchName(options) {
        return vscode.window.showInputBox({
          prompt: options.prompt,
          value: options.value,
          validateInput: (value) => (value.trim().length === 0 ? 'Enter a branch name.' : undefined)
        });
      },
      async confirm(options) {
        const confirmation = await vscode.window.showWarningMessage(
          options.message,
          { modal: true },
          options.confirmLabel
        );
        return confirmation === options.confirmLabel;
      },
      showInformationMessage(message) {
        void vscode.window.showInformationMessage(message);
      },
      showWarningMessage(message) {
        void vscode.window.showWarningMessage(message);
      },
      async showErrorMessage(message) {
        await vscode.window.showErrorMessage(message);
      }
    },
    diffPresenter: {
      async openBetweenRefs(repository, change, leftRef, rightRef) {
        await openChangeDiffBetweenRefs(repository, change, leftRef, rightRef);
      },
      async openWithWorktree(repository, change, ref) {
        await openChangeDiffWithWorktree(repository, change, ref);
      }
    },
    refreshController: {
      refresh() {
        refresh?.();
      },
      updateViewMessage() {
        refresh?.();
      }
    },
    referenceManager: {
      async deleteRemoteBranch(repository, remoteName, branchName) {
        await execFile(
          'git',
          ['push', remoteName, '--delete', branchName],
          {
            cwd: repository.rootUri.fsPath,
            maxBuffer: 8 * 1024 * 1024
          }
        );
      },
      async unsetBranchUpstream(repository, branchName) {
        await execFile(
          'git',
          ['branch', '--unset-upstream', branchName],
          {
            cwd: repository.rootUri.fsPath,
            maxBuffer: 8 * 1024 * 1024
          }
        );
      }
    },
    ancestryInspector: {
      async isRefAncestorOfHead(repository, refName, headRefName) {
        return isRefAncestorOfHead(repository, refName, headRefName);
      }
    },
    formatPath(fsPath) {
      return vscode.workspace.asRelativePath(vscode.Uri.file(fsPath), false);
    }
  };
}

function buildRefUri(repository: Repository, ref: string, filePath: string): vscode.Uri {
  return vscode.Uri.from({
    scheme: REF_SCHEME,
    path: filePath,
    query: new URLSearchParams({
      repo: repository.rootUri.fsPath,
      ref,
      path: filePath
    }).toString()
  });
}

function buildEmptyUri(filePath: string): vscode.Uri {
  return vscode.Uri.from({
    scheme: EMPTY_SCHEME,
    path: filePath
  });
}

async function openChangeDiffBetweenRefs(
  repository: Repository,
  change: Change,
  leftRef: string,
  rightRef: string
): Promise<void> {
  const leftPath = getLeftUri(change).fsPath;
  const rightPath = getRightUri(change).fsPath;
  const leftIsEmpty = isAddition(change.status);
  const rightIsEmpty = isDeletion(change.status);
  const leftUri = leftIsEmpty ? buildEmptyUri(rightPath) : buildRefUri(repository, leftRef, leftPath);
  const rightUri = rightIsEmpty ? buildEmptyUri(leftPath) : buildRefUri(repository, rightRef, rightPath);
  const title = `${leftRef} <-> ${rightRef} • ${vscode.workspace.asRelativePath(vscode.Uri.file(rightPath), false)}`;

  await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title);
}

async function openChangeDiffWithWorktree(
  repository: Repository,
  change: Change,
  ref: string
): Promise<void> {
  const leftPath = getLeftUri(change).fsPath;
  const rightPath = getRightUri(change).fsPath;
  const leftIsEmpty = isAddition(change.status);
  const rightIsEmpty = isDeletion(change.status);
  const leftUri = leftIsEmpty ? buildEmptyUri(rightPath) : buildRefUri(repository, ref, leftPath);
  const rightUri = rightIsEmpty ? buildEmptyUri(leftPath) : vscode.Uri.file(rightPath);
  const title = `${ref} <-> worktree • ${vscode.workspace.asRelativePath(vscode.Uri.file(rightPath), false)}`;

  await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title);
}
