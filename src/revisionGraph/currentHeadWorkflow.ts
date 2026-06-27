import { Repository } from '../git';
import {
  pullCurrentBranchFromUpstream,
  pushCurrentBranchToUpstream,
  RefActionServices,
  syncCurrentHeadWithUpstream
} from '../refActions';
import type { RepositoryMutationRunner } from '../repositoryMutationCoordinator';

export interface RevisionGraphCurrentHeadWorkflowHost extends Partial<RepositoryMutationRunner> {
  readonly actionServices: RefActionServices;
  getCurrentRepository(): Repository | undefined;
  postCurrentState(): void;
}

export interface RevisionGraphCurrentHeadWorkflowDependencies {
  syncCurrentHeadWithUpstream?(repository: Repository, services: RefActionServices): Promise<boolean>;
  pullCurrentBranchFromUpstream?(repository: Repository, services: RefActionServices): Promise<boolean>;
  pushCurrentBranchToUpstream?(repository: Repository, services: RefActionServices): Promise<boolean>;
}

export class RevisionGraphCurrentHeadWorkflow {
  private readonly syncCurrentHeadWithUpstream: NonNullable<
    RevisionGraphCurrentHeadWorkflowDependencies['syncCurrentHeadWithUpstream']
  >;
  private readonly pullCurrentBranchFromUpstream: NonNullable<
    RevisionGraphCurrentHeadWorkflowDependencies['pullCurrentBranchFromUpstream']
  >;
  private readonly pushCurrentBranchToUpstream: NonNullable<
    RevisionGraphCurrentHeadWorkflowDependencies['pushCurrentBranchToUpstream']
  >;

  constructor(
    private readonly host: RevisionGraphCurrentHeadWorkflowHost,
    dependencies: RevisionGraphCurrentHeadWorkflowDependencies = {}
  ) {
    this.syncCurrentHeadWithUpstream =
      dependencies.syncCurrentHeadWithUpstream ?? syncCurrentHeadWithUpstream;
    this.pullCurrentBranchFromUpstream =
      dependencies.pullCurrentBranchFromUpstream ?? pullCurrentBranchFromUpstream;
    this.pushCurrentBranchToUpstream =
      dependencies.pushCurrentBranchToUpstream ?? pushCurrentBranchToUpstream;
  }

  async syncCurrentHead(): Promise<void> {
    await this.runCurrentHeadAction((repository, services) =>
      this.syncCurrentHeadWithUpstream(repository, services)
    );
  }

  async pullCurrentHead(): Promise<void> {
    await this.runCurrentHeadAction((repository, services) =>
      this.pullCurrentBranchFromUpstream(repository, services)
    );
  }

  async pushCurrentHead(): Promise<void> {
    await this.runCurrentHeadAction((repository, services) =>
      this.pushCurrentBranchToUpstream(repository, services)
    );
  }

  private async runCurrentHeadAction(
    action: (repository: Repository, services: RefActionServices) => Promise<boolean>
  ): Promise<void> {
    const repository = this.host.getCurrentRepository();
    const didScheduleRefresh = repository && this.host.runRepositoryMutation
      ? await this.host.runRepositoryMutation(repository, action)
      : repository
        ? await action(repository, this.host.actionServices)
        : false;
    if (!didScheduleRefresh) {
      this.host.postCurrentState();
    }
  }
}
