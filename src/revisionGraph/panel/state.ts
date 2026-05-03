import { createHash } from 'node:crypto';

import { Branch, Ref, RefType, Repository } from '../../git';
import { RevisionGraphBackend, RevisionGraphLimitPolicy } from '../backend';
import {
  buildPrimaryAncestorPaths,
  buildRevisionGraphScene,
  CommitGraph,
  projectDecoratedCommitGraph,
  RevisionGraphRef,
  RevisionGraphEdge,
  RevisionGraphScene
} from '../../revisionGraphData';
import { findCommitHashesByRef } from '../model/commitGraphQueries';
import { RevisionGraphSnapshot } from '../source/graphSnapshot';
import {
  RevisionGraphReferencePatch,
  RevisionGraphViewReference,
  RevisionGraphWorkspaceStatePatch,
  RevisionGraphViewState
} from '../../revisionGraphTypes';
import {
  buildNodeLayouts,
  createReferenceId,
  GRAPH_PADDING_BOTTOM,
  GRAPH_PADDING_TOP,
  NODE_PADDING_X,
  RevisionGraphNodeLayout
} from '../webview/shared';
import { formatUpstreamLabel, hasConflictedMerge, hasMergeConflicts, hasWorkspaceChanges, isPublishedLocalBranch } from '../../gitState';
import { nowMs, traceDuration, RevisionGraphLoadTraceSink } from '../loadTrace';

const REVISION_GRAPH_SCENE_LAYOUT_KEY_VERSION = 'fanout-balance-v1';

export interface ReadyRevisionGraphViewStateBundle {
  readonly snapshot: RevisionGraphSnapshot;
  readonly state: RevisionGraphViewState;
}

export interface RevisionGraphRepositoryOverlay {
  readonly refs: readonly Ref[];
  readonly currentHeadName: string | undefined;
  readonly currentHeadCommit: string | undefined;
}

export async function buildReadyRevisionGraphViewStateBundle(
  repository: Repository,
  projectionOptions: RevisionGraphViewState['projectionOptions'],
  autoArrangeOnInit: boolean,
  backend: RevisionGraphBackend,
  limitPolicy: RevisionGraphLimitPolicy,
  signal?: AbortSignal,
  trace?: RevisionGraphLoadTraceSink
): Promise<ReadyRevisionGraphViewStateBundle> {
  throwIfAborted(signal);
  const snapshot = await backend.loadGraphSnapshot(repository, projectionOptions, limitPolicy, signal, trace);
  return buildReadyRevisionGraphViewStateBundleFromSnapshot(
    repository,
    projectionOptions,
    autoArrangeOnInit,
    backend,
    snapshot,
    signal,
    trace
  );
}

export async function buildReadyRevisionGraphViewState(
  repository: Repository,
  projectionOptions: RevisionGraphViewState['projectionOptions'],
  autoArrangeOnInit: boolean,
  backend: RevisionGraphBackend,
  limitPolicy: RevisionGraphLimitPolicy,
  signal?: AbortSignal,
  trace?: RevisionGraphLoadTraceSink
): Promise<RevisionGraphViewState> {
  return (
    await buildReadyRevisionGraphViewStateBundle(
      repository,
      projectionOptions,
      autoArrangeOnInit,
      backend,
      limitPolicy,
      signal,
      trace
    )
  ).state;
}

export async function buildReadyRevisionGraphViewStateFromSnapshot(
  repository: Repository,
  projectionOptions: RevisionGraphViewState['projectionOptions'],
  autoArrangeOnInit: boolean,
  backend: RevisionGraphBackend,
  snapshot: RevisionGraphSnapshot,
  signal?: AbortSignal,
  trace?: RevisionGraphLoadTraceSink
): Promise<RevisionGraphViewState> {
  return (
    await buildReadyRevisionGraphViewStateBundleFromSnapshot(
      repository,
      projectionOptions,
      autoArrangeOnInit,
      backend,
      snapshot,
      signal,
      trace
    )
  ).state;
}

async function buildReadyRevisionGraphViewStateBundleFromSnapshot(
  repository: Repository,
  projectionOptions: RevisionGraphViewState['projectionOptions'],
  autoArrangeOnInit: boolean,
  backend: RevisionGraphBackend,
  snapshot: RevisionGraphSnapshot,
  signal?: AbortSignal,
  trace?: RevisionGraphLoadTraceSink
): Promise<ReadyRevisionGraphViewStateBundle> {
  const overlayedSnapshot = await buildGraphSnapshotWithRepositoryOverlay(
    repository,
    snapshot,
    projectionOptions,
    signal,
    trace
  );
  const state = await buildReadyRevisionGraphViewStateFromOverlayedSnapshot(
    repository,
    projectionOptions,
    autoArrangeOnInit,
    backend,
    overlayedSnapshot,
    signal,
    trace
  );

  return {
    snapshot: overlayedSnapshot,
    state
  };
}

async function buildReadyRevisionGraphViewStateFromOverlayedSnapshot(
  repository: Repository,
  projectionOptions: RevisionGraphViewState['projectionOptions'],
  autoArrangeOnInit: boolean,
  backend: RevisionGraphBackend,
  snapshot: RevisionGraphSnapshot,
  signal?: AbortSignal,
  trace?: RevisionGraphLoadTraceSink
): Promise<RevisionGraphViewState> {
  const projectionStartedAt = nowMs();
  const projection = projectDecoratedCommitGraph(snapshot.graph, projectionOptions);
  traceDuration(trace, 'state.projectGraph', projectionStartedAt, `nodes=${projection.nodes.length}; edges=${projection.edges.length}`);
  const scene = await buildRevisionGraphScene(snapshot.graph, projection, trace);
  const ancestorsStartedAt = nowMs();
  const primaryAncestorPaths = buildPrimaryAncestorPaths(snapshot.graph, scene);
  traceDuration(trace, 'state.primaryAncestorPaths', ancestorsStartedAt, `nodes=${scene.nodes.length}`);
  return buildReadyRevisionGraphViewStateFromParts(
    repository,
    projectionOptions,
    autoArrangeOnInit,
    backend,
    snapshot,
    scene,
    primaryAncestorPaths,
    signal,
    trace
  );
}

export async function buildMetadataPatchedRevisionGraphViewState(
  previousState: RevisionGraphViewState,
  repository: Repository,
  backend: RevisionGraphBackend,
  snapshot: RevisionGraphSnapshot,
  signal?: AbortSignal
): Promise<RevisionGraphViewState | undefined> {
  throwIfAborted(signal);
  if (
    previousState.viewMode !== 'ready' ||
    previousState.repositoryPath !== repository.rootUri.fsPath
  ) {
    return undefined;
  }

  const repositoryRefs = await loadRepositoryRefs(repository, signal);
  const overlay = buildRevisionGraphRepositoryOverlay(repository, repositoryRefs);
  const patchedScene = patchSceneReferences(
    previousState.scene,
    snapshot.graph,
    overlay,
    previousState.projectionOptions
  );
  if (!patchedScene) {
    return undefined;
  }

  return buildReadyRevisionGraphViewStateFromParts(
    repository,
    previousState.projectionOptions,
    false,
    backend,
    snapshot,
    patchedScene,
    previousState.primaryAncestorPathsByHash,
    signal
  );
}

export function buildRevisionGraphWorkspaceStatePatch(
  repository: Repository
): RevisionGraphWorkspaceStatePatch {
  return {
    isWorkspaceDirty: hasWorkspaceChanges(repository),
    hasMergeConflicts: hasMergeConflicts(repository),
    hasConflictedMerge: hasConflictedMerge(repository)
  };
}

export function applyRevisionGraphReferencePatch(
  state: RevisionGraphViewState,
  patch: RevisionGraphReferencePatch
): RevisionGraphViewState | undefined {
  if (state.viewMode !== 'ready') {
    return undefined;
  }

  const removeRefs = new Set(patch.removeRefs.map((ref) => `${ref.kind}\0${ref.name}`));
  if (removeRefs.size === 0) {
    return state;
  }

  const scene = {
    ...state.scene,
    nodes: state.scene.nodes.map((node) => ({
      ...node,
      refs: node.refs.filter((ref) => !removeRefs.has(`${ref.kind}\0${ref.name}`))
    }))
  };
  const nodeLayouts = buildNodeLayouts(scene);
  const references = buildViewReferences(scene);

  return {
    ...state,
    scene,
    nodeLayouts,
    references,
    publishedLocalBranchNames: state.publishedLocalBranchNames.filter((name) => !removeRefs.has(`branch\0${name}`)),
    mergeBlockedTargets: state.mergeBlockedTargets.filter((target) =>
      !patch.removeRefs.some((ref) => target === `${ref.kind}::${ref.name}`)
    ),
    sceneLayoutKey: buildRevisionGraphSceneLayoutKey(nodeLayouts, scene.edges),
    baseCanvasWidth: Math.max(
      880,
      nodeLayouts.reduce((max, node) => Math.max(max, node.defaultLeft + node.width + NODE_PADDING_X), 0)
    ),
    baseCanvasHeight: Math.max(
      480,
      nodeLayouts.reduce((max, node) => Math.max(max, node.defaultTop + node.height + GRAPH_PADDING_BOTTOM), GRAPH_PADDING_TOP + GRAPH_PADDING_BOTTOM)
    ),
    loading: false,
    loadingLabel: undefined,
    errorMessage: undefined
  };
}

export async function buildMetadataPatchedRevisionGraphViewFingerprint(
  previousState: RevisionGraphViewState,
  repository: Repository,
  snapshot: RevisionGraphSnapshot,
  signal?: AbortSignal
): Promise<string | undefined> {
  if (
    previousState.viewMode !== 'ready' ||
    previousState.repositoryPath !== repository.rootUri.fsPath
  ) {
    return undefined;
  }

  const repositoryRefs = await loadRepositoryRefs(repository, signal);
  const overlay = buildRevisionGraphRepositoryOverlay(repository, repositoryRefs);
  const patchedScene = patchSceneReferences(
    previousState.scene,
    snapshot.graph,
    overlay,
    previousState.projectionOptions
  );
  if (!patchedScene) {
    return undefined;
  }

  const references = buildViewReferences(patchedScene);
  const nodeLayouts = buildNodeLayouts(patchedScene);

  return buildRevisionGraphViewFingerprint({
    repositoryPath: repository.rootUri.fsPath,
    currentHeadName: repository.state.HEAD?.name,
    currentHeadUpstreamName: repository.state.HEAD?.upstream
      ? formatUpstreamLabel(repository.state.HEAD.upstream.remote, repository.state.HEAD.upstream.name)
      : undefined,
    publishedLocalBranchNames: getPublishedLocalBranchNames(repository),
    isWorkspaceDirty: hasWorkspaceChanges(repository),
    hasMergeConflicts: hasMergeConflicts(repository),
    hasConflictedMerge: hasConflictedMerge(repository),
    sceneLayoutKey: buildRevisionGraphSceneLayoutKey(nodeLayouts, patchedScene.edges),
    references
  });
}

export function buildRevisionGraphViewFingerprint(
  state: Pick<
    RevisionGraphViewState,
    | 'repositoryPath'
    | 'currentHeadName'
    | 'currentHeadUpstreamName'
    | 'publishedLocalBranchNames'
    | 'isWorkspaceDirty'
    | 'hasMergeConflicts'
    | 'hasConflictedMerge'
    | 'sceneLayoutKey'
    | 'references'
  >
): string {
  return JSON.stringify({
    repositoryPath: state.repositoryPath,
    currentHeadName: state.currentHeadName,
    currentHeadUpstreamName: state.currentHeadUpstreamName,
    publishedLocalBranchNames: [...state.publishedLocalBranchNames].sort(),
    isWorkspaceDirty: state.isWorkspaceDirty,
    hasMergeConflicts: state.hasMergeConflicts,
    hasConflictedMerge: state.hasConflictedMerge,
    sceneLayoutKey: state.sceneLayoutKey,
    references: state.references.map((reference) => ({
      id: reference.id,
      hash: reference.hash,
      name: reference.name,
      kind: reference.kind
    }))
  });
}

export function canPreserveRevisionGraphContext(
  previousState: RevisionGraphViewState,
  nextState: RevisionGraphViewState
): boolean {
  return (
    previousState.viewMode === 'ready' &&
    nextState.viewMode === 'ready' &&
    !!previousState.repositoryPath &&
    previousState.repositoryPath === nextState.repositoryPath &&
    previousState.sceneLayoutKey === nextState.sceneLayoutKey
  );
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    const error = new Error('The revision graph load was aborted.');
    error.name = 'AbortError';
    throw error;
  }
}

async function buildGraphSnapshotWithRepositoryOverlay(
  repository: Repository,
  snapshot: RevisionGraphSnapshot,
  projectionOptions: RevisionGraphViewState['projectionOptions'],
  signal: AbortSignal | undefined,
  trace: RevisionGraphLoadTraceSink | undefined
): Promise<RevisionGraphSnapshot> {
  const overlayStartedAt = nowMs();
  const repositoryRefs = await loadRepositoryRefs(repository, signal);
  const overlay = buildRevisionGraphRepositoryOverlay(repository, repositoryRefs);
  const overlayedGraph = applyRevisionGraphRepositoryOverlay(snapshot.graph, overlay, projectionOptions);
  traceDuration(
    trace,
    'state.repositoryOverlay',
    overlayStartedAt,
    `refs=${repositoryRefs.length}; changed=${overlayedGraph !== snapshot.graph}`
  );

  return overlayedGraph === snapshot.graph
    ? snapshot
    : {
        ...snapshot,
        graph: overlayedGraph
      };
}

function buildRevisionGraphRepositoryOverlay(
  repository: Repository,
  refs: readonly Ref[]
): RevisionGraphRepositoryOverlay {
  return {
    refs,
    currentHeadName: repository.state.HEAD?.name,
    currentHeadCommit: repository.state.HEAD?.commit
  };
}

function applyRevisionGraphRepositoryOverlay(
  graph: CommitGraph,
  overlay: RevisionGraphRepositoryOverlay,
  projectionOptions: RevisionGraphViewState['projectionOptions']
): CommitGraph {
  const visibleHashes = new Set(graph.orderedCommits.map((commit) => commit.hash));
  const refsByHash = buildOverlayRefsByHash(
    graph,
    visibleHashes,
    graph.orderedCommits,
    overlay,
    projectionOptions
  );
  if (!refsByHash) {
    return graph;
  }

  let changed = false;
  const orderedCommits = graph.orderedCommits.map((commit) => {
    const refs = sortRevisionGraphRefs(refsByHash.get(commit.hash) ?? []);
    if (!areRevisionGraphRefsEqual(commit.refs, refs)) {
      changed = true;
      return {
        ...commit,
        refs
      };
    }

    return commit;
  });
  if (!changed) {
    return graph;
  }

  return {
    ...graph,
    orderedCommits,
    commitsByHash: new Map(orderedCommits.map((commit) => [commit.hash, commit] as const))
  };
}

async function loadRepositoryRefs(
  repository: Repository,
  signal: AbortSignal | undefined
): Promise<readonly Ref[]> {
  throwIfAborted(signal);
  try {
    const refs = await repository.getRefs();
    throwIfAborted(signal);
    return refs;
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    return repository.state.refs;
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
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
    publishedLocalBranchNames: [],
    isWorkspaceDirty: false,
    hasMergeConflicts: false,
    hasConflictedMerge: false,
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

async function buildReadyRevisionGraphViewStateFromParts(
  repository: Repository,
  projectionOptions: RevisionGraphViewState['projectionOptions'],
  autoArrangeOnInit: boolean,
  backend: RevisionGraphBackend,
  snapshot: RevisionGraphSnapshot,
  scene: RevisionGraphScene,
  primaryAncestorPaths: RevisionGraphViewState['primaryAncestorPathsByHash'],
  signal?: AbortSignal,
  trace?: RevisionGraphLoadTraceSink
): Promise<RevisionGraphViewState> {
  throwIfAborted(signal);
  const partsStartedAt = nowMs();
  const nodeLayouts = buildNodeLayouts(scene);
  const references = buildViewReferences(scene);
  const mergeBlockedStartedAt = nowMs();
  const mergeBlockedTargets = await backend.getMergeBlockedTargets(
    repository,
    snapshot,
    repository.state.HEAD?.name,
    references,
    signal
  );
  traceDuration(trace, 'state.mergeBlockedTargets', mergeBlockedStartedAt, `references=${references.length}`);
  throwIfAborted(signal);
  const baseCanvasWidth = Math.max(
    880,
    nodeLayouts.reduce((max, node) => Math.max(max, node.defaultLeft + node.width + NODE_PADDING_X), 0)
  );
  const baseCanvasHeight = Math.max(
    480,
    nodeLayouts.reduce((max, node) => Math.max(max, node.defaultTop + node.height + GRAPH_PADDING_BOTTOM), GRAPH_PADDING_TOP + GRAPH_PADDING_BOTTOM)
  );

  const state: RevisionGraphViewState = {
    viewMode: 'ready',
    hasRepositories: true,
    repositoryPath: repository.rootUri.fsPath,
    currentHeadName: repository.state.HEAD?.name,
    currentHeadUpstreamName: repository.state.HEAD?.upstream
      ? formatUpstreamLabel(repository.state.HEAD.upstream.remote, repository.state.HEAD.upstream.name)
      : undefined,
    publishedLocalBranchNames: getPublishedLocalBranchNames(repository),
    isWorkspaceDirty: hasWorkspaceChanges(repository),
    hasMergeConflicts: hasMergeConflicts(repository),
    hasConflictedMerge: hasConflictedMerge(repository),
    projectionOptions,
    mergeBlockedTargets,
    primaryAncestorPathsByHash: primaryAncestorPaths,
    autoArrangeOnInit,
    scene,
    nodeLayouts,
    references,
    sceneLayoutKey: buildRevisionGraphSceneLayoutKey(nodeLayouts, scene.edges),
    baseCanvasWidth,
    baseCanvasHeight,
    emptyMessage: undefined,
    loading: false,
    loadingLabel: undefined,
    errorMessage: undefined
  };
  traceDuration(trace, 'state.readyViewState', partsStartedAt, `nodes=${scene.nodes.length}; refs=${references.length}`);
  return state;
}

export function buildRevisionGraphSceneLayoutKey(
  nodeLayouts: readonly RevisionGraphNodeLayout[],
  edges: readonly RevisionGraphEdge[]
): string {
  const hash = createHash('sha256');
  hash.update(REVISION_GRAPH_SCENE_LAYOUT_KEY_VERSION);

  for (const node of nodeLayouts) {
    hash.update('\0node\0');
    hash.update(node.hash);
    hash.update('\0');
    hash.update(String(node.row));
    hash.update('\0');
    hash.update(String(Math.round(node.defaultLeft)));
    hash.update('\0');
    hash.update(String(Math.round(node.width)));
    hash.update('\0');
    hash.update(String(Math.round(node.height)));
  }

  for (const edge of [...edges].sort(compareRevisionGraphEdges)) {
    hash.update('\0edge\0');
    hash.update(edge.from);
    hash.update('\0');
    hash.update(edge.to);
  }

  return `${REVISION_GRAPH_SCENE_LAYOUT_KEY_VERSION}:${hash.digest('base64url')}`;
}

function compareRevisionGraphEdges(left: RevisionGraphEdge, right: RevisionGraphEdge): number {
  return left.from.localeCompare(right.from) ||
    left.to.localeCompare(right.to);
}

function getPublishedLocalBranchNames(repository: Repository): readonly string[] {
  const branchesByName = new Map<string, Branch>();
  for (const ref of repository.state.refs) {
    if (ref.type === RefType.Head && ref.name) {
      branchesByName.set(ref.name, ref as Branch);
    }
  }

  if (repository.state.HEAD?.name) {
    branchesByName.set(repository.state.HEAD.name, repository.state.HEAD);
  }

  return [...branchesByName.values()]
    .filter(isPublishedLocalBranch)
    .map((branch) => branch.name as string)
    .sort();
}

function buildViewReferences(scene: RevisionGraphScene): RevisionGraphViewReference[] {
  return scene.nodes.flatMap((node) =>
    node.refs.map<RevisionGraphViewReference>((ref) => ({
      id: createReferenceId(node.hash, ref.kind, ref.name),
      hash: node.hash,
      name: ref.name,
      kind: ref.kind,
      title: ref.name
    }))
  );
}

function patchSceneReferences(
  scene: RevisionGraphScene,
  graph: CommitGraph,
  overlay: RevisionGraphRepositoryOverlay,
  projectionOptions: RevisionGraphViewState['projectionOptions']
): RevisionGraphScene | undefined {
  const visibleHashes = new Set(scene.nodes.map((node) => node.hash));
  const refsByHash = buildOverlayRefsByHash(
    graph,
    visibleHashes,
    scene.nodes,
    overlay,
    projectionOptions
  );
  if (!refsByHash) {
    return undefined;
  }

  return {
    ...scene,
    nodes: scene.nodes.map((node) => ({
      ...node,
      refs: sortRevisionGraphRefs(refsByHash.get(node.hash) ?? [])
    }))
  };
}

function buildOverlayRefsByHash(
  graph: CommitGraph,
  visibleHashes: ReadonlySet<string>,
  sourceNodes: readonly { readonly hash: string; readonly refs: readonly RevisionGraphRef[] }[],
  overlay: RevisionGraphRepositoryOverlay,
  projectionOptions: RevisionGraphViewState['projectionOptions']
): Map<string, RevisionGraphRef[]> | undefined {
  const refsByHash = seedSupplementalRefsByHash(sourceNodes, projectionOptions);

  for (const ref of overlay.refs) {
    const normalizedRef = normalizeRepositoryRef(ref, projectionOptions);
    if (!normalizedRef) {
      continue;
    }

    const hash = resolveVisibleRefHash(graph, visibleHashes, normalizedRef.name, normalizedRef.kind, ref.commit);
    if (!hash) {
      continue;
    }

    pushRef(refsByHash, hash, normalizedRef);
  }

  if (overlay.currentHeadName) {
    const headHash = resolveVisibleHeadHash(
      graph,
      visibleHashes,
      overlay.currentHeadName,
      overlay.currentHeadCommit
    );
    if (!headHash) {
      return undefined;
    }

    pushRef(refsByHash, headHash, { name: overlay.currentHeadName, kind: 'head' });
  }

  return refsByHash;
}

function resolveVisibleHeadHash(
  graph: CommitGraph,
  visibleHashes: ReadonlySet<string>,
  currentHeadName: string,
  currentHeadCommit: string | undefined
): string | undefined {
  return (
    (currentHeadCommit && visibleHashes.has(currentHeadCommit) ? currentHeadCommit : undefined) ??
    findFirstVisibleHash(findCommitHashesByRef(graph, currentHeadName, 'branch'), visibleHashes) ??
    findFirstVisibleHash(findCommitHashesByRef(graph, currentHeadName, 'head'), visibleHashes)
  );
}

function resolveVisibleRefHash(
  graph: CommitGraph,
  visibleHashes: ReadonlySet<string>,
  refName: string,
  refKind: RevisionGraphRef['kind'],
  explicitCommit: string | undefined
): string | undefined {
  if (explicitCommit && visibleHashes.has(explicitCommit)) {
    return explicitCommit;
  }

  const candidateKinds: RevisionGraphRef['kind'][] = refKind === 'branch'
    ? ['branch', 'head']
    : [refKind];

  for (const candidateKind of candidateKinds) {
    const visibleHash = findFirstVisibleHash(
      findCommitHashesByRef(graph, refName, candidateKind),
      visibleHashes
    );
    if (visibleHash) {
      return visibleHash;
    }
  }

  return undefined;
}

function findFirstVisibleHash(
  hashes: readonly string[],
  visibleHashes: ReadonlySet<string>
): string | undefined {
  return hashes.find((hash) => visibleHashes.has(hash));
}

function normalizeRepositoryRef(
  ref: Ref,
  projectionOptions: RevisionGraphViewState['projectionOptions']
): RevisionGraphRef | undefined {
  const name = getNormalizedRefName(ref);
  if (!name) {
    return undefined;
  }

  switch (ref.type) {
    case RefType.Head:
      return { name, kind: 'branch' };
    case RefType.RemoteHead:
      return projectionOptions.showRemoteBranches || isDefaultRemoteHeadScopeAnchor(name, projectionOptions)
        ? { name, kind: 'remote' }
        : undefined;
    case RefType.Tag:
      return projectionOptions.showTags ? { name, kind: 'tag' } : undefined;
  }
}

function isDefaultRemoteHeadScopeAnchor(
  name: string,
  projectionOptions: RevisionGraphViewState['projectionOptions']
): boolean {
  return projectionOptions.refScope === 'remoteHead' &&
    (name === 'origin/HEAD' || name === 'origin/main' || name === 'origin/master');
}

function getNormalizedRefName(ref: Ref): string {
  if (ref.type === RefType.RemoteHead && ref.remote && ref.name) {
    return ref.name.startsWith(`${ref.remote}/`) ? ref.name : `${ref.remote}/${ref.name}`;
  }

  return ref.name ?? '';
}

function pushRef(
  refsByHash: Map<string, RevisionGraphRef[]>,
  hash: string,
  ref: RevisionGraphRef
): void {
  const existing = refsByHash.get(hash) ?? [];
  if (!existing.some((entry) => entry.name === ref.name && entry.kind === ref.kind)) {
    existing.push(ref);
    refsByHash.set(hash, existing);
  }
}

function sortRevisionGraphRefs(refs: readonly RevisionGraphRef[]): RevisionGraphRef[] {
  const dedupedRefs = coalesceHeadBranchRefs(refs);
  return [...dedupedRefs].sort((left, right) => {
    const priority = getRevisionGraphRefPriority(left.kind) - getRevisionGraphRefPriority(right.kind);
    if (priority !== 0) {
      return priority;
    }

    const family = getRevisionGraphRefFamilyKey(left).localeCompare(getRevisionGraphRefFamilyKey(right));
    return family !== 0 ? family : left.name.localeCompare(right.name);
  });
}

function getRevisionGraphRefPriority(kind: RevisionGraphRef['kind']): number {
  switch (kind) {
    case 'head':
      return 0;
    case 'branch':
      return 1;
    case 'remote':
      return 2;
    case 'stash':
      return 3;
    case 'tag':
      return 4;
  }
}

function seedSupplementalRefsByHash(
  sourceNodes: readonly { readonly hash: string; readonly refs: readonly RevisionGraphRef[] }[],
  projectionOptions: RevisionGraphViewState['projectionOptions']
): Map<string, RevisionGraphRef[]> {
  const refsByHash = new Map<string, RevisionGraphRef[]>();

  for (const node of sourceNodes) {
    const supplementalRefs = node.refs.filter((ref) => ref.kind === 'stash' && projectionOptions.showStashes);
    if (supplementalRefs.length > 0) {
      refsByHash.set(node.hash, [...supplementalRefs]);
    }
  }

  return refsByHash;
}

function coalesceHeadBranchRefs(refs: readonly RevisionGraphRef[]): RevisionGraphRef[] {
  const headNames = new Set(refs.filter((ref) => ref.kind === 'head').map((ref) => ref.name));
  return refs.filter((ref) => !(ref.kind === 'branch' && headNames.has(ref.name)));
}

function getRevisionGraphRefFamilyKey(ref: RevisionGraphRef): string {
  if (ref.kind === 'remote') {
    const slashIndex = ref.name.indexOf('/');
    return slashIndex >= 0 ? ref.name.slice(slashIndex + 1) : ref.name;
  }

  return ref.name;
}

function areRevisionGraphRefsEqual(
  left: readonly RevisionGraphRef[],
  right: readonly RevisionGraphRef[]
): boolean {
  return left.length === right.length &&
    left.every((ref, index) => {
      const other = right[index];
      return other?.name === ref.name && other.kind === ref.kind;
    });
}
