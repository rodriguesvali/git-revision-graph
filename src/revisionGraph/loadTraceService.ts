import * as vscode from 'vscode';

import { RevisionGraphViewHostMessage } from '../revisionGraphTypes';
import { RevisionGraphRefreshIntent } from '../revisionGraphRefresh';
import { RevisionGraphLoadTraceSink } from './loadTrace';

export class RevisionGraphLoadTraceService implements vscode.Disposable {
  private traceOutput: vscode.OutputChannel | undefined;

  constructor(private readonly getCurrentRequestId: () => number) {}

  dispose(): void {
    this.traceOutput?.dispose();
  }

  createSink(
    repositoryPath: string,
    intent: RevisionGraphRefreshIntent,
    requestId: number
  ): RevisionGraphLoadTraceSink | undefined {
    if (!this.isEnabled()) {
      return undefined;
    }

    const output = this.getTraceOutput();
    const repositoryLabel = vscode.workspace.asRelativePath(repositoryPath, false) || repositoryPath;
    output.appendLine(`[revision-graph-load] request=${requestId} intent=${intent} repository=${repositoryLabel}`);

    return (event) => {
      const detail = event.detail ? ` ${event.detail}` : '';
      output.appendLine(
        `[revision-graph-load] request=${requestId} phase=${event.phase} duration=${event.durationMs}ms${detail}`
      );
    };
  }

  withHostTraceContext(message: RevisionGraphViewHostMessage): RevisionGraphViewHostMessage {
    if (!this.isEnabled()) {
      return message;
    }

    switch (message.type) {
      case 'init-state':
      case 'update-state':
        return {
          ...message,
          trace: {
            requestId: this.getCurrentRequestId(),
            sentAtMs: Date.now()
          }
        };
      case 'set-loading':
      case 'set-error':
      case 'set-remote-tag-state':
      case 'set-commit-short-stat':
      case 'show-flow-pr-context':
      case 'show-flow-branch-form':
      case 'set-flow-ai-text-result':
        return message;
    }
  }

  traceWebviewLoadEvent(
    phase: string,
    durationMs: number,
    detail: string | undefined,
    requestId: number | undefined
  ): void {
    if (!this.isEnabled()) {
      return;
    }

    const output = this.getTraceOutput();
    const resolvedRequestId = requestId ?? this.getCurrentRequestId();
    output.appendLine(
      `[revision-graph-load] request=${resolvedRequestId} phase=${phase} duration=${durationMs}ms${detail ? ` ${detail}` : ''}`
    );
  }

  private getTraceOutput(): vscode.OutputChannel {
    if (!this.traceOutput) {
      this.traceOutput = vscode.window.createOutputChannel('Git Revision Graph');
    }

    return this.traceOutput;
  }

  private isEnabled(): boolean {
    return vscode.workspace.getConfiguration('gitRevisionGraph').get<boolean>('traceLoading', false);
  }
}
