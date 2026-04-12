import { Repository } from '../../git';
import {
  buildPrimaryAncestorPaths,
  buildRevisionGraphScene,
  projectDecoratedCommitGraph,
  RevisionGraphProjectionOptions
} from '../../revisionGraphData';
import { renderRevisionGraphHtml } from '../../revisionGraphWebview';
import {
  formatUpstreamLabel,
  getMergeBlockedTargets,
  hasWorkspaceChanges,
  loadSnapshotForGraph
} from './shared';

export async function buildRevisionGraphViewHtml(
  repository: Repository,
  projectionOptions: RevisionGraphProjectionOptions,
  autoArrangeOnInit: boolean
): Promise<string> {
  const snapshot = await loadSnapshotForGraph(repository, projectionOptions);
  const projection = projectDecoratedCommitGraph(snapshot.graph, projectionOptions);
  const scene = await buildRevisionGraphScene(snapshot.graph, projection);
  const primaryAncestorPaths = buildPrimaryAncestorPaths(snapshot.graph, scene);
  const mergeBlockedTargets = await getMergeBlockedTargets(
    repository,
    repository.state.HEAD?.name,
    scene
  );

  return renderRevisionGraphHtml(
    scene,
    repository.state.HEAD?.name,
    repository.state.HEAD?.upstream
      ? formatUpstreamLabel(repository.state.HEAD.upstream.remote, repository.state.HEAD.upstream.name)
      : undefined,
    hasWorkspaceChanges(repository),
    projectionOptions,
    mergeBlockedTargets,
    primaryAncestorPaths,
    autoArrangeOnInit
  );
}
