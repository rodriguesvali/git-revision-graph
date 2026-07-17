import * as vscode from 'vscode';

import {
  buildCompareBriefingPrompt,
  MAX_COMPARE_BRIEFING_DIFF_CHARS,
  normalizeCompareBriefingOutput,
  type CompareBriefingGenerator,
  type CompareBriefingGenerationResult,
  type CompareBriefingInput
} from './compareResults/aiBriefing';

const MIN_COMPARE_BRIEFING_DIFF_CHARS = 2_000;
const COMPARE_BRIEFING_TOKEN_RESERVE = 512;

export function createWorkbenchAiCompareBriefingGenerator(): CompareBriefingGenerator {
  return {
    async generate(input, token) {
      try {
        const models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
        if (token.isCancellationRequested) {
          return { status: 'cancelled' };
        }
        const model = models[0];
        if (!model) {
          return {
            status: 'unavailable',
            message: 'No Copilot language model is currently available for AI Briefing.'
          };
        }

        const prompt = await fitCompareBriefingPrompt(model, input, token);
        if (!prompt) {
          return {
            status: 'unavailable',
            message: 'The comparison context is too large for the available language model.'
          };
        }

        const response = await model.sendRequest(
          [vscode.LanguageModelChatMessage.User(prompt)],
          { justification: 'Generate an on-demand briefing for the active Git comparison.' },
          token
        );
        let content = '';
        for await (const chunk of response.text) {
          if (token.isCancellationRequested) {
            return { status: 'cancelled' };
          }
          content += chunk;
        }

        const normalized = normalizeCompareBriefingOutput(content);
        return normalized.length > 0
          ? { status: 'ready', content: normalized }
          : { status: 'unavailable', message: 'The language model returned an empty AI briefing.' };
      } catch (error) {
        if (token.isCancellationRequested) {
          return { status: 'cancelled' };
        }
        return toLanguageModelFailure(error);
      }
    }
  };
}

async function fitCompareBriefingPrompt(
  model: vscode.LanguageModelChat,
  input: CompareBriefingInput,
  token: vscode.CancellationToken
): Promise<string | undefined> {
  const tokenBudget = Math.max(1, model.maxInputTokens - COMPARE_BRIEFING_TOKEN_RESERVE);
  let diffChars = Math.min(input.diff.length, MAX_COMPARE_BRIEFING_DIFF_CHARS);

  while (true) {
    const prompt = buildCompareBriefingPrompt(input, diffChars);
    if (await model.countTokens(prompt, token) <= tokenBudget) {
      return prompt;
    }
    if (diffChars === 0) {
      return undefined;
    }
    diffChars = diffChars <= MIN_COMPARE_BRIEFING_DIFF_CHARS
      ? 0
      : Math.max(MIN_COMPARE_BRIEFING_DIFF_CHARS, Math.floor(diffChars * 0.7));
  }
}

function toLanguageModelFailure(error: unknown): CompareBriefingGenerationResult {
  if (!(error instanceof vscode.LanguageModelError)) {
    throw error;
  }

  switch (error.code) {
    case 'NoPermissions':
      return {
        status: 'unavailable',
        message: 'AI Briefing was not generated because language model access was not granted.'
      };
    case 'Blocked':
      return {
        status: 'unavailable',
        message: 'AI Briefing is temporarily unavailable because the model quota or access is blocked.'
      };
    case 'NotFound':
      return {
        status: 'unavailable',
        message: 'The selected language model is no longer available. Try generating the briefing again.'
      };
    default:
      return {
        status: 'unavailable',
        message: 'The language model could not generate an AI briefing.'
      };
  }
}
