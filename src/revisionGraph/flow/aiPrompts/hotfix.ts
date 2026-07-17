import { buildPullRequestPrompt } from './shared';
import type { FlowAiTextImprovementInput } from './types';

type PullRequestInput = Extract<FlowAiTextImprovementInput, { readonly surface: 'pull-request' }>;

export function buildHotfixPullRequestPrompt(input: PullRequestInput): string {
  return buildPullRequestPrompt(input, 'hotfix Pull Request description', [
    'Ground the description in the supplied code diff and persisted source description.',
    'Use the headings Summary, Production impact, Emergency fix, Verification, and Risk and rollback.',
    'Describe urgency, production impact, and rollback only when supplied evidence supports them.',
    'Distinguish implemented tests from suggested verification and do not claim that tests passed without evidence.'
  ], true);
}
