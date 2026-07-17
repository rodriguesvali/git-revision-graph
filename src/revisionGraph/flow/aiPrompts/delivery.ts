import { buildPullRequestPrompt } from './shared';
import type { FlowAiTextImprovementInput } from './types';

type PullRequestInput = Extract<FlowAiTextImprovementInput, { readonly surface: 'pull-request' }>;

export function buildDeliveryPullRequestPrompt(input: PullRequestInput): string {
  return buildPullRequestPrompt(input, 'Pull Request description', [
    'Write a useful delivery description grounded in the supplied project-document diff.',
    'Use the headings Summary, Key changes, and Verification with concise bullets where useful.',
    'Include only documented delivery facts. If verification is not documented, state that explicitly.',
    'Do not merely restate the source and target refs.'
  ], true);
}
