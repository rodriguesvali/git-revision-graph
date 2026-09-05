import { formatFlowBranchNameCollision, type FlowBranchNameCollision } from './flowBranchNameCollision';
import { validateGitBranchName } from '../../refActions/branchValidation';
import { resolveFlowBranchName } from './flowReleaseBranch';
import { resolveFlowEqualizationBranchName } from './flowEqualizationNaming';
import type { NormalizedFlowConfig } from './flowTypes';

/** Read-only preview using the same naming rules as branch creation. */
export function describeFlowFormPreview(
  action: RevisionGraphProtocol.FlowFormPreviewAction,
  config: NormalizedFlowConfig,
  findCollision?: (name: string) => FlowBranchNameCollision | undefined
): Pick<RevisionGraphProtocol.FlowFormPreview, 'status' | 'text'> {
  if (action.type === 'start-flow-branch') {
    const name = resolveFlowBranchName(action.branchKind, action.name, config);
    const availability = describeNameAvailability(name.branchName, findCollision);
    return {
      status: name.ok && availability.status === 'ready' ? 'ready' : 'unavailable',
      text: `Source branch: ${action.sourceRefName}\nExpected branch: ${name.branchName ?? '—'}\n`
        + 'Create a local branch from the source and check it out. Publishing is offered after creation.\n'
        + (name.ok ? availability.text : `${name.message ?? 'Enter a branch name.'}\n${describeNameExample(action.branchKind, config)}`)
    };
  }
  return describeEqualizationPreview(action, config, findCollision);
}

function describeEqualizationPreview(
  action: Extract<RevisionGraphProtocol.FlowFormPreviewAction, { type: 'prepare-flow-equalization' }>,
  config: NormalizedFlowConfig,
  findCollision?: (name: string) => FlowBranchNameCollision | undefined
): Pick<RevisionGraphProtocol.FlowFormPreview, 'status' | 'text'> {
  const name = resolveFlowEqualizationBranchName(action.targetRefName, config);
  const issue = name.ok ? validateGitBranchName(name.branchName) : name.message;
  const availability = describeNameAvailability(name.ok ? name.branchName : undefined, findCollision);
  return {
    status: name.ok && !issue && availability.status === 'ready' ? 'ready' : 'unavailable',
    text: `Origin to merge: ${action.originRefName}\nTarget / base branch: ${action.targetRefName}\n`
      + `Expected branch: ${name.ok && !issue ? name.branchName : '—'}\n`
      + 'Create and check out a local branch from the target, then merge the origin into the new branch. No automatic push.\n'
      + (issue || availability.text)
  };
}

function describeNameAvailability(
  name: string | undefined,
  findCollision?: (name: string) => FlowBranchNameCollision | undefined
): Pick<RevisionGraphProtocol.FlowFormPreview, 'status' | 'text'> {
  const collision = name && findCollision ? findCollision(name) : undefined;
  if (collision && name) return { status: 'unavailable', text: formatFlowBranchNameCollision(name, collision) };
  return { status: 'ready', text: findCollision
    ? 'No conflict in known local or remote-tracking branches. Availability is checked again when you submit.'
    : 'Branch availability is checked when you submit.' };
}

function describeNameExample(
  kind: Extract<RevisionGraphProtocol.FlowFormPreviewAction, { type: 'start-flow-branch' }>['branchKind'],
  config: NormalizedFlowConfig
): string {
  const candidate = kind === 'release' || kind === 'package' ? '1.7.1' : '42-payment';
  const example = resolveFlowBranchName(kind, candidate, config);
  return example.ok ? `Example branch: ${example.branchName}` : `Required pattern: ${config.patterns[kind]}`;
}
