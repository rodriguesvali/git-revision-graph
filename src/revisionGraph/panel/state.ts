import { Repository } from '../../git';
import { RevisionGraphBackend, RevisionGraphLimitPolicy } from '../backend';
import {
  buildPrimaryAncestorPaths,
  buildRevisionGraphScene,
  projectDecoratedCommitGraph
} from '../../revisionGraphData';
import {
  RevisionGraphViewReference,
  RevisionGraphViewState
} from '../../revisionGraphTypes';
import {
  buildNodeLayouts,
  createReferenceId,
  GRAPH_PADDING_BOTTOM,
  GRAPH_PADDING_TOP,
  NODE_PADDING_X,
  ROW_HEIGHT
} from '../webview/shared';
import { formatUpstreamLabel, hasWorkspaceChanges } from '../../gitState';

export async function buildReadyRevisionGraphViewState(
  repository: Repository,
  projectionOptions: RevisionGraphViewState['projectionOptions'],
  autoArrangeOnInit: boolean,
  backend: RevisionGraphBackend,
  limitPolicy: RevisionGraphLimitPolicy
): Promise<RevisionGraphViewState> {
  const snapshot = await backend.loadGraphSnapshot(repository, projectionOptions, limitPolicy);
  const projection = projectDecoratedCommitGraph(snapshot.graph, projectionOptions);
  const scene = await buildRevisionGraphScene(snapshot.graph, projection);
  const primaryAncestorPaths = buildPrimaryAncestorPaths(snapshot.graph, scene);
  const nodeLayouts = buildNodeLayouts(scene);
  const references = scene.nodes.flatMap((node) =>
    node.refs.map<RevisionGraphViewReference>((ref) => ({
      id: createReferenceId(node.hash, ref.kind, ref.name),
      hash: node.hash,
      name: ref.name,
      kind: ref.kind,
      title: ref.name
    }))
  );
  const mergeBlockedTargets = await backend.getMergeBlockedTargets(
    repository,
    snapshot,
    repository.state.HEAD?.name,
    references
  );
  const baseCanvasWidth = Math.max(
    880,
    nodeLayouts.reduce((max, node) => Math.max(max, node.defaultLeft + node.width + NODE_PADDING_X), 0)
  );
  const baseCanvasHeight = Math.max(
    480,
    scene.rowCount * ROW_HEIGHT + GRAPH_PADDING_TOP + GRAPH_PADDING_BOTTOM
  );

  return {
    viewMode: 'ready',
    hasRepositories: true,
    repositoryPath: repository.rootUri.fsPath,
    currentHeadName: repository.state.HEAD?.name,
    currentHeadUpstreamName: repository.state.HEAD?.upstream
      ? formatUpstreamLabel(repository.state.HEAD.upstream.remote, repository.state.HEAD.upstream.name)
      : undefined,
    isWorkspaceDirty: hasWorkspaceChanges(repository),
    projectionOptions,
    mergeBlockedTargets,
    primaryAncestorPathsByHash: primaryAncestorPaths,
    autoArrangeOnInit,
    scene,
    nodeLayouts,
    references,
    sceneLayoutKey: scene.nodes.map((node) => `${node.hash}:${node.row}:${Math.round(node.x)}`).join('|'),
    baseCanvasWidth,
    baseCanvasHeight,
    emptyMessage: undefined,
    loading: false,
    loadingLabel: undefined,
    errorMessage: undefined
  };
}

export function buildEmptyRevisionGraphViewState(
  hasRepositories: boolean,
  projectionOptions: RevisionGraphViewState['projectionOptions']
): RevisionGraphViewState {
  return {
    viewMode: 'empty',
    hasRepositories,
    repositoryPath: undefined,
    currentHeadName: undefined,
    currentHeadUpstreamName: undefined,
    isWorkspaceDirty: false,
    projectionOptions,
    mergeBlockedTargets: [],
    primaryAncestorPathsByHash: {},
    autoArrangeOnInit: false,
    scene: {
      nodes: [],
      edges: [],
      laneCount: 1,
      rowCount: 1
    },
    nodeLayouts: [],
    references: [],
    sceneLayoutKey: 'empty',
    baseCanvasWidth: 880,
    baseCanvasHeight: 480,
    emptyMessage: hasRepositories
      ? 'Choose a repository from the view toolbar to load the revision graph.'
      : 'Open a workspace with a Git repository to view the revision graph.',
    loading: false,
    loadingLabel: undefined,
    errorMessage: undefined
  };
}
