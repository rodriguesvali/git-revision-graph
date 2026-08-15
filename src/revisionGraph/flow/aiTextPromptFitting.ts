import type * as vscode from 'vscode';

import {
  buildFlowAiTextImprovementPrompt,
  type FlowAiTextImprovementInput
} from './aiTextAssistant';
const FLOW_AI_INPUT_TOKEN_RESERVE = 256;

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
  return undefined;
}

async function flowAiPromptFits(
  model: FlowAiTextTokenCountingModel,
  prompt: string,
  token: vscode.CancellationToken
): Promise<boolean> {
  const tokenBudget = Math.max(1, model.maxInputTokens - FLOW_AI_INPUT_TOKEN_RESERVE);
  return await model.countTokens(prompt, token) <= tokenBudget;
}
