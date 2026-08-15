import { throwIfAborted } from '../../errors';
import type { Repository } from '../../git';
import type { RevisionGraphViewReference } from '../../revisionGraphTypes';
import type { RevisionGraphStateBackend } from '../backend';
import type {
  FlowGovernanceSettings,
  FlowGovernanceViewState
} from '../flow';
import { loadFlowGovernanceViewState } from '../flow';
import {
  nowMs,
  RevisionGraphLoadTraceSink,
  traceDuration
} from '../loadTrace';
import { loadGitBranchDescriptions } from '../repository/branchDescriptions';
import type { RevisionGraphSnapshot } from '../source/graphSnapshot';

export interface RevisionGraphReadyStateMetadataContext {
  readonly flowGovernanceSettings?: FlowGovernanceSettings;
  readonly branchDescriptions?: ReadonlyMap<string, string>;
}

export interface RevisionGraphReadyStateMetadata {
  readonly mergeBlockedTargets: readonly string[];
  readonly flowGovernance: FlowGovernanceViewState | undefined;
  readonly branchDescriptions: ReadonlyMap<string, string>;
}

export async function loadRevisionGraphReadyStateMetadata(
  repository: Repository,
  backend: RevisionGraphStateBackend,
  snapshot: RevisionGraphSnapshot,
  references: readonly RevisionGraphViewReference[],
  signal?: AbortSignal,
  trace?: RevisionGraphLoadTraceSink,
  context?: RevisionGraphReadyStateMetadataContext
): Promise<RevisionGraphReadyStateMetadata> {
  const branchRefNames = references
    .filter((ref) => ref.kind === 'head' || ref.kind === 'branch')
    .map((ref) => ref.name);

  const mergeBlockedStartedAt = nowMs();
  const mergeBlockedTargetsPromise = loadTracedMetadata(
    trace,
    'state.mergeBlockedTargets',
    mergeBlockedStartedAt,
    () => backend.getMergeBlockedTargets(
      repository,
      snapshot,
      repository.state.HEAD?.name,
      references,
      signal
    ),
    (targets) => `references=${references.length}; blocked=${targets.length}`
  );

  const flowGovernanceStartedAt = nowMs();
  const flowGovernancePromise = loadTracedMetadata(
    trace,
    'state.flowGovernance',
    flowGovernanceStartedAt,
    () => loadFlowGovernanceViewState(
      repository.rootUri.fsPath,
      branchRefNames,
      context?.flowGovernanceSettings
    ),
    (flowGovernance) =>
      `enabled=${flowGovernance?.enabled === true}; source=${flowGovernance?.configSource ?? 'disabled'}`
  );

  const branchDescriptionsStartedAt = nowMs();
  const branchDescriptionsPromise = loadTracedMetadata(
    trace,
    'state.branchDescriptions',
    branchDescriptionsStartedAt,
    () => context?.branchDescriptions
      ?? loadGitBranchDescriptions(repository.rootUri.fsPath, signal),
    (branchDescriptions) => `entries=${branchDescriptions.size}`
  );

  const [mergeBlockedTargets, flowGovernance, branchDescriptions] = await Promise.all([
    mergeBlockedTargetsPromise,
    flowGovernancePromise,
    branchDescriptionsPromise
  ]);
  throwIfAborted(signal, 'The revision graph load was aborted.');

  return { mergeBlockedTargets, flowGovernance, branchDescriptions };
}

async function loadTracedMetadata<T>(
  trace: RevisionGraphLoadTraceSink | undefined,
  phase: string,
  startedAt: number,
  load: () => T | PromiseLike<T>,
  describe: (value: T) => string
): Promise<T> {
  const value = await load();
  traceDuration(trace, phase, startedAt, describe(value));
  return value;
}
