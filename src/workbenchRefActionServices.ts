import * as path from 'node:path';
import * as vscode from 'vscode';

import { getLeftUri, getRightUri, isAddition, isDeletion } from './changePresentation';
import { buildCompareResultRestorePlan } from './compareResultRestore';
import { execGitBinaryWithResult, execGitWithResult } from './gitExec';
import { Change, Repository } from './git';
import { EMPTY_SCHEME, REF_SCHEME } from './refContentProvider';
import { PreparedRefreshHandle, RefActionServices } from './refActions';
import { isMissingUpstreamConfigurationError } from './refActions/shared';
import { RevisionGraphRefreshRequestLike } from './revisionGraphRefresh';
import { isRefAncestorOfHead } from './revisionGraphRepository';

export function createWorkbenchRefActionServices(
  refresh?: (request?: RevisionGraphRefreshRequestLike) => void,
  prepare?: (request?: RevisionGraphRefreshRequestLike) => PreparedRefreshHandle | undefined,
  compareResultsPresenter?: RefActionServices['compareResultsPresenter']
): RefActionServices {
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
      async promptTagName(options) {
        return vscode.window.showInputBox({
          prompt: options.prompt,
          value: options.value,
          validateInput: (value) => (value.trim().length === 0 ? 'Enter a tag name.' : undefined)
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
      },
      async showSourceControl() {
        await vscode.commands.executeCommand('workbench.view.scm');
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
    compareResultsPresenter: compareResultsPresenter ?? {
      async showBetweenRefs() {},
      async showWithWorktree() {}
    },
    refreshController: {
      prepare(request) {
        return prepare?.(request);
      },
      refresh(request) {
        refresh?.(request);
      }
    },
    referenceManager: {
      async createTag(repository, tagName, refName) {
        await execGitWithResult(repository.rootUri.fsPath, ['tag', tagName, refName]);
      },
      async deleteRemoteBranch(repository, remoteName, branchName) {
        await execGitWithResult(repository.rootUri.fsPath, ['push', remoteName, '--delete', branchName]);
      },
      async unsetBranchUpstream(repository, branchName) {
        try {
          await execGitWithResult(repository.rootUri.fsPath, ['branch', '--unset-upstream', branchName]);
        } catch (error) {
          if (!isMissingUpstreamConfigurationError(error)) {
            throw error;
          }
        }
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

export async function openChangeDiffBetweenRefs(
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

export async function openChangeDiffWithWorktree(
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

export async function restoreWorktreeChangeFromRef(
  repository: Repository,
  change: Change,
  ref: string
): Promise<void> {
  const plan = buildCompareResultRestorePlan(change);

  for (const action of plan) {
    switch (action.kind) {
      case 'delete':
        await deleteFileIfPresent(vscode.Uri.file(action.targetPath));
        break;
      case 'write-ref': {
        const relativePath = path.relative(repository.rootUri.fsPath, action.refPath);
        const gitPath = relativePath.split(path.sep).join('/');
        const { stdout } = await execGitBinaryWithResult(repository.rootUri.fsPath, ['show', `${ref}:${gitPath}`]);
        const targetUri = vscode.Uri.file(action.targetPath);
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.dirname(action.targetPath)));
        await vscode.workspace.fs.writeFile(targetUri, stdout);
        break;
      }
    }
  }
}

async function deleteFileIfPresent(uri: vscode.Uri): Promise<void> {
  try {
    await vscode.workspace.fs.delete(uri, { recursive: false, useTrash: false });
  } catch (error) {
    const fileError = error as { readonly code?: string };
    if (fileError.code !== 'FileNotFound') {
      throw error;
    }
  }
}
