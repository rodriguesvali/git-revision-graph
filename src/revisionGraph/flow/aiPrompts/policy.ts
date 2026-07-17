import { findFlowTransitionRule } from '../flowTransitionPolicy';
import type { FlowBranchKind } from '../flowTypes';
import type {
  FlowAiPromptContextSource,
  FlowAiPullRequestPromptContext,
  FlowAiPullRequestPromptKind
} from './types';

export type FlowAiPullRequestPromptProfile = Pick<
  FlowAiPullRequestPromptContext,
  'transition' | 'sourceKind' | 'targetKind' | 'promptKind' | 'contextSource'
>;

export function resolveFlowAiPullRequestPromptProfile(
  sourceKind: FlowBranchKind,
  targetKind: FlowBranchKind
): FlowAiPullRequestPromptProfile | undefined {
  const transition = findFlowTransitionRule(sourceKind, targetKind)?.id;
  if (!transition) return undefined;

  const promptKind = resolvePromptKind(sourceKind);
  return {
    transition,
    sourceKind,
    targetKind,
    promptKind,
    contextSource: resolveContextSource(promptKind)
  };
}

function resolvePromptKind(sourceKind: FlowBranchKind): FlowAiPullRequestPromptKind {
  if (sourceKind === 'bug') return 'defect';
  if (sourceKind === 'hotfix') return 'hotfix';
  if (sourceKind === 'release') return 'release';
  if (sourceKind === 'sync') return 'synchronization';
  return 'delivery';
}

function resolveContextSource(promptKind: FlowAiPullRequestPromptKind): FlowAiPromptContextSource {
  return promptKind === 'delivery' || promptKind === 'release'
    ? 'project-document-diff'
    : 'code-diff';
}
