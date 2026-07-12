interface RevisionGraphWebviewRuntimeStateModel {
  readonly state: RevisionGraphWebviewHostState;
  readonly currentHeadName: string | null;
  readonly currentHeadUpstreamName: string | null;
  readonly publishedLocalBranchNames: readonly string[];
  readonly isWorkspaceDirty: boolean;
  readonly hasMergeConflicts: boolean;
  readonly hasConflictedMerge: boolean;
  readonly projectionOptions: RevisionGraphWebviewProjectionOptions;
  readonly flowGovernance: Record<string, unknown> | null;
  readonly mergeBlockedTargets: readonly string[];
  readonly references: readonly RevisionGraphWebviewHostReference[];
  readonly graphNodes: readonly Record<string, unknown>[];
  readonly graphEdges: readonly Record<string, unknown>[];
  readonly primaryAncestorNextByHash: Readonly<Record<string, string>>;
  readonly sceneLayoutKey: string;
  readonly baseCanvasWidth: number;
  readonly baseCanvasHeight: number;
}

function createRevisionGraphWebviewRuntimeStateModel(
  state: RevisionGraphWebviewHostState,
  fallbackProjectionOptions: RevisionGraphWebviewProjectionOptions
): RevisionGraphWebviewRuntimeStateModel {
  return {
    state,
    currentHeadName: state.currentHeadName ?? null,
    currentHeadUpstreamName: state.currentHeadUpstreamName ?? null,
    publishedLocalBranchNames: state.publishedLocalBranchNames,
    isWorkspaceDirty: state.isWorkspaceDirty,
    hasMergeConflicts: state.hasMergeConflicts,
    hasConflictedMerge: state.hasConflictedMerge,
    projectionOptions: state.projectionOptions || fallbackProjectionOptions,
    flowGovernance: state.flowGovernance ?? null,
    mergeBlockedTargets: state.mergeBlockedTargets,
    references: state.references,
    graphNodes: state.nodeLayouts,
    graphEdges: state.scene.edges,
    primaryAncestorNextByHash: state.primaryAncestorNextByHash,
    sceneLayoutKey: state.sceneLayoutKey || 'empty',
    baseCanvasWidth: state.baseCanvasWidth || 880,
    baseCanvasHeight: state.baseCanvasHeight || 480
  };
}
