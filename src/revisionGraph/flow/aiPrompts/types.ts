export type FlowAiBranchTextSurface = 'release' | 'feature' | 'task' | 'bug' | 'hotfix';
export type FlowAiTextSurface = FlowAiBranchTextSurface;
export type FlowAiTextField = 'description';

export interface FlowAiTextImprovementInput {
  readonly surface: FlowAiBranchTextSurface;
  readonly field: 'description';
  readonly sourceRefName: string;
  readonly branchName: string;
  readonly text: string;
}
