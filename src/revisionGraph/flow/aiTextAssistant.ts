import type * as vscode from 'vscode';

import { buildFlowAiPrompt } from './aiPrompts';
import type {
  FlowAiTextField,
  FlowAiTextImprovementInput
} from './aiPrompts/types';

export type {
  FlowAiBranchTextSurface,
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

export const FLOW_AI_DESCRIPTION_MAX_LENGTH = 2048;

export function buildFlowAiTextImprovementPrompt(input: FlowAiTextImprovementInput): string {
  return buildFlowAiPrompt(input);
}

export function normalizeFlowAiTextImprovementOutput(
  _field: FlowAiTextField,
  value: string
): string {
  const trimmed = value.trim();
  return trimmed.slice(0, FLOW_AI_DESCRIPTION_MAX_LENGTH).trim();
}
