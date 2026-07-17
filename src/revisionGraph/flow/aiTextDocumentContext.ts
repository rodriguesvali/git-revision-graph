import type * as vscode from 'vscode';

import type { Repository } from '../../git';
import type { RevisionGraphDocumentBackend } from '../backend';
import type { FlowAiTextImprovementInput } from './aiTextAssistant';

const FLOW_AI_DOCUMENT_PATHS = [
  'README.md',
  'CHANGELOG.md',
  'project-context/1.define',
  'project-context/2.build/features',
  'project-context/3.deliver'
] as const;
const FLOW_AI_DOCUMENT_GIT_MAX_OUTPUT_BYTES = 1024 * 1024;
export const FLOW_AI_DOCUMENT_CONTEXT_MAX_CHARS = 60_000;

export interface FlowAiTextDocumentContextProvider {
  load(
    repository: Repository,
    input: Extract<FlowAiTextImprovementInput, { readonly surface: 'pull-request' }>,
    token: vscode.CancellationToken
  ): Promise<string | undefined>;
}

export function createFlowAiTextDocumentContextProvider(
  backend: RevisionGraphDocumentBackend
): FlowAiTextDocumentContextProvider {
  return {
    async load(repository, input, token) {
      if (input.field !== 'description' || token.isCancellationRequested) return undefined;
      const abortController = new AbortController();
      const cancellation = token.onCancellationRequested(() => abortController.abort());
      try {
        const diff = await backend.loadUnifiedDiff(
          repository,
          input.targetRefName,
          input.sourceRefName,
          {
            paths: FLOW_AI_DOCUMENT_PATHS,
            signal: abortController.signal,
            maxOutputBytes: FLOW_AI_DOCUMENT_GIT_MAX_OUTPUT_BYTES
          }
        );
        if (token.isCancellationRequested || !diff.trim()) return undefined;
        return truncateFlowAiDocumentContext(diff);
      } catch {
        return undefined;
      } finally {
        cancellation.dispose();
      }
    }
  };
}

export function truncateFlowAiDocumentContext(
  value: string,
  maxChars = FLOW_AI_DOCUMENT_CONTEXT_MAX_CHARS
): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}\n... [project-document diff truncated]`;
}
