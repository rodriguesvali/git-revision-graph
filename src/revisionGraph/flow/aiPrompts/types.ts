export type FlowAiBranchTextSurface = 'release' | 'feature' | 'task' | 'bug' | 'hotfix';
export type FlowAiTextSurface = 'pull-request' | FlowAiBranchTextSurface;
export type FlowAiTextField = 'title' | 'description';
export type FlowAiPullRequestPromptKind = 'delivery' | 'defect' | 'hotfix' | 'release' | 'synchronization';
export type FlowAiPromptContextSource = 'project-document-diff' | 'code-diff';
export interface FlowAiPullRequestPromptContext {
  readonly transition: FlowTransitionRuleId;
  readonly sourceKind: FlowBranchKind;
  readonly targetKind: FlowBranchKind;
  readonly promptKind: FlowAiPullRequestPromptKind;
  readonly contextSource: FlowAiPromptContextSource;
  readonly sourceDescription?: string;
  readonly content?: string;
  readonly contentWasOmitted?: boolean;
}

export type FlowAiTextImprovementInput = {
  readonly surface: 'pull-request';
  readonly field: FlowAiTextField;
  readonly sourceRefName: string;
  readonly targetRefName: string;
  readonly title: string;
  readonly description: string;
  readonly promptContext?: FlowAiPullRequestPromptContext;
} | {
  readonly surface: FlowAiBranchTextSurface;
  readonly field: 'description';
  readonly sourceRefName: string;
  readonly branchName: string;
  readonly text: string;
};
import type { FlowBranchKind, FlowTransitionRuleId } from '../flowTypes';
