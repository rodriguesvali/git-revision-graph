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
  resetCurrentBranchWorkspace
} from '../refActions';

export interface RevisionGraphRefActionWorkflowHost {
  readonly actionServices: RefActionServices;
  getCurrentRepository(): Repository | undefined;
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
    this.deleteResolvedReference = dependencies.deleteResolvedReference ?? deleteResolvedReference;
    this.mergeResolvedReference = dependencies.mergeResolvedReference ?? mergeResolvedReference;
  }

  async abortMerge(): Promise<void> {
    await this.runWithCurrentRepository((repository) =>
      this.abortCurrentMerge(repository, this.host.actionServices)
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
    await this.runWithCurrentRepository((repository) =>
      this.checkoutResolvedReference(
        repository,
        { refName, label: refName, kind: refKind },
        this.host.actionServices
      )
    );
  }

  async createBranch(revision: string, label: string, refKind: RefActionKind): Promise<void> {
    await this.runWithCurrentRepository((repository) =>
      this.createBranchFromResolvedReference(
        repository,
        { refName: revision, label, kind: refKind },
        this.host.actionServices
      )
    );
  }

  async createTag(revision: string, label: string, refKind: RefActionKind): Promise<void> {
    await this.runWithCurrentRepository((repository) =>
      this.createTagFromResolvedReference(
        repository,
        { refName: revision, label, kind: refKind },
        this.host.actionServices
      )
    );
  }

  async publishBranch(refName: string, label: string, refKind: RefActionKind): Promise<void> {
    await this.runWithCurrentRepository((repository) =>
      this.publishLocalBranchResolvedReference(
        repository,
        { refName, label, kind: refKind },
        this.host.actionServices
      )
    );
  }

  async resetCurrentWorkspace(includeUntracked: boolean): Promise<void> {
    await this.runWithCurrentRepository((repository) =>
      this.resetCurrentBranchWorkspace(repository, includeUntracked, this.host.actionServices)
    );
  }

  async deleteReference(refName: string, refKind: RefActionKind): Promise<void> {
    await this.runWithCurrentRepository((repository) =>
      this.deleteResolvedReference(
        repository,
        { refName, label: refName, kind: refKind },
        this.host.actionServices
      )
    );
  }

  async merge(refName: string): Promise<void> {
    await this.runWithCurrentRepository((repository) =>
      this.mergeResolvedReference(
        repository,
        { refName, label: refName },
        this.host.actionServices
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
}
