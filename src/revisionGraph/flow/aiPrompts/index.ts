import { buildDefectPullRequestPrompt } from './defect';
import { buildDeliveryPullRequestPrompt } from './delivery';
import { buildHotfixPullRequestPrompt } from './hotfix';
import { buildPullRequestTitlePrompt } from './pullRequestTitle';
import { buildReleasePullRequestPrompt } from './release';
import { buildReleaseDescriptionPrompt } from './shared';
import { buildSynchronizationPullRequestPrompt } from './synchronization';
import type { FlowAiTextImprovementInput } from './types';

export function buildFlowAiPrompt(input: FlowAiTextImprovementInput): string {
  if (input.surface === 'release') return buildReleaseDescriptionPrompt(input);
  if (input.field === 'title') return buildPullRequestTitlePrompt(input);

  switch (input.promptContext?.promptKind) {
    case 'defect':
      return buildDefectPullRequestPrompt(input);
    case 'hotfix':
      return buildHotfixPullRequestPrompt(input);
    case 'release':
      return buildReleasePullRequestPrompt(input);
    case 'synchronization':
      return buildSynchronizationPullRequestPrompt(input);
    case 'delivery':
    default:
      return buildDeliveryPullRequestPrompt(input);
  }
}
