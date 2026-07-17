import * as vscode from 'vscode';

import {
  normalizeFlowAiTextImprovementOutput,
  type FlowAiTextImprover,
  type FlowAiTextImprovementResult
} from './revisionGraph/flow/aiTextAssistant';
import { selectFittedFlowAiTextPrompt } from './revisionGraph/flow/aiTextPromptFitting';

export function createWorkbenchAiFlowTextImprover(): FlowAiTextImprover {
  return {
    async improve(input, token) {
      try {
        const models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
        if (token.isCancellationRequested) return { status: 'cancelled' };
        if (models.length === 0) {
          return {
            status: 'unavailable',
            message: 'No Copilot language model is currently available for AI text improvement.'
          };
        }

        const fitted = await selectFittedFlowAiTextPrompt(models, input, token);
        if (token.isCancellationRequested) return { status: 'cancelled' };
        if (!fitted) {
          return {
            status: 'unavailable',
            message: 'The required form content is too large for the available Copilot language models.'
          };
        }

        const response = await fitted.model.sendRequest(
          [vscode.LanguageModelChatMessage.User(fitted.prompt)],
          { justification: 'Improve user-selected Pull Request or release form text.' },
          token
        );
        let content = '';
        for await (const chunk of response.text) {
          if (token.isCancellationRequested) return { status: 'cancelled' };
          content += chunk;
        }

        const normalized = normalizeFlowAiTextImprovementOutput(input.field, content);
        return normalized
          ? { status: 'ready', content: normalized }
          : { status: 'unavailable', message: 'The language model returned empty improved text.' };
      } catch (error) {
        if (token.isCancellationRequested) return { status: 'cancelled' };
        return toFlowLanguageModelFailure(error);
      }
    }
  };
}

function toFlowLanguageModelFailure(error: unknown): FlowAiTextImprovementResult {
  if (!(error instanceof vscode.LanguageModelError)) throw error;
  switch (error.code) {
    case 'NoPermissions':
      return { status: 'unavailable', message: 'AI text was not improved because language model access was not granted.' };
    case 'Blocked':
      return { status: 'unavailable', message: 'AI text improvement is temporarily unavailable because model access is blocked.' };
    case 'NotFound':
      return { status: 'unavailable', message: 'The selected language model is no longer available. Try again.' };
    default:
      return { status: 'unavailable', message: 'The language model could not improve this text.' };
  }
}
