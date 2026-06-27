import * as path from 'node:path';
import * as vscode from 'vscode';

import { getLeftUri, getRightUri, isAddition, isDeletion } from './changePresentation';
import {
  assertCompareResultRestorePlanInsideRepository,
  buildCompareResultRestorePlan,
  type CompareResultRestoreSourceSide
} from './compareResultRestore';
import { hasGitExitCode } from './errorDetail';
import {
  execGitWithResult,
  GIT_EXEC_LOCAL_MUTATION_PROFILE,
  GIT_EXEC_METADATA_PROFILE
} from './gitExec';
import { executeCompareResultRestorePlan } from './compareResultRestoreExecutor';
import { Change, Repository } from './git';
import { EMPTY_SCHEME, REF_SCHEME } from './refContentProvider';
import { CurrentBranchPushMode, PreparedRefreshHandle, RefActionServices, RemoteCheckoutInput } from './refActions';
import { pushCurrentBranchWithMode } from './refActions/currentBranchPushAdapter';
import {
  buildRemoteBranchDeleteRefspec,
  buildRemoteTagDeleteRefspec,
  getRepositoryRemoteNames,
  isMissingUpstreamConfigurationError
} from './refActions/shared';
import { validateGitBranchName } from './refActions/branchValidation';
import { buildTagPushRefspec } from './refActions/tagRefspec';
import { validateGitTagName } from './refActions/tagValidation';
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
      async pickRemoteName(items, placeHolder) {
        return vscode.window.showQuickPick(items, {
          placeHolder,
          matchOnDescription: true
        });
      },
      async promptBranchName(options) {
        return vscode.window.showInputBox({
          prompt: options.prompt,
          value: options.value,
          validateInput: validateGitBranchName
        });
      },
      async promptTagName(options) {
        return vscode.window.showInputBox({
          prompt: options.prompt,
          value: options.value,
          validateInput: (value) => validateGitTagName(value, options.existingTagNames)
        });
      },
      async promptRemoteBranchCheckout(options) {
        type RemoteCheckoutQuickPickItem = vscode.QuickPickItem & {
          readonly option: 'overrideBranchIfExists';
        };
        const overrideItem: RemoteCheckoutQuickPickItem = {
          label: 'Override branch if exists',
          description: 'reset local branch',
          detail: `Reset the local branch to ${options.startPointRefName}. Local commits that are not reachable from another ref may be lost.`,
          option: 'overrideBranchIfExists',
          alwaysShow: true
        };
        const quickPick = vscode.window.createQuickPick<RemoteCheckoutQuickPickItem>();
        quickPick.title = options.prompt;
        quickPick.placeholder = 'Enter a local branch name';
        quickPick.value = options.value;
        quickPick.canSelectMany = true;
        quickPick.matchOnDescription = true;
        quickPick.matchOnDetail = true;
        quickPick.items = [overrideItem];

        return await new Promise<RemoteCheckoutInput | undefined>((resolve) => {
          let isDone = false;
          const finish = (value: RemoteCheckoutInput | undefined) => {
            if (isDone) {
              return;
            }

            isDone = true;
            quickPick.hide();
            quickPick.dispose();
            resolve(value);
          };

          quickPick.onDidChangeValue(() => {
            quickPick.placeholder = 'Enter a local branch name';
          });
          quickPick.onDidAccept(() => {
            const branchName = quickPick.value;
            const validationMessage = validateGitBranchName(branchName);
            if (validationMessage) {
              quickPick.placeholder = validationMessage;
              return;
            }

            finish({
              branchName: branchName.trim(),
              overrideBranchIfExists: quickPick.selectedItems.some((item) => item.option === 'overrideBranchIfExists')
            });
          });
          quickPick.onDidHide(() => {
            finish(undefined);
          });
          quickPick.show();
        });
      },
      async pickCurrentBranchPushMode(options) {
        const items: Array<vscode.QuickPickItem & { readonly mode: CurrentBranchPushMode }> = [
          {
            label: 'Push',
            description: 'normal',
            detail: `Push ${options.branchName} to ${options.upstreamLabel}.`,
            mode: 'normal'
          },
          {
            label: 'Push with Force With Lease',
            description: 'recommended force option',
            detail: 'Rewrite the remote branch only if it has not changed since your last fetch.',
            mode: 'force-with-lease'
          },
          {
            label: 'Push with Force',
            description: 'unsafe',
            detail: 'Rewrite the remote branch without checking whether someone else updated it.',
            mode: 'force'
          }
        ];
        return (await vscode.window.showQuickPick(items, {
          placeHolder: `Choose how to push ${options.branchName} to ${options.upstreamLabel}`,
          matchOnDescription: true,
          matchOnDetail: true
        }))?.mode;
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
        await execGitWithResult(repository.rootUri.fsPath, ['tag', tagName, refName], GIT_EXEC_LOCAL_MUTATION_PROFILE);
      },
      async resetBranch(repository, branchName, refName) {
        await execGitWithResult(repository.rootUri.fsPath, ['branch', '--force', branchName, refName], GIT_EXEC_LOCAL_MUTATION_PROFILE);
      },
      async resetCurrentBranch(repository, refName) {
        await execGitWithResult(repository.rootUri.fsPath, ['reset', '--hard', refName], GIT_EXEC_LOCAL_MUTATION_PROFILE);
      },
      async resetWorkspace(repository, includeUntracked) {
        await execGitWithResult(repository.rootUri.fsPath, ['reset', '--hard', 'HEAD'], GIT_EXEC_LOCAL_MUTATION_PROFILE);
        if (includeUntracked) {
          await execGitWithResult(repository.rootUri.fsPath, ['clean', '-fd'], GIT_EXEC_LOCAL_MUTATION_PROFILE);
        }
      },
      async getRemoteNames(repository) {
        return getRepositoryRemoteNames(repository);
      },
      async pushCurrentBranch(repository, remoteName, branchName, mode) {
        return pushCurrentBranchWithMode(repository, remoteName, branchName, mode, getCurrentBranchAhead);
      },
      async pushTag(repository, remoteName, tagName) {
        await repository.push(remoteName, buildTagPushRefspec(tagName), false);
      },
      async deleteRemoteTag(repository, remoteName, tagName) {
        await repository.push(remoteName, buildRemoteTagDeleteRefspec(tagName), false);
      },
      async deleteRemoteBranch(repository, remoteName, branchName) {
        await repository.push(remoteName, buildRemoteBranchDeleteRefspec(branchName), false);
      },
      async unsetBranchUpstream(repository, branchName) {
        try {
          await execGitWithResult(repository.rootUri.fsPath, ['branch', '--unset-upstream', branchName], GIT_EXEC_LOCAL_MUTATION_PROFILE);
        } catch (error) {
          if (!isMissingUpstreamConfigurationError(error)) {
            throw error;
          }
        }
      },
      async abortMerge(repository) {
        await execGitWithResult(repository.rootUri.fsPath, ['merge', '--abort'], GIT_EXEC_LOCAL_MUTATION_PROFILE);
      },
      async stashSave(repository) {
        await execGitWithResult(repository.rootUri.fsPath, ['stash', 'push', '--include-untracked', '-m', 'stash'], GIT_EXEC_LOCAL_MUTATION_PROFILE);
      },
      async stashApply(repository, stashRefName) {
        await execGitWithResult(repository.rootUri.fsPath, ['stash', 'apply', normalizeStashRefName(stashRefName)], GIT_EXEC_LOCAL_MUTATION_PROFILE);
      },
      async stashPop(repository, stashRefName) {
        await execGitWithResult(repository.rootUri.fsPath, ['stash', 'pop', normalizeStashRefName(stashRefName)], GIT_EXEC_LOCAL_MUTATION_PROFILE);
      },
      async stashDrop(repository, stashRefName) {
        const normalizedStashRefName = normalizeStashRefName(stashRefName);
        const droppedHash = await resolveGitCommit(repository.rootUri.fsPath, normalizedStashRefName);
        await execGitWithResult(repository.rootUri.fsPath, ['stash', 'drop', normalizedStashRefName], GIT_EXEC_LOCAL_MUTATION_PROFILE);
        const currentHash = await resolveGitCommit(repository.rootUri.fsPath, normalizedStashRefName);
        if (droppedHash && currentHash === droppedHash) {
          throw new Error(`Git reported that ${normalizedStashRefName} was dropped, but the stash reference still points to the same commit.`);
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

function normalizeStashRefName(stashRefName: string): string {
  return stashRefName === 'stash' ? 'stash@{0}' : stashRefName;
}

async function resolveGitCommit(repositoryPath: string, refName: string): Promise<string | undefined> {
  try {
    const { stdout } = await execGitWithResult(
      repositoryPath,
      ['rev-parse', '--verify', '--quiet', `${refName}^{commit}`],
      GIT_EXEC_METADATA_PROFILE
    );
    const hash = stdout.trim();
    return hash.length > 0 ? hash : undefined;
  } catch (error) {
    if (hasGitExitCode(error, 1)) {
      return undefined;
    }

    throw error;
  }
}

async function getCurrentBranchAhead(repository: Repository): Promise<number | undefined> {
  try {
    const { stdout } = await execGitWithResult(repository.rootUri.fsPath, [
      'rev-list',
      '--left-right',
      '--count',
      'HEAD...@{upstream}'
    ], GIT_EXEC_METADATA_PROFILE);
    const [ahead] = stdout.trim().split(/\s+/);
    const parsedAhead = Number(ahead);
    return Number.isFinite(parsedAhead) ? parsedAhead : undefined;
  } catch {
    return undefined;
  }
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
  ref: string,
  sourceSide?: CompareResultRestoreSourceSide
): Promise<void> {
  const plan = buildCompareResultRestorePlan(change, sourceSide);
  await executeCompareResultRestorePlan(repository.rootUri.fsPath, ref, plan);
}

export async function hasWorktreeChangeForCompareResultRestore(
  repository: Repository,
  change: Change,
  sourceSide?: CompareResultRestoreSourceSide
): Promise<boolean> {
  const plan = buildCompareResultRestorePlan(change, sourceSide);
  assertCompareResultRestorePlanInsideRepository(repository.rootUri.fsPath, plan);
  const paths = [...new Set(plan.map((action) => action.targetPath))]
    .map((targetPath) => path.relative(repository.rootUri.fsPath, targetPath).split(path.sep).join('/'));
  if (paths.length === 0) {
    return false;
  }

  const { stdout } = await execGitWithResult(repository.rootUri.fsPath, [
    'status',
    '--porcelain',
    '--untracked-files=all',
    '--',
    ...paths
  ], GIT_EXEC_METADATA_PROFILE);
  return stdout.trim().length > 0;
}
