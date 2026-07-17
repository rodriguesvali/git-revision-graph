import { buildPullRequestPrompt } from './shared';
import type { FlowAiTextImprovementInput } from './types';

type PullRequestInput = Extract<FlowAiTextImprovementInput, { readonly surface: 'pull-request' }>;

export function buildPullRequestTitlePrompt(input: PullRequestInput): string {
  const focus = input.promptContext?.promptKind === 'defect'
    ? 'Describe the corrected defect and outcome.'
    : input.promptContext?.promptKind === 'hotfix'
      ? 'Describe the urgent production correction and outcome.'
      : input.promptContext?.promptKind === 'synchronization'
        ? 'Describe the synchronization purpose and destination.'
        : 'Describe the delivered value and destination.';
  return buildPullRequestPrompt(input, 'Pull Request title', [
    'Return one concise line with no Markdown prefix.',
    focus
  ], false);
}
