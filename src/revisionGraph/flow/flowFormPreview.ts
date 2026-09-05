import { validateGitBranchName } from '../../refActions/branchValidation';
import { resolveFlowBranchName } from './flowReleaseBranch';
import { resolveFlowEqualizationBranchName } from './flowEqualizationNaming';
import type { NormalizedFlowConfig } from './flowTypes';

/** Read-only preview using the same naming rules as branch creation. */
export function describeFlowFormPreview(
  action: RevisionGraphProtocol.FlowFormPreviewAction,
  config: NormalizedFlowConfig
): Pick<RevisionGraphProtocol.FlowFormPreview, 'status' | 'text'> {
  if (action.type === 'start-flow-branch') {
    const name = resolveFlowBranchName(action.branchKind, action.name, config);
    return {
      status: name.ok ? 'ready' : 'unavailable',
      text: `Source branch: ${action.sourceRefName}\nExpected branch: ${name.branchName ?? '—'}\n`
        + 'Create a local branch from the source and check it out. Publishing is offered after creation.\n'
        + (name.ok ? 'Branch availability is checked when you submit.' : name.message ?? 'Enter a branch name.')
    };
  }
  const name = resolveFlowEqualizationBranchName(action.targetRefName, config);
  const issue = name.ok ? validateGitBranchName(name.branchName) : name.message;
  return {
    status: name.ok && !issue ? 'ready' : 'unavailable',
    text: `Origin to merge: ${action.originRefName}\nTarget / base branch: ${action.targetRefName}\n`
      + `Expected branch: ${name.ok && !issue ? name.branchName : '—'}\n`
      + 'Create and check out a local branch from the target, then merge the origin into the new branch. No automatic push.\n'
      + (issue || 'Branch availability is checked when you submit.')
  };
}
