import { buildPullRequestPrompt } from './shared';
import type { FlowAiTextImprovementInput } from './types';

type PullRequestInput = Extract<FlowAiTextImprovementInput, { readonly surface: 'pull-request' }>;

export function buildReleasePullRequestPrompt(input: PullRequestInput): string {
  return buildPullRequestPrompt(input, 'release promotion Pull Request description', [
    'Ground the description in the supplied release and project-document changes.',
    'Use the headings Summary, Included changes, Verification, and Risks.',
    'Include only documented release facts. If verification or risks are not documented, state that explicitly.',
    'Do not merely restate the source and target refs.'
  ], true);
}
