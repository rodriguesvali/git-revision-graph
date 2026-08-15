import { buildFlowBranchDescriptionPrompt } from './shared';
import type { FlowAiTextImprovementInput } from './types';

export function buildFlowAiPrompt(input: FlowAiTextImprovementInput): string {
  if (input.surface === 'pull-request') {
    throw new Error('Pull Request text improvement is no longer supported.');
  }
  return buildFlowBranchDescriptionPrompt(input);
}
