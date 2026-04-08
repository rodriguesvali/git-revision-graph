import * as vscode from 'vscode';

import { getDiffChangeKinds, getDiffChangeUris, RefCommandServices } from './refCommands';
import { API, Change, GitExtension, Repository } from './git';
import { EMPTY_SCHEME, EmptyContentProvider, REF_SCHEME, RefContentProvider } from './refContentProvider';
import { compareRefs, compareWithWorktree, checkoutReference, mergeReference } from './refCommands';
import { RefNode } from './refNodes';
import { REVISION_GRAPH_VIEW_ID, RevisionGraphViewProvider } from './revisionGraphPanel';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const git = await getGitApi();
  if (!git) {
    void vscode.window.showWarningMessage(
      'GIT Revision Graph requires the built-in vscode.git extension to be active.'
    );
    return;
  }

  const revisionGraphProvider = new RevisionGraphViewProvider(git);
  const services = createCommandServices(revisionGraphProvider);

  context.subscriptions.push(
    revisionGraphProvider,
    vscode.window.registerWebviewViewProvider(REVISION_GRAPH_VIEW_ID, revisionGraphProvider),
    vscode.workspace.registerTextDocumentContentProvider(EMPTY_SCHEME, new EmptyContentProvider()),
    vscode.workspace.registerTextDocumentContentProvider(REF_SCHEME, new RefContentProvider(git)),
    vscode.commands.registerCommand('gitRefs.refresh', async () => {
      await revisionGraphProvider.refresh();
    }),
    vscode.commands.registerCommand('gitRefs.compareRefs', async (node?: RefNode) => {
      await compareRefs(git, node, services);
    }),
    vscode.commands.registerCommand('gitRefs.compareWithWorktree', async (node?: RefNode) => {
      await compareWithWorktree(git, node, services);
    }),
    vscode.commands.registerCommand('gitRefs.checkout', async (node?: RefNode) => {
      await checkoutReference(git, node, services);
    }),
    vscode.commands.registerCommand('gitRefs.merge', async (node?: RefNode) => {
      await mergeReference(git, node, services);
    }),
    vscode.commands.registerCommand('gitRefs.openRevisionGraph', async () => {
      await revisionGraphProvider.open();
    }),
    vscode.commands.registerCommand('gitRefs.chooseRevisionGraphRepository', async () => {
      await revisionGraphProvider.chooseRepository();
    })
  );
}

export function deactivate(): void {}

async function getGitApi(): Promise<API | undefined> {
  const extension = vscode.extensions.getExtension<GitExtension>('vscode.git');
  if (!extension) {
    return undefined;
  }

  const gitExtension = extension.isActive ? extension.exports : await extension.activate();
  return gitExtension.getAPI(1);
}

function createCommandServices(revisionGraphProvider: RevisionGraphViewProvider): RefCommandServices {
  return {
    ui: {
      async pickRepository(items, placeHolder) {
        const picked = await vscode.window.showQuickPick(items, { placeHolder });
        return picked?.repository;
      },
      async pickReference(items, placeHolder) {
        return vscode.window.showQuickPick(items, { placeHolder });
      },
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
        void revisionGraphProvider.refresh();
      },
      updateViewMessage() {
        void revisionGraphProvider.refresh();
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
  const { leftPath, rightPath } = getDiffChangeUris(change);
  const { leftIsEmpty, rightIsEmpty } = getDiffChangeKinds(change);
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
  const { leftPath, rightPath } = getDiffChangeUris(change);
  const { leftIsEmpty, rightIsEmpty } = getDiffChangeKinds(change);
  const leftUri = leftIsEmpty ? buildEmptyUri(rightPath) : buildRefUri(repository, ref, leftPath);
  const rightUri = rightIsEmpty ? buildEmptyUri(leftPath) : vscode.Uri.file(rightPath);
  const title = `${ref} <-> worktree • ${vscode.workspace.asRelativePath(vscode.Uri.file(rightPath), false)}`;

  await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title);
}
