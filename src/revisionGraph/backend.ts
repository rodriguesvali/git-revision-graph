import { Repository } from '../git';
import { RevisionGraphViewReference, RevisionLogSource } from '../revisionGraphTypes';
import { RevisionGraphProjectionOptions } from './model/commitGraphTypes';
import { RevisionGraphSnapshot } from './source/graphSnapshot';
import { RevisionGraphLoadTraceSink } from './loadTrace';
import { DefaultRevisionGraphDocumentBackend } from './backendServices/document';
import { DefaultRevisionGraphMergeAnalysisBackend } from './backendServices/mergeAnalysis';
import { DefaultRevisionGraphSnapshotBackend } from './backendServices/snapshot';
import { DefaultRevisionLogBackend } from './backendServices/revisionLog';
import type { RevisionGraphDocumentBackend } from './backendServices/document';
import type { RevisionGraphMergeAnalysisBackend } from './backendServices/mergeAnalysis';
import type { RevisionGraphLimitPolicy, RevisionGraphSnapshotBackend, RevisionGraphSnapshotLoadContext } from './backendServices/snapshot';
import type { RevisionGraphLogBackend, RevisionLogChangesBackend } from './backendServices/revisionLog';

export type { RevisionGraphDocumentBackend } from './backendServices/document';
export type { RevisionGraphMergeAnalysisBackend } from './backendServices/mergeAnalysis';
export type { RevisionGraphLimitPolicy, RevisionGraphSnapshotBackend } from './backendServices/snapshot';
export type { RevisionGraphLogBackend, RevisionLogChangesBackend } from './backendServices/revisionLog';
export { getMergeBlockedTargetsFromGraph } from './backendServices/mergeAnalysis';

export type RevisionGraphStateBackend = RevisionGraphSnapshotBackend & RevisionGraphMergeAnalysisBackend;

export interface RevisionGraphBackend extends
  RevisionGraphSnapshotBackend,
  RevisionGraphLogBackend,
  RevisionGraphDocumentBackend,
  RevisionGraphMergeAnalysisBackend {}

export interface ShowLogBackend extends RevisionLogChangesBackend {}

export class DefaultRevisionGraphBackend implements RevisionGraphBackend, ShowLogBackend {
  constructor(
    private readonly snapshotBackend: RevisionGraphSnapshotBackend = new DefaultRevisionGraphSnapshotBackend(),
    private readonly revisionLogBackend: RevisionGraphLogBackend & RevisionLogChangesBackend = new DefaultRevisionLogBackend(),
    private readonly documentBackend: RevisionGraphDocumentBackend = new DefaultRevisionGraphDocumentBackend(),
    private readonly mergeAnalysisBackend: RevisionGraphMergeAnalysisBackend = new DefaultRevisionGraphMergeAnalysisBackend()
  ) {}

  async loadGraphSnapshot(
    repository: Repository,
    options: RevisionGraphProjectionOptions,
    limitPolicy: RevisionGraphLimitPolicy,
    signal?: AbortSignal,
    trace?: RevisionGraphLoadTraceSink,
    context?: RevisionGraphSnapshotLoadContext
  ): Promise<RevisionGraphSnapshot> {
    return this.snapshotBackend.loadGraphSnapshot(repository, options, limitPolicy, signal, trace, context);
  }

  clearGraphSnapshotCache(): void {
    this.snapshotBackend.clearGraphSnapshotCache?.();
  }

  async loadRevisionLog(
    repository: Repository,
    source: RevisionLogSource,
    limit: number,
    skip = 0,
    showAllBranches?: boolean,
    filterText?: string,
    signal?: AbortSignal
  ): ReturnType<RevisionGraphLogBackend['loadRevisionLog']> {
    return this.revisionLogBackend.loadRevisionLog(
      repository,
      source,
      limit,
      skip,
      showAllBranches,
      filterText,
      signal
    );
  }

  async loadRevisionLogChanges(
    repository: Repository,
    commitHash: string,
    parentHash?: string
  ): ReturnType<RevisionLogChangesBackend['loadRevisionLogChanges']> {
    return this.revisionLogBackend.loadRevisionLogChanges(repository, commitHash, parentHash);
  }

  async loadUnifiedDiff(repository: Repository, left: string, right: string): Promise<string> {
    return this.documentBackend.loadUnifiedDiff(repository, left, right);
  }

  async loadCommitDetails(repository: Repository, commitHash: string): Promise<string> {
    return this.documentBackend.loadCommitDetails(repository, commitHash);
  }

  async getMergeBlockedTargets(
    repository: Repository,
    snapshot: RevisionGraphSnapshot,
    currentHeadName: string | undefined,
    visibleReferences: readonly RevisionGraphViewReference[],
    signal?: AbortSignal
  ): Promise<string[]> {
    return this.mergeAnalysisBackend.getMergeBlockedTargets(
      repository,
      snapshot,
      currentHeadName,
      visibleReferences,
      signal
    );
  }
}

export function createRevisionGraphBackend(): RevisionGraphBackend & ShowLogBackend {
  return new DefaultRevisionGraphBackend();
}
