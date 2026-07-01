import * as vscode from 'vscode';

import type { API, Repository } from '../../git';
import {
  isSameRepositoryPath,
  reconcileCurrentRepository,
  shouldRefreshGraphForRepositorySetChange
} from '../../repositorySelection';
import type { RevisionGraphViewState } from '../../revisionGraphTypes';
import {
  cancelPendingFollowUpRefresh,
  consumePendingFollowUpRefresh,
  createRepositoryRefreshRequest,
  normalizeRefreshRequest,
  registerPendingFollowUpRefresh,
  type PendingRevisionGraphFollowUpRefresh,
  type RevisionGraphRefreshIntent,
  type RevisionGraphRefreshRequest,
  type RevisionGraphRefreshRequestLike,
  type RevisionGraphRepositoryEventKind
} from '../../revisionGraphRefresh';
import {
  applyRepositoryStatusToRevisionGraphViewState,
  buildRevisionGraphRepositoryStateSignature
} from './stateChange';

export interface RevisionGraphRepositoryLifecycleHost {
  onCurrentRepositoryChanging(repository: Repository): void;
  onCurrentRepositoryChanged(repositoryChanged: boolean): void;
  onRepositoryClosed(repository: Repository): void;
  onRepositorySetChanged(): void;
  onRepositoryStateChange(
    repository: Repository,
    intent: RevisionGraphRefreshIntent,
    eventKind: RevisionGraphRepositoryEventKind
  ): void;
}

export interface RepositoryStatusUpdateResult {
  readonly handled: boolean;
  readonly state?: RevisionGraphViewState;
}

export class RevisionGraphRepositoryLifecycle implements vscode.Disposable {
  private currentRepository: Repository | undefined;
  private readonly pendingFollowUpRefreshes = new Map<string, PendingRevisionGraphFollowUpRefresh[]>();
  private readonly repoSubscriptions = new Map<string, vscode.Disposable>();
  private readonly repositoryStateSignatures = new Map<string, string>();
  private readonly disposables: vscode.Disposable[] = [];

  constructor(
    private readonly git: API,
    private readonly host: RevisionGraphRepositoryLifecycleHost
  ) {
    this.currentRepository = reconcileCurrentRepository(git.repositories, undefined);
    this.attachToRepositories(git.repositories);

    this.disposables.push(
      git.onDidOpenRepository((repository) => {
        this.attachRepository(repository);
        this.host.onRepositorySetChanged();
      }),
      git.onDidCloseRepository((repository) => {
        this.host.onRepositoryClosed(repository);
        this.detachRepository(repository);
        this.host.onRepositorySetChanged();
      })
    );
  }

  getCurrentRepository(): Repository | undefined {
    return this.currentRepository;
  }

  dispose(): void {
    for (const disposable of this.repoSubscriptions.values()) {
      disposable.dispose();
    }
    this.repoSubscriptions.clear();
    this.repositoryStateSignatures.clear();
    this.pendingFollowUpRefreshes.clear();

    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  reconcileCurrentRepository(): Repository | undefined {
    const repository = reconcileCurrentRepository(this.git.repositories, this.currentRepository);
    this.setCurrentRepository(repository);
    return repository;
  }

  setCurrentRepository(repository: Repository | undefined): void {
    if (!isSameRepositoryPath(this.currentRepository, repository)) {
      if (this.currentRepository) {
        this.host.onCurrentRepositoryChanging(this.currentRepository);
      }
      this.currentRepository = repository;
      this.host.onCurrentRepositoryChanged(true);
      return;
    }

    this.currentRepository = repository;
    this.host.onCurrentRepositoryChanged(false);
  }

  shouldRefreshForRepositorySetChange(previousHasRepositories: boolean): boolean {
    const previousRepository = this.currentRepository;
    const nextRepository = reconcileCurrentRepository(this.git.repositories, this.currentRepository);
    this.setCurrentRepository(nextRepository);

    return shouldRefreshGraphForRepositorySetChange(
      previousRepository,
      nextRepository,
      previousHasRepositories,
      this.git.repositories.length > 0
    );
  }

  isRepositoryCurrentOrFirstResolution(repository: Repository, previousRepository: Repository | undefined): boolean {
    return isSameRepositoryPath(repository, this.currentRepository)
      || (!previousRepository && !!this.currentRepository);
  }

  createCurrentRepositoryRefreshRequest(intent: RevisionGraphRefreshIntent): RevisionGraphRefreshRequest {
    return createRepositoryRefreshRequest(intent, this.currentRepository?.rootUri.toString());
  }

  resolveRefreshRequest(requestLike: RevisionGraphRefreshRequestLike): RevisionGraphRefreshRequest {
    const request = normalizeRefreshRequest(requestLike);
    if (request.repositoryPath || !this.currentRepository) {
      return request;
    }

    const enrichedRequest = createRepositoryRefreshRequest(
      request.intent,
      this.currentRepository.rootUri.toString()
    );

    return {
      ...enrichedRequest,
      ...request,
      repositoryPath: enrichedRequest.repositoryPath,
      followUpEvents: request.followUpEvents ?? enrichedRequest.followUpEvents
    };
  }

  prepareRefresh(requestLike: RevisionGraphRefreshRequestLike): { cancel(): void } | undefined {
    const preparedRefresh = registerPendingFollowUpRefresh(
      this.pendingFollowUpRefreshes,
      this.resolveRefreshRequest(requestLike)
    );
    if (!preparedRefresh) {
      return undefined;
    }

    return {
      cancel: () => {
        cancelPendingFollowUpRefresh(this.pendingFollowUpRefreshes, preparedRefresh);
      }
    };
  }

  consumePendingFollowUpRefresh(repository: Repository, eventKind: RevisionGraphRepositoryEventKind): boolean {
    return consumePendingFollowUpRefresh(
      this.pendingFollowUpRefreshes,
      repository.rootUri.toString(),
      eventKind
    );
  }

  recordRepositoryStateSignature(repository: Repository): void {
    this.repositoryStateSignatures.set(
      repository.rootUri.toString(),
      buildRevisionGraphRepositoryStateSignature(repository)
    );
  }

  tryApplyRepositoryStatusUpdate(
    repository: Repository,
    state: RevisionGraphViewState
  ): RepositoryStatusUpdateResult {
    const repositoryKey = repository.rootUri.toString();
    const nextSignature = buildRevisionGraphRepositoryStateSignature(repository);
    const previousSignature = this.repositoryStateSignatures.get(repositoryKey);

    if (previousSignature === undefined) {
      this.repositoryStateSignatures.set(repositoryKey, nextSignature);
      return { handled: false };
    }

    if (previousSignature !== nextSignature || state.viewMode !== 'ready') {
      return { handled: false };
    }

    this.repositoryStateSignatures.set(repositoryKey, nextSignature);
    if (state.loading) {
      return { handled: true };
    }

    const nextState = applyRepositoryStatusToRevisionGraphViewState(state, repository);
    return nextState === state
      ? { handled: true }
      : { handled: true, state: nextState };
  }

  private attachToRepositories(repositories: readonly Repository[]): void {
    for (const repository of repositories) {
      this.attachRepository(repository);
    }
  }

  private attachRepository(repository: Repository): void {
    const key = repository.rootUri.toString();
    if (this.repoSubscriptions.has(key)) {
      return;
    }

    this.repoSubscriptions.set(
      key,
      vscode.Disposable.from(
        repository.state.onDidChange(() => {
          this.host.onRepositoryStateChange(repository, 'full-rebuild', 'state');
        }),
        repository.onDidCheckout(() => {
          this.host.onRepositoryStateChange(repository, 'full-rebuild', 'checkout');
        })
      )
    );
  }

  private detachRepository(repository: Repository): void {
    const key = repository.rootUri.toString();
    this.repoSubscriptions.get(key)?.dispose();
    this.repoSubscriptions.delete(key);
    this.repositoryStateSignatures.delete(key);
  }
}
