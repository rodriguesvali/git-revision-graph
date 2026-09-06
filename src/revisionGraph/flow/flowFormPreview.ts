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
): Pick<RevisionGraphProtocol.FlowFormPreview, 'status' | 'text' | 'summary'> {
  if (action.type === 'start-flow-branch') {
    const name = resolveFlowBranchName(action.branchKind, action.name, config);
    const availability = describeNameAvailability(name.branchName, findCollision);
    return {
      status: name.ok && availability.status === 'ready' ? 'ready' : 'unavailable',
      summary: {
        branchName: name.branchName ?? 'Enter a branch name',
        context: `From: ${action.sourceRefName}`,
        effects: 'Creates locally and switches to the new branch.\nYou’ll be asked whether to publish.',
        ...describeSummaryValidation(name.ok ? availability : { status: 'unavailable', text: name.message ?? 'Enter a branch name.' }, !action.name.trim()),
        details: name.ok ? 'Checks known local and remote-tracking branches only. Availability is checked again on submission; remote permissions are not checked.' : describeNameExample(action.branchKind, config)
      },
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
): Pick<RevisionGraphProtocol.FlowFormPreview, 'status' | 'text' | 'summary'> {
  const name = resolveFlowEqualizationBranchName(action.targetRefName, config);
  const issue = name.ok ? validateGitBranchName(name.branchName) : name.message;
  const availability = describeNameAvailability(name.ok ? name.branchName : undefined, findCollision);
  return {
    status: name.ok && !issue && availability.status === 'ready' ? 'ready' : 'unavailable',
    summary: {
      branchName: name.ok && !issue ? name.branchName : 'Name unavailable',
      context: `Base: ${action.targetRefName}\nMerge from: ${action.originRefName}`,
      effects: 'Creates locally and switches to the new branch.\nMerges the origin; no automatic push.',
      ...describeSummaryValidation(issue ? { status: 'unavailable', text: issue } : availability, false),
      details: 'Checks known local and remote-tracking branches only. Availability is checked again on submission; remote permissions are not checked.'
    },
    text: `Origin to merge: ${action.originRefName}\nTarget / base branch: ${action.targetRefName}\n`
      + `Expected branch: ${name.ok && !issue ? name.branchName : '—'}\n`
      + 'Create and check out a local branch from the target, then merge the origin into the new branch. No automatic push.\n'
      + (issue || availability.text)
  };
}

function describeNameAvailability(
  name: string | undefined,
  findCollision?: (name: string) => FlowBranchNameCollision | undefined
): Pick<RevisionGraphProtocol.FlowFormPreview, 'status' | 'text' | 'summary'> {
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

function describeSummaryValidation(
  result: Pick<RevisionGraphProtocol.FlowFormPreview, 'status' | 'text'>,
  incomplete: boolean
): Pick<RevisionGraphProtocol.FlowPreviewSummary, 'validation' | 'validationState'> {
  if (incomplete) return { validation: 'Complete the name to check for conflicts.', validationState: 'neutral' };
  return result.status === 'ready'
    ? { validation: 'No conflicts in known branches', validationState: 'valid' }
    : { validation: result.text, validationState: 'invalid' };
}
