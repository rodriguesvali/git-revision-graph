import * as vscode from 'vscode';

import type { Repository } from '../../git';
import type { RefActionServices } from '../../refActions';
import {
  RepositoryMutationCoordinator,
  runGuardedRepositoryMutation
} from '../../repositoryMutationCoordinator';
import { showConcurrentRepositoryMutationWarning } from '../../repositoryMutationWarning';
import type {
  RevisionGraphViewHostMessage,
  RevisionGraphViewState
} from '../../revisionGraphTypes';
import { createRevisionGraphShowFlowBranchFormMessage } from '../hostMessages';
import { resolveFlowConfigForRepository } from './flowConfig';
import { FlowConfigPersistenceCoordinator } from './flowConfigPersistenceCoordinator';
import { showFlowGovernanceUnavailableWarning } from './flowAvailabilityWarning';
import { prepareFlowBranchStart } from './flowBranchStartPreflight';
import { prepareFlowEqualizationBranch } from './flowEqualization';
import { RevisionGraphFlowAiTextWorkflow } from './aiTextWorkflow';
import type {
  FlowAiTextField,
  FlowAiTextImprover,
  FlowAiTextImprovementInput,
  FlowAiTextSurface
} from './aiTextAssistant';
export type { FlowAiTextImprover } from './aiTextAssistant';
import { withFlowRemoteFetchLoading } from './remoteFetchLoading';
import { startFlowBranch } from './flowReleaseBranch';
import { FlowGovernanceOptionsWorkflow } from './optionsWorkflow';
import type {
  FlowGovernanceOptionsUpdate,
  FlowGovernanceSettings,
  FlowStartBranchKind
} from './flowTypes';

export interface RevisionGraphFlowGovernanceWorkflowHost {
  readonly actionServices: RefActionServices;
  readonly mutationCoordinator: RepositoryMutationCoordinator;
  getCurrentRepository(): Repository | undefined;
  getCurrentState(): RevisionGraphViewState;
  setCurrentState(state: RevisionGraphViewState): void;
  postCurrentState(): void;
  postHostMessage(message: RevisionGraphViewHostMessage): void;
}

export class RevisionGraphFlowGovernanceWorkflow {
  private readonly optionsWorkflow: FlowGovernanceOptionsWorkflow;
  private readonly aiTextWorkflow: RevisionGraphFlowAiTextWorkflow;

  constructor(
    private readonly host: RevisionGraphFlowGovernanceWorkflowHost,
    aiTextImprover?: FlowAiTextImprover,
    configPersistence = new FlowConfigPersistenceCoordinator()
  ) {
    this.optionsWorkflow = new FlowGovernanceOptionsWorkflow(host, (repository) => this.resolveSettings(repository), configPersistence);
    this.aiTextWorkflow = new RevisionGraphFlowAiTextWorkflow(
      host,
      aiTextImprover
    );
  }

  dispose(): void {
    this.optionsWorkflow.dispose();
    this.aiTextWorkflow.dispose();
  }

  resetAiText(): void {
    this.aiTextWorkflow.reset();
  }

  improveText(requestId: number, input: FlowAiTextImprovementInput): Promise<void> {
    return this.aiTextWorkflow.improve(requestId, input);
  }

  cancelTextImprovement(
    requestId: number,
    surface: FlowAiTextSurface,
    field: FlowAiTextField
  ): void {
    this.aiTextWorkflow.cancel(surface, field, requestId);
  }

  resolveSettings(repository: Repository): FlowGovernanceSettings {
    const config = vscode.workspace.getConfiguration('gitRevisionGraph.flowGovernance', repository.rootUri);
    return {
      configPath: config.get<string>('configPath')
    };
  }

  updateOptions(options: FlowGovernanceOptionsUpdate): Promise<void> {
    return this.optionsWorkflow.updateOptions(options);
  }

  async startBranch(
    branchKind: FlowStartBranchKind,
    sourceRefName: string,
    name: string,
    description: string
  ): Promise<void> {
    const repository = this.host.getCurrentRepository();
    if (!repository) {
      return;
    }

    const flowConfig = await resolveFlowConfigForRepository(
      repository.rootUri.fsPath,
      this.resolveSettings(repository)
    );
    if (!flowConfig.ok || !flowConfig.config.enabled) {
      await showFlowGovernanceUnavailableWarning(this.host.actionServices.ui);
      return;
    }

    const outcome = await runGuardedRepositoryMutation(
      this.host.mutationCoordinator,
      repository,
      this.host.actionServices,
      (guardedRepository, services) => startFlowBranch(
        guardedRepository,
        {
          kind: branchKind,
          sourceBranch: sourceRefName,
          name,
          config: flowConfig.config,
          description
        },
        services
      )
    );
    if (outcome.status === 'rejected') {
      await showConcurrentRepositoryMutationWarning(this.host.actionServices.ui);
    }
  }

  async prepareStartBranch(
    branchKind: FlowStartBranchKind,
    sourceRefName: string
  ): Promise<void> {
    const repository = this.host.getCurrentRepository();
    if (!repository) {
      return;
    }

    const flowConfig = await resolveFlowConfigForRepository(
      repository.rootUri.fsPath,
      this.resolveSettings(repository)
    );
    if (!flowConfig.ok || !flowConfig.config.enabled) {
      await showFlowGovernanceUnavailableWarning(this.host.actionServices.ui);
      return;
    }

    const outcome = await runGuardedRepositoryMutation(
      this.host.mutationCoordinator,
      repository,
      this.host.actionServices,
      (guardedRepository, services) => prepareFlowBranchStart(
        guardedRepository,
        { kind: branchKind, sourceBranch: sourceRefName },
        services,
        {
          runWithRemoteFetchLoading: (operation) => withFlowRemoteFetchLoading(services, operation)
        }
      )
    );
    if (outcome.status === 'rejected') {
      await showConcurrentRepositoryMutationWarning(this.host.actionServices.ui);
      return;
    }

    if (outcome.value) {
      this.host.postHostMessage(createRevisionGraphShowFlowBranchFormMessage(branchKind, sourceRefName));
    } else {
      this.host.postCurrentState();
    }
  }

  async prepareEqualization(
    targetRefName: string,
    originRefName: string,
    description: string
  ): Promise<void> {
    const repository = this.host.getCurrentRepository();
    if (!repository) {
      return;
    }

    const flowConfig = await resolveFlowConfigForRepository(
      repository.rootUri.fsPath,
      this.resolveSettings(repository)
    );
    if (!flowConfig.ok || !flowConfig.config.enabled) {
      await showFlowGovernanceUnavailableWarning(this.host.actionServices.ui);
      return;
    }

    const outcome = await runGuardedRepositoryMutation(
      this.host.mutationCoordinator,
      repository,
      this.host.actionServices,
      (guardedRepository, services) => prepareFlowEqualizationBranch(
        guardedRepository,
        {
          targetBranch: targetRefName,
          originBranch: originRefName,
          description,
          config: flowConfig.config
        },
        services,
        {
          sourcePreflight: {
            runWithRemoteFetchLoading: (operation) => withFlowRemoteFetchLoading(services, operation)
          }
        }
      )
    );
    if (outcome.status === 'rejected') {
      await showConcurrentRepositoryMutationWarning(this.host.actionServices.ui);
    }
  }

}
