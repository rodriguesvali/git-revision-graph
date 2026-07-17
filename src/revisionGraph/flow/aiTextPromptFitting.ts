import type * as vscode from 'vscode';

import {
  buildFlowAiTextImprovementPrompt,
  type FlowAiTextImprovementInput
} from './aiTextAssistant';
import { truncateFlowAiDocumentContext } from './aiTextDocumentContext';

const FLOW_AI_INPUT_TOKEN_RESERVE = 256;
const MIN_FLOW_AI_DOCUMENT_CONTEXT_CHARS = 1_000;

export interface FlowAiTextTokenCountingModel {
  readonly maxInputTokens: number;
  countTokens(text: string, token?: vscode.CancellationToken): Thenable<number>;
}

export interface FittedFlowAiTextPrompt<TModel extends FlowAiTextTokenCountingModel> {
  readonly model: TModel;
  readonly prompt: string;
}

export async function selectFittedFlowAiTextPrompt<TModel extends FlowAiTextTokenCountingModel>(
  models: readonly TModel[],
  input: FlowAiTextImprovementInput,
  token: vscode.CancellationToken
): Promise<FittedFlowAiTextPrompt<TModel> | undefined> {
  const fullPrompt = buildFlowAiTextImprovementPrompt(input);
  for (const model of models) {
    if (token.isCancellationRequested) return undefined;
    if (await flowAiPromptFits(model, fullPrompt, token)) return { model, prompt: fullPrompt };
  }

  if (!canReduceFlowAiDocumentContext(input)) return undefined;
  const rankedModels = models
    .map((model, index) => ({ model, index }))
    .sort((left, right) => right.model.maxInputTokens - left.model.maxInputTokens || left.index - right.index);
  for (const { model } of rankedModels) {
    const prompt = await fitReducedFlowAiDocumentContext(model, input, token);
    if (prompt) return { model, prompt };
  }
  return undefined;
}

async function fitReducedFlowAiDocumentContext(
  model: FlowAiTextTokenCountingModel,
  input: Extract<FlowAiTextImprovementInput, { readonly surface: 'pull-request' }>,
  token: vscode.CancellationToken
): Promise<string | undefined> {
  const documentContext = input.documentContext ?? '';
  let documentChars = reduceFlowAiDocumentContextChars(documentContext.length);
  while (documentChars >= MIN_FLOW_AI_DOCUMENT_CONTEXT_CHARS) {
    if (token.isCancellationRequested) return undefined;
    const prompt = buildFlowAiTextImprovementPrompt({
      ...input,
      documentContext: truncateFlowAiDocumentContext(documentContext, documentChars)
    });
    if (await flowAiPromptFits(model, prompt, token)) return prompt;
    documentChars = reduceFlowAiDocumentContextChars(documentChars);
  }

  const essentialPrompt = buildFlowAiTextImprovementPrompt({
    ...input,
    documentContext: undefined,
    documentContextWasOmitted: true
  });
  return await flowAiPromptFits(model, essentialPrompt, token) ? essentialPrompt : undefined;
}

function reduceFlowAiDocumentContextChars(currentChars: number): number {
  if (currentChars <= MIN_FLOW_AI_DOCUMENT_CONTEXT_CHARS) return 0;
  return Math.max(MIN_FLOW_AI_DOCUMENT_CONTEXT_CHARS, Math.floor(currentChars * 0.7));
}

function canReduceFlowAiDocumentContext(
  input: FlowAiTextImprovementInput
): input is Extract<FlowAiTextImprovementInput, { readonly surface: 'pull-request' }> {
  return input.surface === 'pull-request'
    && input.field === 'description'
    && !!input.documentContext;
}

async function flowAiPromptFits(
  model: FlowAiTextTokenCountingModel,
  prompt: string,
  token: vscode.CancellationToken
): Promise<boolean> {
  const tokenBudget = Math.max(1, model.maxInputTokens - FLOW_AI_INPUT_TOKEN_RESERVE);
  return await model.countTokens(prompt, token) <= tokenBudget;
}
