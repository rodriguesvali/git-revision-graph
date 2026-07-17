import * as vscode from 'vscode';

import { toOperationError } from '../../errorDetail';
import type { Repository } from '../../git';
import type { RevisionGraphViewHostMessage } from '../../revisionGraphTypes';
import { showModalErrorMessage } from '../../workbenchMessages';
import { createRevisionGraphFlowAiTextResultMessage } from '../hostMessages';
import type { FlowPullRequestContext } from './flowPullRequestContext';
import type {
  FlowAiTextField,
  FlowAiTextImprover,
  FlowAiTextImprovementInput,
  FlowAiTextSurface
} from './aiTextAssistant';
import type { FlowAiTextDocumentContextProvider } from './aiTextDocumentContext';

export interface RevisionGraphFlowAiTextWorkflowHost {
  getCurrentRepository(): Repository | undefined;
  postHostMessage(message: RevisionGraphViewHostMessage): void;
}

export class RevisionGraphFlowAiTextWorkflow implements vscode.Disposable {
  private readonly requests = new Map<string, FlowAiTextRequest>();
  private pullRequestContext: FlowPullRequestContext | undefined;

  constructor(
    private readonly host: RevisionGraphFlowAiTextWorkflowHost,
    private readonly improver: FlowAiTextImprover | undefined,
    private readonly documentContextProvider?: FlowAiTextDocumentContextProvider
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
    this.pullRequestContext = undefined;
  }

  setPullRequestContext(context: FlowPullRequestContext): void {
    this.cancelSurface('pull-request');
    this.pullRequestContext = context;
  }

  getPullRequestContext(
    sourceRefName: string,
    targetRefName: string
  ): FlowPullRequestContext | undefined {
    const context = this.pullRequestContext;
    return context?.sourceRefName === sourceRefName && context.targetRefName === targetRefName
      ? context
      : undefined;
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
    const repository = this.host.getCurrentRepository();
    const improver = this.improver;
    if (!repository || !improver || !this.isCurrentForm(input)) {
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
      const preparedInput = await this.withDocumentContext(repository, input, request);
      if (!this.isCurrentRequest(key, request)) return;
      const result = await improver.improve(preparedInput, request.tokenSource.token);
      if (!this.isCurrentRequest(key, request) || result.status === 'cancelled') return;
      if (result.status === 'unavailable') {
        this.postUnavailable(requestId, input, result.message);
        return;
      }

      if (preparedInput.surface === 'pull-request') {
        this.applyPullRequestImprovement(preparedInput, result.content);
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

  private isCurrentForm(input: FlowAiTextImprovementInput): boolean {
    if (input.surface === 'release') return true;
    return !!this.getPullRequestContext(input.sourceRefName, input.targetRefName);
  }

  private applyPullRequestImprovement(
    input: Extract<FlowAiTextImprovementInput, { readonly surface: 'pull-request' }>,
    content: string
  ): void {
    if (!this.getPullRequestContext(input.sourceRefName, input.targetRefName)) return;
    this.pullRequestContext = input.field === 'title'
      ? createFlowPullRequestContext(input, content, input.description)
      : createFlowPullRequestContext(input, input.title, content);
  }

  private async withDocumentContext(
    repository: Repository,
    input: FlowAiTextImprovementInput,
    request: FlowAiTextRequest
  ): Promise<FlowAiTextImprovementInput> {
    if (input.surface !== 'pull-request' || input.field !== 'description' || !this.documentContextProvider) {
      return input;
    }
    const documentContext = await this.documentContextProvider.load(
      repository,
      input,
      request.tokenSource.token
    );
    return documentContext ? { ...input, documentContext } : input;
  }

  private isCurrentRequest(key: string, request: FlowAiTextRequest): boolean {
    return this.requests.get(key) === request
      && this.host.getCurrentRepository()?.rootUri.fsPath === request.repositoryPath;
  }

  private postUnavailable(
    requestId: number,
    input: FlowAiTextImprovementInput,
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

  private cancelSurface(surface: FlowAiTextSurface): void {
    for (const [key, request] of this.requests) {
      if (request.input.surface === surface) this.cancelByKey(key);
    }
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

function createFlowPullRequestContext(
  input: Extract<FlowAiTextImprovementInput, { readonly surface: 'pull-request' }>,
  title: string,
  body: string
): FlowPullRequestContext {
  return {
    sourceRefName: input.sourceRefName,
    targetRefName: input.targetRefName,
    title,
    body,
    text: createFlowPullRequestText(title, body)
  };
}

function createFlowPullRequestText(title: string, body: string): string {
  return [`Title: ${title}`, '', body].join('\n');
}
