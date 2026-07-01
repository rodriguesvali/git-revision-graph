import * as vscode from 'vscode';

import { PreparedRefreshHandle, RefActionServices } from './refActions';
import { RevisionGraphRefreshRequestLike } from './revisionGraphRefresh';
import {
  createWorkbenchAncestryInspector,
  createWorkbenchReferenceManager
} from './workbenchReferenceManager';
import {
  createWorkbenchDiffPresenter,
  openChangeDiffBetweenRefs,
  openChangeDiffWithWorktree
} from './workbenchDiffPresenter';
import {
  hasWorktreeChangeForCompareResultRestore,
  restoreWorktreeChangeFromRef
} from './workbenchCompareResultRestore';
import { createWorkbenchRefActionUi } from './workbenchRefActionUi';

export {
  hasWorktreeChangeForCompareResultRestore,
  openChangeDiffBetweenRefs,
  openChangeDiffWithWorktree,
  restoreWorktreeChangeFromRef
};

export function createWorkbenchRefActionServices(
  refresh?: (request?: RevisionGraphRefreshRequestLike) => void,
  prepare?: (request?: RevisionGraphRefreshRequestLike) => PreparedRefreshHandle | undefined,
  compareResultsPresenter?: RefActionServices['compareResultsPresenter']
): RefActionServices {
  return {
    ui: createWorkbenchRefActionUi(),
    diffPresenter: createWorkbenchDiffPresenter(),
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
    referenceManager: createWorkbenchReferenceManager(),
    ancestryInspector: createWorkbenchAncestryInspector(),
    formatPath(fsPath) {
      return vscode.workspace.asRelativePath(vscode.Uri.file(fsPath), false);
    }
  };
}
