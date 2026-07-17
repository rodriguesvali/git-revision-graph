import { buildPullRequestPrompt } from './shared';
import type { FlowAiTextImprovementInput } from './types';

type PullRequestInput = Extract<FlowAiTextImprovementInput, { readonly surface: 'pull-request' }>;

export function buildDefectPullRequestPrompt(input: PullRequestInput): string {
  return buildPullRequestPrompt(input, 'bug-fix Pull Request description', [
    'Ground the description in the supplied code diff and persisted source description.',
    'Use the headings Summary, Problem, Root cause, Fix, Verification, and Regression risk.',
    'State a root cause only when the supplied evidence demonstrates it; otherwise state that it is not established.',
    'Distinguish implemented tests from suggested verification and do not claim that tests passed without evidence.'
  ], true);
}
