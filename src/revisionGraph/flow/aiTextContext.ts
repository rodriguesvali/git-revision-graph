import type * as vscode from 'vscode';

import {
  isSensitiveAiContextPath,
  normalizeAiContextPath,
  sanitizeAiContextText
} from '../../aiContextPaths';
import type { Repository } from '../../git';
import type {
  RevisionGraphChangedPath,
  RevisionGraphDocumentBackend
} from '../backend';
import type {
  FlowAiPromptContextSource,
  FlowAiTextImprovementInput
} from './aiTextAssistant';

const FLOW_AI_DOCUMENT_FILES = new Set([
  'README.md',
  'CHANGELOG.md'
]);
const FLOW_AI_DOCUMENT_DIRECTORIES = [
  'project-context/1.define',
  'project-context/2.build/features',
  'project-context/3.deliver'
] as const;
const FLOW_AI_CONTEXT_GIT_MAX_OUTPUT_BYTES = 1024 * 1024;
const FLOW_AI_CHANGED_PATHS_MAX_OUTPUT_BYTES = 512 * 1024;
const FLOW_AI_CODE_CONTEXT_MAX_FILES = 80;
export const FLOW_AI_CONTEXT_MAX_CHARS = 60_000;

export interface FlowAiTextContextProvider {
  load(
    repository: Repository,
    input: Extract<FlowAiTextImprovementInput, { readonly surface: 'pull-request' }>,
    token: vscode.CancellationToken
  ): Promise<string | undefined>;
}

export function createFlowAiTextContextProvider(
  backend: RevisionGraphDocumentBackend
): FlowAiTextContextProvider {
  return {
    async load(repository, input, token) {
      if (input.field !== 'description' || !input.promptContext || token.isCancellationRequested) {
        return undefined;
      }
      const abortController = new AbortController();
      const cancellation = token.onCancellationRequested(() => abortController.abort());
      try {
        const context = input.promptContext.contextSource === 'code-diff'
          ? await loadSafeCodeContext(backend, repository, input, abortController.signal)
          : await loadDocumentContext(backend, repository, input, abortController.signal);
        if (token.isCancellationRequested || !context?.trim()) return undefined;
        return truncateFlowAiContext(
          context,
          input.promptContext.contextSource
        );
      } catch {
        return undefined;
      } finally {
        cancellation.dispose();
      }
    }
  };
}

export function truncateFlowAiContext(
  value: string,
  source: FlowAiPromptContextSource,
  maxChars = FLOW_AI_CONTEXT_MAX_CHARS
): string {
  if (value.length <= maxChars) return value;
  const label = source === 'code-diff' ? 'code diff' : 'project-document diff';
  return `${value.slice(0, maxChars)}\n... [${label} truncated]`;
}

async function loadDocumentContext(
  backend: RevisionGraphDocumentBackend,
  repository: Repository,
  input: PullRequestInput,
  signal: AbortSignal
): Promise<string | undefined> {
  const changes = await backend.loadChangedPaths(
    repository,
    input.targetRefName,
    input.sourceRefName,
    { signal, maxOutputBytes: FLOW_AI_CHANGED_PATHS_MAX_OUTPUT_BYTES }
  );
  const selectedChanges = changes
    .map((change) => toSafeChangedPath(change, isFlowAiDocumentPath))
    .filter((change): change is SafeChangedPath => !!change)
    .sort((left, right) => left.displayPath.localeCompare(right.displayPath))
    .slice(0, FLOW_AI_CODE_CONTEXT_MAX_FILES);
  if (selectedChanges.length === 0) return undefined;

  const paths = [...new Set(selectedChanges.flatMap((change) => change.paths))];
  const diff = await backend.loadUnifiedDiff(
    repository,
    input.targetRefName,
    input.sourceRefName,
    {
      paths,
      signal,
      maxOutputBytes: FLOW_AI_CONTEXT_GIT_MAX_OUTPUT_BYTES
    }
  );
  return sanitizeLoadedAiContext(diff);
}

async function loadSafeCodeContext(
  backend: RevisionGraphDocumentBackend,
  repository: Repository,
  input: PullRequestInput,
  signal: AbortSignal
): Promise<string | undefined> {
  const changes = await backend.loadChangedPaths(
    repository,
    input.targetRefName,
    input.sourceRefName,
    { signal, maxOutputBytes: FLOW_AI_CHANGED_PATHS_MAX_OUTPUT_BYTES }
  );
  const safeChanges = changes
    .map((change) => toSafeChangedPath(change))
    .filter((change): change is SafeChangedPath => !!change)
    .sort((left, right) => left.displayPath.localeCompare(right.displayPath));
  const selectedChanges = safeChanges.slice(0, FLOW_AI_CODE_CONTEXT_MAX_FILES);
  if (selectedChanges.length === 0) return undefined;

  const paths = [...new Set(selectedChanges.flatMap((change) => change.paths))];
  const diff = await backend.loadUnifiedDiff(
    repository,
    input.targetRefName,
    input.sourceRefName,
    {
      paths,
      signal,
      maxOutputBytes: FLOW_AI_CONTEXT_GIT_MAX_OUTPUT_BYTES
    }
  );
  const sanitizedDiff = sanitizeLoadedAiContext(diff);
  if (!sanitizedDiff) return undefined;

  const omittedCount = changes.length - selectedChanges.length;
  return [
    `Changed files included: ${selectedChanges.length}`,
    omittedCount > 0
      ? `${omittedCount} changed file(s) were omitted by safety or size policy.`
      : '',
    'Changed-file inventory:',
    ...selectedChanges.map((change) => `- ${change.status}: ${change.displayPath}`),
    '',
    'Unified diff:',
    sanitizedDiff
  ].filter((line) => line.length > 0).join('\n');
}

type PullRequestInput = Extract<FlowAiTextImprovementInput, { readonly surface: 'pull-request' }>;

interface SafeChangedPath {
  readonly status: string;
  readonly paths: readonly string[];
  readonly displayPath: string;
}

function toSafeChangedPath(
  change: RevisionGraphChangedPath,
  isAllowed: (path: string) => boolean = () => true
): SafeChangedPath | undefined {
  const paths = change.paths.map(normalizeAiContextPath);
  if (
    paths.some((value) => !value)
    || paths.some((value) => value
      ? isSensitiveAiContextPath(value) || !isAllowed(value)
      : true)
  ) {
    return undefined;
  }
  const normalizedPaths = paths.filter((value): value is string => !!value);
  return {
    status: change.status,
    paths: normalizedPaths,
    displayPath: normalizedPaths.join(' -> ')
  };
}

function isFlowAiDocumentPath(value: string): boolean {
  return FLOW_AI_DOCUMENT_FILES.has(value)
    || FLOW_AI_DOCUMENT_DIRECTORIES.some((directory) =>
      value.startsWith(`${directory}/`)
    );
}

function sanitizeLoadedAiContext(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const sanitized = sanitizeAiContextText(value);
  return sanitized.redacted
    ? `Sensitive-looking values were redacted before model use.\n${sanitized.text}`
    : sanitized.text;
}
