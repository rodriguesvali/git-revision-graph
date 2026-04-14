import { ChangeQuickPickItem } from '../changePresentation';
import { Repository } from '../git';
import { RevisionGraphRefreshRequestLike } from '../revisionGraphRefresh';

export type RefActionKind = 'head' | 'branch' | 'remote' | 'tag';

export interface RefSelection {
  readonly refName: string;
  readonly label: string;
}

export interface RefActionTarget extends RefSelection {
  readonly kind: RefActionKind;
}

export interface RefActionUi {
  pickChange(items: readonly ChangeQuickPickItem[], placeHolder: string): Promise<ChangeQuickPickItem | undefined>;
  promptBranchName(options: { readonly prompt: string; readonly value: string }): Promise<string | undefined>;
  confirm(options: { readonly message: string; readonly confirmLabel: string }): Promise<boolean>;
  showInformationMessage(message: string): void;
  showWarningMessage(message: string): void;
  showErrorMessage(message: string): Promise<void>;
  showSourceControl(): Promise<void>;
}

export interface DiffPresenter {
  openBetweenRefs(repository: Repository, change: ChangeQuickPickItem['change'], leftRef: string, rightRef: string): Promise<void>;
  openWithWorktree(repository: Repository, change: ChangeQuickPickItem['change'], ref: string): Promise<void>;
}

export interface PreparedRefreshHandle {
  cancel(): void;
}

export interface RefreshController {
  prepare(request?: RevisionGraphRefreshRequestLike): PreparedRefreshHandle | undefined;
  refresh(request?: RevisionGraphRefreshRequestLike): void;
}

export interface ReferenceManager {
  deleteRemoteBranch(repository: Repository, remoteName: string, branchName: string): Promise<void>;
  unsetBranchUpstream(repository: Repository, branchName: string): Promise<void>;
}

export interface AncestryInspector {
  isRefAncestorOfHead(repository: Repository, refName: string, headRefName: string): Promise<boolean>;
}

export interface RefActionServices {
  readonly ui: RefActionUi;
  readonly diffPresenter: DiffPresenter;
  readonly refreshController: RefreshController;
  readonly referenceManager: ReferenceManager;
  readonly ancestryInspector: AncestryInspector;
  readonly formatPath: (fsPath: string) => string;
}

export interface HeadSyncState {
  readonly branchName: string;
  readonly upstreamLabel: string;
  readonly ahead: number;
  readonly behind: number;
}

export interface BranchCreationTarget {
  readonly startPointRefName: string;
  readonly upstreamRefName: string | undefined;
  readonly suggestedLocalName: string;
  readonly prompt: string;
}
