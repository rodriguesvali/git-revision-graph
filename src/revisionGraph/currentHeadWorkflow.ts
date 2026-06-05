import { Repository } from '../git';
import {
  pullCurrentBranchFromUpstream,
  pushCurrentBranchToUpstream,
  RefActionServices,
  syncCurrentHeadWithUpstream
} from '../refActions';

export interface RevisionGraphCurrentHeadWorkflowHost {
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
    await this.runCurrentHeadAction((repository) =>
      this.syncCurrentHeadWithUpstream(repository, this.host.actionServices)
    );
  }

  async pullCurrentHead(): Promise<void> {
    await this.runCurrentHeadAction((repository) =>
      this.pullCurrentBranchFromUpstream(repository, this.host.actionServices)
    );
  }

  async pushCurrentHead(): Promise<void> {
    await this.runCurrentHeadAction((repository) =>
      this.pushCurrentBranchToUpstream(repository, this.host.actionServices)
    );
  }

  private async runCurrentHeadAction(action: (repository: Repository) => Promise<boolean>): Promise<void> {
    const repository = this.host.getCurrentRepository();
    const didScheduleRefresh = repository
      ? await action(repository)
      : false;
    if (!didScheduleRefresh) {
      this.host.postCurrentState();
    }
  }
}
