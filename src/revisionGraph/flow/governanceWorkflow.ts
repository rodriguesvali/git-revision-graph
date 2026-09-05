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
import { openFlowConfigForRecovery } from './flowConfigRecovery';
import { DEFAULT_FLOW_CONFIG_PATH } from './flowConfig';
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
import { FlowFormWorkflow } from './formWorkflow';
import { createFlowFormPreviewMessage, createFlowFormResultMessage } from '../hostMessages';
import type { RevisionGraphMessage } from '../../revisionGraphTypes';
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
  private disposed = false;
  private readonly formWorkflow: FlowFormWorkflow;
  private readonly optionsWorkflow: FlowGovernanceOptionsWorkflow;
  private readonly aiTextWorkflow: RevisionGraphFlowAiTextWorkflow;

  constructor(
    private readonly host: RevisionGraphFlowGovernanceWorkflowHost,
    aiTextImprover?: FlowAiTextImprover,
    configPersistence = new FlowConfigPersistenceCoordinator()
  ) {
    this.formWorkflow = new FlowFormWorkflow(host, (repository) => this.resolveSettings(repository));
    this.optionsWorkflow = new FlowGovernanceOptionsWorkflow(host, (repository) => this.resolveSettings(repository), configPersistence);
    this.aiTextWorkflow = new RevisionGraphFlowAiTextWorkflow(
      host,
      aiTextImprover
    );
  }

  dispose(): void {
    this.disposed = true;
    this.formWorkflow.dispose();
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

  previewForm(message: RevisionGraphProtocol.MessageOf<'preview-flow-form'>): Promise<void> {
    return this.formWorkflow.preview(message);
  }

  submitForm(message: RevisionGraphProtocol.MessageOf<'submit-flow-form'>): Promise<void> {
    return this.formWorkflow.submit(message);
  }

  rejectForm(message: RevisionGraphMessage): void {
    if (message.type === 'preview-flow-form') {
      this.host.postHostMessage(createFlowFormPreviewMessage(message, { status: 'unavailable', text: 'Preview unavailable. Reload the graph and review the selected branches.' }));
    }
    if (message.type === 'submit-flow-form') {
      this.host.postHostMessage(createFlowFormResultMessage(message, 'retry',
        'The repository or available actions changed. Reload the graph and review the selected branch before trying again.'));
    }
  }

  async openConfig(repositoryPath: string): Promise<void> {
    const repository = this.host.getCurrentRepository();
    if (!repository || repository.rootUri.fsPath !== repositoryPath || this.disposed) return;
    const isCurrent = () => !this.disposed && this.host.getCurrentRepository() === repository;
    await openFlowConfigForRecovery(repositoryPath, this.resolveSettings(repository).configPath ?? DEFAULT_FLOW_CONFIG_PATH, {
      isCurrent,
      warn: (message) => { void vscode.window.showWarningMessage(message); },
      openDocument: async (filePath) => {
        const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
        if (isCurrent()) await vscode.window.showTextDocument(document, { preview: false });
      }
    });
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
      await showFlowGovernanceUnavailableWarning(this.host.actionServices.ui, flowConfig);
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
      await showFlowGovernanceUnavailableWarning(this.host.actionServices.ui, flowConfig);
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
      await showFlowGovernanceUnavailableWarning(this.host.actionServices.ui, flowConfig);
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
