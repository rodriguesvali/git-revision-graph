import * as vscode from 'vscode';

import { toOperationError } from '../errorDetail';
import type { CompareResultsState } from '../compareResultsShared';
import type { RevisionGraphDocumentBackend } from '../revisionGraph/backend';
import { showModalErrorMessage } from '../workbenchMessages';
import type { CompareBriefingGenerator, CompareBriefingState } from './aiBriefing';
import { prepareCompareBriefing } from './briefingWorkflow';

export class CompareBriefingController implements vscode.Disposable {
  private currentState: CompareBriefingState = { kind: 'idle' };
  private request: BriefingRequest | undefined;

  constructor(
    private readonly backend: RevisionGraphDocumentBackend,
    private readonly generator: CompareBriefingGenerator | undefined,
    private readonly getComparisonState: () => CompareResultsState,
    private readonly onStateChanged: () => void
  ) {}

  get state(): CompareBriefingState {
    return this.currentState;
  }

  get isAvailable(): boolean {
    return !!this.generator;
  }

  dispose(): void {
    this.reset();
  }

  reset(): void {
    this.cancelRequest();
    this.currentState = { kind: 'idle' };
  }

  cancel(): void {
    const request = this.cancelRequest();
    if (request) {
      this.setState(request.restoreState);
    }
  }

  async generate(): Promise<void> {
    const generator = this.generator;
    const comparisonState = this.getComparisonState();
    if (!generator || (comparisonState.kind !== 'between' && comparisonState.kind !== 'worktree')) {
      return;
    }

    const restoreState: CompareBriefingState = this.currentState.kind === 'ready'
      ? this.currentState
      : { kind: 'idle' };
    this.cancelRequest();
    const request: BriefingRequest = {
      state: comparisonState,
      restoreState,
      tokenSource: new vscode.CancellationTokenSource()
    };
    this.request = request;
    this.setState({ kind: 'loading' });

    try {
      const preparation = await prepareCompareBriefing(
        comparisonState,
        this.backend,
        request.tokenSource.token
      );
      if (!this.isCurrent(request) || preparation.status === 'cancelled') return;
      if (preparation.status === 'unavailable') {
        this.finishUnavailable(request, preparation.message);
        return;
      }

      const result = await generator.generate(preparation.input, request.tokenSource.token);
      if (!this.isCurrent(request) || result.status === 'cancelled') return;
      if (result.status === 'unavailable') {
        this.finishUnavailable(request, result.message);
        return;
      }

      this.setState({ kind: 'ready', content: result.content });
    } catch (error) {
      if (!this.isCurrent(request)) return;
      this.setState({ kind: 'idle' });
      await showModalErrorMessage(
        toOperationError('Could not generate the AI Compare Briefing.', error),
        { modal: true }
      );
    } finally {
      if (this.request === request) this.request = undefined;
      request.tokenSource.dispose();
    }
  }

  private finishUnavailable(request: BriefingRequest, message: string): void {
    if (!this.isCurrent(request)) return;
    this.setState({ kind: 'idle' });
    void vscode.window.showInformationMessage(message);
  }

  private isCurrent(request: BriefingRequest): boolean {
    return this.request === request && this.getComparisonState() === request.state;
  }

  private setState(state: CompareBriefingState): void {
    this.currentState = state;
    this.onStateChanged();
  }

  private cancelRequest(): BriefingRequest | undefined {
    const request = this.request;
    this.request = undefined;
    request?.tokenSource.cancel();
    request?.tokenSource.dispose();
    return request;
  }
}

interface BriefingRequest {
  readonly state: Extract<CompareResultsState, { readonly kind: 'between' | 'worktree' }>;
  readonly restoreState: CompareBriefingState;
  readonly tokenSource: vscode.CancellationTokenSource;
}
