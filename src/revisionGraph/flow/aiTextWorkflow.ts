import * as vscode from 'vscode';

import { toOperationError } from '../../errorDetail';
import type { Repository } from '../../git';
import type {
  RevisionGraphViewHostMessage,
  RevisionGraphViewState
} from '../../revisionGraphTypes';
import { showModalErrorMessage } from '../../workbenchMessages';
import { createRevisionGraphFlowAiTextResultMessage } from '../hostMessages';
import type {
  FlowAiTextField,
  FlowAiTextImprover,
  FlowAiTextImprovementInput,
  FlowAiTextSurface
} from './aiTextAssistant';

export interface RevisionGraphFlowAiTextWorkflowHost {
  getCurrentRepository(): Repository | undefined;
  getCurrentState(): RevisionGraphViewState;
  postHostMessage(message: RevisionGraphViewHostMessage): void;
}

export class RevisionGraphFlowAiTextWorkflow implements vscode.Disposable {
  private readonly requests = new Map<string, FlowAiTextRequest>();

  constructor(
    private readonly host: RevisionGraphFlowAiTextWorkflowHost,
    private readonly improver: FlowAiTextImprover | undefined
  ) {}

  dispose(): void {
    this.reset();
  }

  reset(): void {
    for (const request of this.requests.values()) {
      request.tokenSource.cancel();
      request.tokenSource.dispose();
    }
    this.requests.clear();
  }

  cancel(surface: FlowAiTextSurface, field: FlowAiTextField, requestId: number): void {
    const key = createFlowAiTextRequestKey(surface, field);
    const request = this.requests.get(key);
    if (request?.requestId !== requestId) return;
    this.requests.delete(key);
    request.tokenSource.cancel();
    request.tokenSource.dispose();
  }

  async improve(requestId: number, input: FlowAiTextImprovementInput): Promise<void> {
    if (input.surface === 'pull-request') {
      return;
    }
    const repository = this.host.getCurrentRepository();
    const improver = this.improver;
    if (!repository || !improver) {
      this.postUnavailable(requestId, input, 'AI text improvement is not available for this form.');
      return;
    }

    const key = createFlowAiTextRequestKey(input.surface, input.field);
    this.cancelByKey(key);
    const request: FlowAiTextRequest = {
      requestId,
      repositoryPath: repository.rootUri.fsPath,
      input,
      tokenSource: new vscode.CancellationTokenSource()
    };
    this.requests.set(key, request);

    try {
      const preparedInput = input;
      if (!this.isCurrentRequest(key, request)) return;
      const result = await improver.improve(preparedInput, request.tokenSource.token);
      if (!this.isCurrentRequest(key, request) || result.status === 'cancelled') return;
      if (result.status === 'unavailable') {
        this.postUnavailable(requestId, input, result.message);
        return;
      }

      this.host.postHostMessage(createRevisionGraphFlowAiTextResultMessage(
        requestId,
        input.surface,
        input.field,
        'ready',
        result.content
      ));
    } catch (error) {
      if (!this.isCurrentRequest(key, request)) return;
      this.host.postHostMessage(createRevisionGraphFlowAiTextResultMessage(
        requestId,
        input.surface,
        input.field,
        'unavailable'
      ));
      await showModalErrorMessage(
        toOperationError('Could not improve the Flow Governance form text.', error),
        { modal: true }
      );
    } finally {
      if (this.requests.get(key) === request) this.requests.delete(key);
      request.tokenSource.dispose();
    }
  }

  private isCurrentRequest(key: string, request: FlowAiTextRequest): boolean {
    return this.requests.get(key) === request
      && this.host.getCurrentRepository()?.rootUri.fsPath === request.repositoryPath;
  }

  private postUnavailable(
    requestId: number,
    input: Exclude<FlowAiTextImprovementInput, { readonly surface: 'pull-request' }>,
    message: string
  ): void {
    this.host.postHostMessage(createRevisionGraphFlowAiTextResultMessage(
      requestId,
      input.surface,
      input.field,
      'unavailable'
    ));
    void vscode.window.showInformationMessage(message);
  }

  private cancelByKey(key: string): void {
    const request = this.requests.get(key);
    if (!request) return;
    this.requests.delete(key);
    request.tokenSource.cancel();
    request.tokenSource.dispose();
  }
}

interface FlowAiTextRequest {
  readonly requestId: number;
  readonly repositoryPath: string;
  readonly input: FlowAiTextImprovementInput;
  readonly tokenSource: vscode.CancellationTokenSource;
}

function createFlowAiTextRequestKey(surface: FlowAiTextSurface, field: FlowAiTextField): string {
  return `${surface}:${field}`;
}
