import { buildFlowBranchDescriptionPrompt } from './shared';
import type { FlowAiTextImprovementInput } from './types';

export function buildFlowAiPrompt(input: FlowAiTextImprovementInput): string {
  return buildFlowBranchDescriptionPrompt(input);
}
