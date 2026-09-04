import * as vscode from 'vscode';

import type { Repository } from '../../git';
import type { RefActionServices } from '../../refActions';
import { runWithRefActionProgress } from '../../refActions/shared';
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
import { applyFlowGovernanceOptionsUpdate } from './flowState';
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
  private readonly configPersistence = new FlowConfigPersistenceCoordinator();
  private readonly aiTextWorkflow: RevisionGraphFlowAiTextWorkflow;

  constructor(
    private readonly host: RevisionGraphFlowGovernanceWorkflowHost,
    aiTextImprover?: FlowAiTextImprover
  ) {
    this.aiTextWorkflow = new RevisionGraphFlowAiTextWorkflow(
      host,
      aiTextImprover
    );
  }

  dispose(): void {
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

  async updateOptions(options: FlowGovernanceOptionsUpdate): Promise<void> {
    const currentState = this.host.getCurrentState();
    const flowGovernance = currentState.flowGovernance;
    if (currentState.viewMode !== 'ready' || !flowGovernance) {
      return;
    }

    const repository = this.host.getCurrentRepository();
    const settings = repository ? this.resolveSettings(repository) : undefined;
    this.host.setCurrentState({
      ...currentState,
      flowGovernance: applyFlowGovernanceOptionsUpdate(flowGovernance, options)
    });
    this.host.postCurrentState();

    if (
      !repository
      || options.enabled === undefined
    ) {
      return;
    }

    const result = await this.configPersistence.enqueue(
      repository.rootUri.fsPath,
      settings,
      options
    );
    if (!result.ok) {
      void vscode.window.showWarningMessage(
        `Could not update Flow Governance config: ${result.issue.message}`
      );
      return;
    }
    if (result.created) {
      try {
        const document = await vscode.workspace.openTextDocument(vscode.Uri.file(result.path));
        await vscode.window.showTextDocument(document, { preview: false });
      } catch (error) {
        void vscode.window.showWarningMessage(
          `Flow Governance config was created but could not be opened: ${getErrorMessage(error)}`
        );
      }
    }
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
      (guardedRepository, services) => runWithRefActionProgress(
        services,
        'Preparing equalization...',
        'blocking',
        () => prepareFlowEqualizationBranch(
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
              runWithRemoteFetchLoading: (operation) => operation()
            }
          }
        )
      )
    );
    if (outcome.status === 'rejected') {
      await showConcurrentRepositoryMutationWarning(this.host.actionServices.ui);
    }
  }

}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
