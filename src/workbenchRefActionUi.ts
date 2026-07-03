import * as vscode from 'vscode';

import { CurrentBranchPushMode, RefActionUi, RemoteCheckoutInput } from './refActions';
import { validateGitBranchName } from './refActions/branchValidation';
import { validateGitTagName } from './refActions/tagValidation';

export function createWorkbenchRefActionUi(): RefActionUi {
  return {
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
    async showWarningMessage(message, options) {
      if (options) {
        await vscode.window.showWarningMessage(message, options);
        return;
      }

      await vscode.window.showWarningMessage(message);
    },
    async showErrorMessage(message, options) {
      if (options) {
        await vscode.window.showErrorMessage(message, options);
        return;
      }

      await vscode.window.showErrorMessage(message);
    },
    async showSourceControl() {
      await vscode.commands.executeCommand('workbench.view.scm');
    }
  };
}
