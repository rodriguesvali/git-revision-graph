import { buildPullRequestPrompt } from './shared';
import type { FlowAiTextImprovementInput } from './types';

type PullRequestInput = Extract<FlowAiTextImprovementInput, { readonly surface: 'pull-request' }>;

export function buildSynchronizationPullRequestPrompt(input: PullRequestInput): string {
  return buildPullRequestPrompt(input, 'synchronization Pull Request description', [
    'Ground the description in the supplied code diff and persisted source description.',
    'Use the headings Summary, Synchronization changes, Conflict and regression risks, and Verification.',
    'Explain the resulting alignment without claiming conflicts or verification that are not evidenced.'
  ], true);
}
