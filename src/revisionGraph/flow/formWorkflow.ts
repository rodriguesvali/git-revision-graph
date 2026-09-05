import type { Repository } from '../../git';
import { runGuardedRepositoryMutation } from '../../repositoryMutationCoordinator';
import { describeFlowFormPreview } from './flowFormPreview';
import { createFlowFormPreviewMessage, createFlowFormResultMessage } from '../hostMessages';
import { isRevisionGraphMessageAllowedForState } from '../messageAuthorization';
import type { RevisionGraphFlowGovernanceWorkflowHost } from './governanceWorkflow';
import { resolveFlowConfigForRepository } from './flowConfig';
import type { FlowGovernanceSettings } from './flowTypes';
import { startFlowBranch } from './flowReleaseBranch';
import { prepareFlowEqualizationBranch } from './flowEqualization';
import { withFlowRemoteFetchLoading } from './remoteFetchLoading';

export class FlowFormWorkflow {
  private disposed = false;

  constructor(
    private readonly host: RevisionGraphFlowGovernanceWorkflowHost,
    private readonly settings: (repository: Repository) => FlowGovernanceSettings,
    private readonly actions = { startBranch: startFlowBranch, equalize: prepareFlowEqualizationBranch }
  ) {}

  dispose(): void { this.disposed = true; }

  async preview(request: RevisionGraphProtocol.MessageOf<'preview-flow-form'>): Promise<void> {
    const repository = this.host.getCurrentRepository();
    if (!repository || this.disposed || repository.rootUri.fsPath !== request.repositoryPath) return;
    let preview: Pick<RevisionGraphProtocol.FlowFormPreview, 'status' | 'text'> = {
      status: 'unavailable', text: 'Preview unavailable. Review Flow Governance configuration in View.'
    };
    try {
      const resolution = await resolveFlowConfigForRepository(request.repositoryPath, this.settings(repository));
      if (resolution.ok && resolution.config.enabled && isRevisionGraphMessageAllowedForState(request, this.host.getCurrentState())) {
        preview = describeFlowFormPreview(request.action, resolution.config);
      }
    } catch { /* A preview failure must not interrupt editing or trigger a Git operation. */ }
    if (this.isCurrent(repository)) this.host.postHostMessage(createFlowFormPreviewMessage(request, preview));
  }

  async submit(request: RevisionGraphProtocol.MessageOf<'submit-flow-form'>): Promise<void> {
    const repository = this.host.getCurrentRepository();
    if (!repository || this.disposed || repository.rootUri.fsPath !== request.repositoryPath) return;
    let status: RevisionGraphProtocol.FlowFormStatus = 'retry';
    let message = 'The operation was not completed. Review the repository state and try again.';
    let executing = false;
    try {
      const resolution = await resolveFlowConfigForRepository(request.repositoryPath, this.settings(repository));
      if (!resolution.ok || !resolution.config.enabled) {
        message = 'Flow Governance is disabled or its configuration is invalid. Review it in View before trying again.';
      } else if (this.canRun(repository, request)) {
        executing = true;
        const outcome = await runGuardedRepositoryMutation(this.host.mutationCoordinator, repository, this.host.actionServices,
          async (guardedRepository, services) => {
            const formServices = { ...services, ui: { ...services.ui,
              showWarningMessage: (text: string, options?: { modal?: boolean; detail?: string }) => {
                message = text;
                return services.ui.showWarningMessage(text, options);
              },
              showErrorMessage: async (text: string, options?: { modal?: boolean; detail?: string }) => {
                message = text;
                if (options?.modal) await services.ui.showErrorMessage(text, options);
              }
            } };
            const action = request.action;
            return action.type === 'start-flow-branch'
              ? this.actions.startBranch(guardedRepository, {
                kind: action.branchKind, sourceBranch: action.sourceRefName, name: action.name,
                description: action.description, config: resolution.config
              }, formServices)
              : this.actions.equalize(guardedRepository, {
                targetBranch: action.targetRefName, originBranch: action.originRefName,
                description: action.description, config: resolution.config
              }, formServices, { sourcePreflight: {
                runWithRemoteFetchLoading: (operation) => withFlowRemoteFetchLoading(services, operation)
              } });
          });
        status = outcome.status === 'completed' ? outcome.value : 'retry';
        if (outcome.status === 'rejected') message = 'Another Git operation is running. Wait for it to finish, then try again.';
      }
    } catch (error) {
      status = executing ? 'partial' : 'retry';
      message = error instanceof Error ? error.message : String(error);
    }
    if (this.isCurrent(repository)) {
      this.host.postHostMessage(createFlowFormResultMessage(request, status,
        status === 'partial' ? `${message} A branch may already have been created. Review Git state before starting another operation.` : message));
    }
  }

  private canRun(repository: Repository, request: RevisionGraphProtocol.MessageOf<'submit-flow-form'>): boolean {
    const state = this.host.getCurrentState();
    return this.isCurrent(repository) && !state.loading && isRevisionGraphMessageAllowedForState(request, state);
  }

  private isCurrent(repository: Repository): boolean {
    return !this.disposed && this.host.getCurrentRepository() === repository;
  }
}
