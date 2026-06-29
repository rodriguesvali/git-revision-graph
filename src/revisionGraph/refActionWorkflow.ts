import { Repository } from '../git';
import {
  abortCurrentMerge,
  createBranchFromResolvedReference,
  createTagFromResolvedReference,
  checkoutResolvedReference,
  compareResolvedRefs,
  compareResolvedRefWithWorktree,
  deleteResolvedReference,
  mergeResolvedReference,
  publishLocalBranchResolvedReference,
  RefActionKind,
  RefActionServices,
  resetCurrentBranchWorkspace,
  saveCurrentWorkspaceToStash,
  applyStashResolvedReference,
  popStashResolvedReference,
  dropStashResolvedReference
} from '../refActions';
import type { RepositoryMutationRunner } from '../repositoryMutationCoordinator';
import { withCurrentStateBeforeBlockingMessage } from './blockingMessageState';

export interface RevisionGraphRefActionWorkflowHost extends Partial<RepositoryMutationRunner> {
  readonly actionServices: RefActionServices;
  getCurrentRepository(): Repository | undefined;
  postCurrentState(): void;
}

interface RefActionTarget {
  readonly refName: string;
  readonly label: string;
  readonly kind?: RefActionKind;
}

export interface RevisionGraphRefActionWorkflowDependencies {
  abortCurrentMerge?(repository: Repository, services: RefActionServices): Promise<unknown>;
  compareResolvedRefs?(
    repository: Repository,
    baseTarget: RefActionTarget,
    compareTarget: RefActionTarget,
    services: RefActionServices
  ): Promise<unknown>;
  compareResolvedRefWithWorktree?(
    repository: Repository,
    target: RefActionTarget,
    services: RefActionServices
  ): Promise<unknown>;
  checkoutResolvedReference?(
    repository: Repository,
    target: RefActionTarget,
    services: RefActionServices
  ): Promise<unknown>;
  createBranchFromResolvedReference?(
    repository: Repository,
    target: RefActionTarget,
    services: RefActionServices
  ): Promise<unknown>;
  createTagFromResolvedReference?(
    repository: Repository,
    target: RefActionTarget,
    services: RefActionServices
  ): Promise<unknown>;
  publishLocalBranchResolvedReference?(
    repository: Repository,
    target: RefActionTarget,
    services: RefActionServices
  ): Promise<unknown>;
  resetCurrentBranchWorkspace?(
    repository: Repository,
    includeUntracked: boolean,
    services: RefActionServices
  ): Promise<unknown>;
  saveCurrentWorkspaceToStash?(
    repository: Repository,
    services: RefActionServices
  ): Promise<boolean>;
  applyStashResolvedReference?(
    repository: Repository,
    target: RefActionTarget,
    services: RefActionServices
  ): Promise<boolean>;
  popStashResolvedReference?(
    repository: Repository,
    target: RefActionTarget,
    services: RefActionServices
  ): Promise<boolean>;
  dropStashResolvedReference?(
    repository: Repository,
    target: RefActionTarget,
    services: RefActionServices
  ): Promise<boolean>;
  deleteResolvedReference?(
    repository: Repository,
    target: RefActionTarget,
    services: RefActionServices
  ): Promise<unknown>;
  mergeResolvedReference?(
    repository: Repository,
    target: RefActionTarget,
    services: RefActionServices
  ): Promise<unknown>;
}

export class RevisionGraphRefActionWorkflow {
  private readonly abortCurrentMerge: NonNullable<
    RevisionGraphRefActionWorkflowDependencies['abortCurrentMerge']
  >;
  private readonly compareResolvedRefs: NonNullable<
    RevisionGraphRefActionWorkflowDependencies['compareResolvedRefs']
  >;
  private readonly compareResolvedRefWithWorktree: NonNullable<
    RevisionGraphRefActionWorkflowDependencies['compareResolvedRefWithWorktree']
  >;
  private readonly checkoutResolvedReference: NonNullable<
    RevisionGraphRefActionWorkflowDependencies['checkoutResolvedReference']
  >;
  private readonly createBranchFromResolvedReference: NonNullable<
    RevisionGraphRefActionWorkflowDependencies['createBranchFromResolvedReference']
  >;
  private readonly createTagFromResolvedReference: NonNullable<
    RevisionGraphRefActionWorkflowDependencies['createTagFromResolvedReference']
  >;
  private readonly publishLocalBranchResolvedReference: NonNullable<
    RevisionGraphRefActionWorkflowDependencies['publishLocalBranchResolvedReference']
  >;
  private readonly resetCurrentBranchWorkspace: NonNullable<
    RevisionGraphRefActionWorkflowDependencies['resetCurrentBranchWorkspace']
  >;
  private readonly saveCurrentWorkspaceToStash: NonNullable<
    RevisionGraphRefActionWorkflowDependencies['saveCurrentWorkspaceToStash']
  >;
  private readonly applyStashResolvedReference: NonNullable<
    RevisionGraphRefActionWorkflowDependencies['applyStashResolvedReference']
  >;
  private readonly popStashResolvedReference: NonNullable<
    RevisionGraphRefActionWorkflowDependencies['popStashResolvedReference']
  >;
  private readonly dropStashResolvedReference: NonNullable<
    RevisionGraphRefActionWorkflowDependencies['dropStashResolvedReference']
  >;
  private readonly deleteResolvedReference: NonNullable<
    RevisionGraphRefActionWorkflowDependencies['deleteResolvedReference']
  >;
  private readonly mergeResolvedReference: NonNullable<
    RevisionGraphRefActionWorkflowDependencies['mergeResolvedReference']
  >;

  constructor(
    private readonly host: RevisionGraphRefActionWorkflowHost,
    dependencies: RevisionGraphRefActionWorkflowDependencies = {}
  ) {
    this.abortCurrentMerge = dependencies.abortCurrentMerge ?? abortCurrentMerge;
    this.compareResolvedRefs = dependencies.compareResolvedRefs ?? compareResolvedRefs;
    this.compareResolvedRefWithWorktree =
      dependencies.compareResolvedRefWithWorktree ?? compareResolvedRefWithWorktree;
    this.checkoutResolvedReference = dependencies.checkoutResolvedReference ?? checkoutResolvedReference;
    this.createBranchFromResolvedReference =
      dependencies.createBranchFromResolvedReference ?? createBranchFromResolvedReference;
    this.createTagFromResolvedReference =
      dependencies.createTagFromResolvedReference ?? createTagFromResolvedReference;
    this.publishLocalBranchResolvedReference =
      dependencies.publishLocalBranchResolvedReference ?? publishLocalBranchResolvedReference;
    this.resetCurrentBranchWorkspace =
      dependencies.resetCurrentBranchWorkspace ?? resetCurrentBranchWorkspace;
    this.saveCurrentWorkspaceToStash =
      dependencies.saveCurrentWorkspaceToStash ?? saveCurrentWorkspaceToStash;
    this.applyStashResolvedReference =
      dependencies.applyStashResolvedReference ?? applyStashResolvedReference;
    this.popStashResolvedReference =
      dependencies.popStashResolvedReference ?? popStashResolvedReference;
    this.dropStashResolvedReference =
      dependencies.dropStashResolvedReference ?? dropStashResolvedReference;
    this.deleteResolvedReference = dependencies.deleteResolvedReference ?? deleteResolvedReference;
    this.mergeResolvedReference = dependencies.mergeResolvedReference ?? mergeResolvedReference;
  }

  async abortMerge(): Promise<void> {
    await this.runMutationWithCurrentRepository((repository, services) =>
      this.abortCurrentMerge(repository, services)
    );
  }

  async compareSelected(
    baseRevision: string,
    baseLabel: string,
    compareRevision: string,
    compareLabel: string
  ): Promise<void> {
    await this.runWithCurrentRepository((repository) =>
      this.compareResolvedRefs(
        repository,
        { refName: baseRevision, label: baseLabel },
        { refName: compareRevision, label: compareLabel },
        this.host.actionServices
      )
    );
  }

  async compareWithWorktree(revision: string, label: string): Promise<void> {
    await this.runWithCurrentRepository((repository) =>
      this.compareResolvedRefWithWorktree(
        repository,
        { refName: revision, label },
        this.host.actionServices
      )
    );
  }

  async checkout(refName: string, refKind: RefActionKind): Promise<void> {
    await this.runMutationWithCurrentRepository((repository, services) =>
      this.checkoutResolvedReference(
        repository,
        { refName, label: refName, kind: refKind },
        services
      )
    );
  }

  async createBranch(revision: string, label: string, refKind: RefActionKind): Promise<void> {
    await this.runMutationWithCurrentRepository((repository, services) =>
      this.createBranchFromResolvedReference(
        repository,
        { refName: revision, label, kind: refKind },
        services
      )
    );
  }

  async createTag(revision: string, label: string, refKind: RefActionKind): Promise<void> {
    await this.runMutationWithCurrentRepository((repository, services) =>
      this.createTagFromResolvedReference(
        repository,
        { refName: revision, label, kind: refKind },
        services
      )
    );
  }

  async publishBranch(refName: string, label: string, refKind: RefActionKind): Promise<void> {
    await this.runMutationWithCurrentRepository((repository, services) =>
      this.publishLocalBranchResolvedReference(
        repository,
        { refName, label, kind: refKind },
        services
      )
    );
  }

  async resetCurrentWorkspace(includeUntracked: boolean): Promise<void> {
    await this.runMutationWithCurrentRepository((repository, services) =>
      this.resetCurrentBranchWorkspace(repository, includeUntracked, services)
    );
  }

  async stashSave(): Promise<boolean> {
    return (await this.runMutationWithCurrentRepository((repository, services) =>
      this.saveCurrentWorkspaceToStash(repository, services)
    )) ?? false;
  }

  async stashApply(refName: string): Promise<boolean> {
    return (await this.runMutationWithCurrentRepository((repository, services) =>
      this.applyStashResolvedReference(
        repository,
        { refName, label: refName, kind: 'stash' },
        services
      )
    )) ?? false;
  }

  async stashPop(refName: string): Promise<boolean> {
    return (await this.runMutationWithCurrentRepository((repository, services) =>
      this.popStashResolvedReference(
        repository,
        { refName, label: refName, kind: 'stash' },
        services
      )
    )) ?? false;
  }

  async stashDrop(refName: string): Promise<boolean> {
    return (await this.runMutationWithCurrentRepository((repository, services) =>
      this.dropStashResolvedReference(
        repository,
        { refName, label: refName, kind: 'stash' },
        services
      )
    )) ?? false;
  }

  async deleteReference(refName: string, refKind: RefActionKind): Promise<void> {
    await this.runMutationWithCurrentRepository((repository, services) =>
      this.deleteResolvedReference(
        repository,
        { refName, label: refName, kind: refKind },
        services
      )
    );
  }

  async merge(refName: string): Promise<void> {
    await this.runMutationWithCurrentRepository((repository, services) =>
      this.mergeResolvedReference(
        repository,
        { refName, label: refName },
        services
      )
    );
  }

  private async runWithCurrentRepository(
    action: (repository: Repository) => Promise<unknown> | unknown
  ): Promise<void> {
    const repository = this.host.getCurrentRepository();
    if (!repository) {
      return;
    }

    await action(repository);
  }

  private async runMutationWithCurrentRepository<T>(
    action: (repository: Repository, services: RefActionServices) => Promise<T> | T
  ): Promise<T | undefined> {
    const repository = this.host.getCurrentRepository();
    if (!repository) {
      return undefined;
    }

    if (this.host.runRepositoryMutation) {
      return this.host.runRepositoryMutation(repository, (currentRepository, services) =>
        action(
          currentRepository,
          withCurrentStateBeforeBlockingMessage(services, () => this.host.postCurrentState())
        ));
    }

    return action(
      repository,
      withCurrentStateBeforeBlockingMessage(this.host.actionServices, () => this.host.postCurrentState())
    );
  }
}
