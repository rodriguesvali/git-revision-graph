import type * as vscode from 'vscode';

import { buildFlowAiPrompt } from './aiPrompts';
import type {
  FlowAiTextField,
  FlowAiTextImprovementInput
} from './aiPrompts/types';

export type {
  FlowAiPromptContextSource,
  FlowAiPullRequestPromptContext,
  FlowAiPullRequestPromptKind,
  FlowAiTextField,
  FlowAiTextImprovementInput,
  FlowAiTextSurface
} from './aiPrompts/types';

export type FlowAiTextImprovementResult =
  | { readonly status: 'ready'; readonly content: string }
  | { readonly status: 'unavailable'; readonly message: string }
  | { readonly status: 'cancelled' };

export interface FlowAiTextImprover {
  improve(
    input: FlowAiTextImprovementInput,
    token: vscode.CancellationToken
  ): Promise<FlowAiTextImprovementResult>;
}

export const FLOW_AI_TITLE_MAX_LENGTH = 240;
export const FLOW_AI_DESCRIPTION_MAX_LENGTH = 2048;

export function buildFlowAiTextImprovementPrompt(input: FlowAiTextImprovementInput): string {
  return buildFlowAiPrompt(input);
}

export function normalizeFlowAiTextImprovementOutput(
  field: FlowAiTextField,
  value: string
): string {
  const trimmed = value.trim();
  const normalized = field === 'title'
    ? trimmed.replace(/\s+/g, ' ')
    : trimmed;
  const maxLength = field === 'title'
    ? FLOW_AI_TITLE_MAX_LENGTH
    : FLOW_AI_DESCRIPTION_MAX_LENGTH;
  return normalized.slice(0, maxLength).trim();
}
