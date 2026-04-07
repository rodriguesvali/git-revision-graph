import * as vscode from 'vscode';

export enum RefType {
  Head,
  RemoteHead,
  Tag
}

export enum Status {
  INDEX_MODIFIED,
  INDEX_ADDED,
  INDEX_DELETED,
  INDEX_RENAMED,
  INDEX_COPIED,
  MODIFIED,
  DELETED,
  UNTRACKED,
  IGNORED,
  INTENT_TO_ADD,
  INTENT_TO_RENAME,
  TYPE_CHANGED,
  ADDED_BY_US,
  ADDED_BY_THEM,
  DELETED_BY_US,
  DELETED_BY_THEM,
  BOTH_ADDED,
  BOTH_DELETED,
  BOTH_MODIFIED
}

export interface Ref {
  readonly type: RefType;
  readonly name?: string;
  readonly commit?: string;
  readonly remote?: string;
}

export interface UpstreamRef {
  readonly remote: string;
  readonly name: string;
  readonly commit?: string;
}

export interface Branch extends Ref {
  readonly upstream?: UpstreamRef;
  readonly ahead?: number;
  readonly behind?: number;
}

export interface Change {
  readonly uri: vscode.Uri;
  readonly originalUri: vscode.Uri;
  readonly renameUri: vscode.Uri | undefined;
  readonly status: Status;
}

export interface RepositoryState {
  readonly HEAD: Branch | undefined;
  readonly refs: Ref[];
  readonly onDidChange: vscode.Event<void>;
}

export interface RefQuery {
  readonly contains?: string;
  readonly count?: number;
  readonly pattern?: string | string[];
  readonly sort?: 'alphabetically' | 'committerdate' | 'creatordate';
}

export interface Repository {
  readonly rootUri: vscode.Uri;
  readonly state: RepositoryState;
  readonly onDidCheckout: vscode.Event<void>;

  getRefs(query?: RefQuery, cancellationToken?: vscode.CancellationToken): Promise<Ref[]>;
  show(ref: string, path: string): Promise<string>;
  diffBetween(ref1: string, ref2: string): Promise<Change[]>;
  diffWith(ref: string): Promise<Change[]>;
  checkout(treeish: string): Promise<void>;
  createBranch(name: string, checkout: boolean, ref?: string): Promise<void>;
  setBranchUpstream(name: string, upstream: string): Promise<void>;
  merge(ref: string): Promise<void>;
}

export interface API {
  readonly repositories: Repository[];
  readonly onDidOpenRepository: vscode.Event<Repository>;
  readonly onDidCloseRepository: vscode.Event<Repository>;
}

export interface GitExtension {
  getAPI(version: 1): API;
}
