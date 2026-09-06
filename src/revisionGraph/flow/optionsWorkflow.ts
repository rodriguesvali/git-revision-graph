import * as vscode from 'vscode';
import type { Repository } from '../../git';
import type { RevisionGraphFlowGovernanceWorkflowHost } from './governanceWorkflow';
import { resolveFlowConfigForRepository } from './flowConfig';
import { FlowConfigPersistenceCoordinator, type RepositoryFlowConfigOptionsUpdateResult } from './flowConfigPersistenceCoordinator';
import { createFlowGovernanceViewState } from './flowState';
import { classifyFlowBranches } from './flowBranchClassifier';
import type { FlowConfigResolution, FlowGovernanceOptionsUpdate, FlowGovernanceSettings } from './flowTypes';

/** Commits UI activation only after the repository configuration has been persisted and validated. */
export class FlowGovernanceOptionsWorkflow {
  private readonly pendingOptions = new Set<string>();
  private disposed = false;

  constructor(
    private readonly host: RevisionGraphFlowGovernanceWorkflowHost,
    private readonly resolveSettings: (repository: Repository) => FlowGovernanceSettings,
    private readonly configPersistence: FlowConfigPersistenceCoordinator
  ) {}

  dispose(): void { this.disposed = true; }

  async updateOptions(options: FlowGovernanceOptionsUpdate): Promise<void> {
    const currentState = this.host.getCurrentState();
    const flowGovernance = currentState.flowGovernance;
    if (currentState.viewMode !== 'ready' || !flowGovernance) {
      return;
    }

    const repository = this.host.getCurrentRepository();
    if (!repository || options.enabled === undefined || this.disposed) return;
    if (this.pendingOptions.has(repository.rootUri.fsPath)) {
      this.host.postCurrentState();
      return;
    }
    const settings = this.resolveSettings(repository);
    this.pendingOptions.add(repository.rootUri.fsPath);
    this.host.setCurrentState({
      ...currentState,
      flowGovernance: { ...flowGovernance, saving: true }
    });
    this.host.postCurrentState();

    try {
      const result = await this.configPersistence.enqueue(repository.rootUri.fsPath, settings, options);
      const resolution = await resolveFlowConfigForRepository(repository.rootUri.fsPath, settings);
      await this.completeUpdate(repository, result, resolution);
    } catch (error) {
      if (this.isCurrent(repository)) {
        void vscode.window.showWarningMessage(
          `Could not update Flow Governance config: ${getErrorMessage(error)}. Check the configuration file and try again.`
        );
      }
    } finally {
      this.clearSaving(repository);
    }
  }

  private async completeUpdate(
    repository: Repository,
    result: RepositoryFlowConfigOptionsUpdateResult,
    resolution: FlowConfigResolution
  ): Promise<void> {
    if (!this.isCurrent(repository)) return;
    const latestState = this.host.getCurrentState();
    if (latestState.viewMode !== 'ready' || !latestState.flowGovernance) return;
    const references = classifyFlowBranches(
      latestState.references
        .filter((reference) => reference.kind === 'head' || reference.kind === 'branch')
        .map((reference) => reference.name), resolution.config
    );
    this.host.setCurrentState({
      ...latestState,
      flowGovernance: createFlowGovernanceViewState(resolution, references)
    });
    this.host.postCurrentState();
    if (!result.ok) {
      void vscode.window.showWarningMessage(
        `Could not update Flow Governance config: ${result.issue.message}. Check the configuration file and try again.`
      );
      return;
    }
    if (result.created) {
      try {
        const document = await vscode.workspace.openTextDocument(vscode.Uri.file(result.path));
        if (this.isCurrent(repository)) {
          await vscode.window.showTextDocument(document, { preview: false });
        }
      } catch (error) {
        void vscode.window.showWarningMessage(
          `Flow Governance config was created but could not be opened: ${getErrorMessage(error)}`
        );
      }
    }
  }

  private isCurrent(repository: Repository): boolean {
    return !this.disposed && this.host.getCurrentRepository()?.rootUri.fsPath === repository.rootUri.fsPath;
  }

  private clearSaving(repository: Repository): void {
    this.pendingOptions.delete(repository.rootUri.fsPath);
    if (this.isCurrent(repository)) {
      const latestState = this.host.getCurrentState();
      if (latestState.flowGovernance?.saving) {
        this.host.setCurrentState({
          ...latestState,
          flowGovernance: { ...latestState.flowGovernance, saving: false }
        });
        this.host.postCurrentState();
      }
    }
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
