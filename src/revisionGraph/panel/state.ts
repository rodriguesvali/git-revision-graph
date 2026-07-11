import { createHash } from 'node:crypto';

import { isAbortError, throwIfAborted } from '../../errors';
import { Ref, RefType, Repository } from '../../git';
import { RevisionGraphLimitPolicy, RevisionGraphStateBackend } from '../backend';
import {
  buildPrimaryAncestorNextByHash,
  buildRevisionGraphScene,
  CommitGraph,
  projectMajorOperationsGraph,
  RevisionGraphRef
} from '../../revisionGraphData';
import type {
  RevisionGraphEdge,
  RevisionGraphNodeLayout,
  RevisionGraphScene
} from '../model/sceneTypes';
import { findCommitHashesByRef } from '../model/commitGraphQueries';
import { RevisionGraphSnapshot } from '../source/graphSnapshot';
import { RevisionGraphSnapshotLoadContext } from '../backendServices/snapshot';
import { loadGitBranchDescriptions } from '../repository/branchDescriptions';
import {
  RevisionGraphViewReference,
  RevisionGraphViewState
} from '../../revisionGraphTypes';
import {
  buildNodeLayouts,
  createReferenceId,
  GRAPH_PADDING_BOTTOM,
  GRAPH_PADDING_TOP,
  NODE_PADDING_X
} from '../webview/shared';
import { formatUpstreamLabel, getPublishedLocalBranchNames, hasConflictedMerge, hasMergeConflicts, hasWorkspaceChanges } from '../../gitState';
import { nowMs, traceDuration, RevisionGraphLoadTraceSink } from '../loadTrace';
import {
  classifyFlowBranches,
  createFlowGovernanceViewState,
  FlowGovernanceSettings,
  FlowGovernanceViewState,
  loadFlowPullRequestTargets,
  resolveFlowConfigForRepository
} from '../flow';

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

export interface RevisionGraphViewStateBuildContext {
  readonly repositoryRefs?: readonly Ref[] | PromiseLike<readonly Ref[]>;
  readonly flowGovernanceSettings?: FlowGovernanceSettings;
  readonly branchDescriptions?: ReadonlyMap<string, string>;
}

export async function buildReadyRevisionGraphViewStateBundle(
  repository: Repository,
  projectionOptions: RevisionGraphViewState['projectionOptions'],
  backend: RevisionGraphStateBackend,
  limitPolicy: RevisionGraphLimitPolicy,
  signal?: AbortSignal,
  trace?: RevisionGraphLoadTraceSink,
  context?: Omit<RevisionGraphViewStateBuildContext, 'repositoryRefs'>
): Promise<ReadyRevisionGraphViewStateBundle> {
  throwIfAborted(signal, 'The revision graph load was aborted.');
  const repositoryRefs = loadRepositoryRefsStrict(repository, signal);
  const buildContext: RevisionGraphViewStateBuildContext & RevisionGraphSnapshotLoadContext = {
    ...context,
    repositoryRefs
  };
  const snapshot = await backend.loadGraphSnapshot(repository, projectionOptions, limitPolicy, signal, trace, buildContext);
  return buildReadyRevisionGraphViewStateBundleFromSnapshot(
    repository,
    projectionOptions,
    backend,
    snapshot,
    signal,
    trace,
    buildContext
  );
}

export async function buildReadyRevisionGraphViewState(
  repository: Repository,
  projectionOptions: RevisionGraphViewState['projectionOptions'],
  backend: RevisionGraphStateBackend,
  limitPolicy: RevisionGraphLimitPolicy,
  signal?: AbortSignal,
  trace?: RevisionGraphLoadTraceSink,
  context?: Omit<RevisionGraphViewStateBuildContext, 'repositoryRefs'>
): Promise<RevisionGraphViewState> {
  return (
    await buildReadyRevisionGraphViewStateBundle(
      repository,
      projectionOptions,
      backend,
      limitPolicy,
      signal,
      trace,
      context
    )
  ).state;
}

export async function buildReadyRevisionGraphViewStateBundleFromSnapshot(
  repository: Repository,
  projectionOptions: RevisionGraphViewState['projectionOptions'],
  backend: RevisionGraphStateBackend,
  snapshot: RevisionGraphSnapshot,
  signal?: AbortSignal,
  trace?: RevisionGraphLoadTraceSink,
  context?: RevisionGraphViewStateBuildContext
): Promise<ReadyRevisionGraphViewStateBundle> {
  const overlayedSnapshot = await buildGraphSnapshotWithRepositoryOverlay(
    repository,
    snapshot,
    projectionOptions,
    signal,
    trace,
    context
  );
  const state = await buildReadyRevisionGraphViewStateFromOverlayedSnapshot(
    repository,
    projectionOptions,
    backend,
    overlayedSnapshot,
    signal,
    trace,
    context
  );

  return {
    snapshot: overlayedSnapshot,
    state
  };
}

async function buildReadyRevisionGraphViewStateFromOverlayedSnapshot(
  repository: Repository,
  projectionOptions: RevisionGraphViewState['projectionOptions'],
  backend: RevisionGraphStateBackend,
  snapshot: RevisionGraphSnapshot,
  signal?: AbortSignal,
  trace?: RevisionGraphLoadTraceSink,
  context?: RevisionGraphViewStateBuildContext
): Promise<RevisionGraphViewState> {
  const projectionStartedAt = nowMs();
  const projection = projectMajorOperationsGraph(snapshot.graph, projectionOptions);
  traceDuration(trace, 'state.projectGraph', projectionStartedAt, `nodes=${projection.nodes.length}; edges=${projection.edges.length}`);
  const scene = await buildRevisionGraphScene(snapshot.graph, projection, trace, signal);
  const ancestorsStartedAt = nowMs();
  const primaryAncestorNextByHash = buildPrimaryAncestorNextByHash(snapshot.graph, scene);
  traceDuration(
    trace,
    'state.primaryAncestorNext',
    ancestorsStartedAt,
    `mode=next-map; nodes=${scene.nodes.length}; entries=${Object.keys(primaryAncestorNextByHash).length}`
  );
  return buildReadyRevisionGraphViewStateFromParts(
    repository,
    projectionOptions,
    backend,
    snapshot,
    scene,
    primaryAncestorNextByHash,
    signal,
    trace,
    context
  );
}

async function buildGraphSnapshotWithRepositoryOverlay(
  repository: Repository,
  snapshot: RevisionGraphSnapshot,
  projectionOptions: RevisionGraphViewState['projectionOptions'],
  signal: AbortSignal | undefined,
  trace: RevisionGraphLoadTraceSink | undefined,
  context: RevisionGraphViewStateBuildContext | undefined
): Promise<RevisionGraphSnapshot> {
  const overlayStartedAt = nowMs();
  const repositoryRefs = await loadRepositoryRefs(repository, signal, context);
  const overlay = buildRevisionGraphRepositoryOverlay(repository, repositoryRefs);
  const overlayedGraph = applyRevisionGraphRepositoryOverlay(snapshot.graph, overlay, projectionOptions);
  traceDuration(
    trace,
    'state.repositoryOverlay',
    overlayStartedAt,
    `refs=${repositoryRefs.length}; changed=${overlayedGraph !== snapshot.graph}; source=${context?.repositoryRefs ? 'request-context' : 'repository'}`
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
  const currentHeadName = repository.state.HEAD?.name;
  return {
    refs,
    currentHeadName,
    currentHeadCommit: findRepositoryRefCommit(refs, RefType.Head, currentHeadName) ?? repository.state.HEAD?.commit
  };
}

function findRepositoryRefCommit(
  refs: readonly Ref[],
  type: RefType,
  name: string | undefined
): string | undefined {
  if (!name) {
    return undefined;
  }

  return refs.find((ref) => ref.type === type && ref.name === name)?.commit;
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
  signal: AbortSignal | undefined,
  context?: RevisionGraphViewStateBuildContext
): Promise<readonly Ref[]> {
  try {
    return await loadRepositoryRefsStrict(repository, signal, context);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    return repository.state.refs;
  }
}

async function loadRepositoryRefsStrict(
  repository: Repository,
  signal: AbortSignal | undefined,
  context?: RevisionGraphViewStateBuildContext
): Promise<readonly Ref[]> {
  throwIfAborted(signal, 'The revision graph load was aborted.');
  const refs = context?.repositoryRefs
    ? await Promise.resolve(context.repositoryRefs)
    : await repository.getRefs();
  throwIfAborted(signal, 'The revision graph load was aborted.');
  return refs;
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
    primaryAncestorNextByHash: {},
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
  backend: RevisionGraphStateBackend,
  snapshot: RevisionGraphSnapshot,
  scene: RevisionGraphScene,
  primaryAncestorNextByHash: NonNullable<RevisionGraphViewState['primaryAncestorNextByHash']>,
  signal?: AbortSignal,
  trace?: RevisionGraphLoadTraceSink,
  context?: RevisionGraphViewStateBuildContext
): Promise<RevisionGraphViewState> {
  throwIfAborted(signal, 'The revision graph load was aborted.');
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
  traceDuration(trace, 'state.mergeBlockedTargets', mergeBlockedStartedAt, `references=${references.length}; blocked=${mergeBlockedTargets.length}`);
  throwIfAborted(signal, 'The revision graph load was aborted.');
  const flowGovernance = await buildFlowGovernanceViewState(repository, references, context?.flowGovernanceSettings);
  const branchDescriptionsStartedAt = nowMs();
  const branchDescriptions = context?.branchDescriptions
    ?? await loadGitBranchDescriptions(repository.rootUri.fsPath, signal);
  const describedReferences = applyBranchDescriptions(references, branchDescriptions);
  traceDuration(trace, 'state.branchDescriptions', branchDescriptionsStartedAt, `described=${describedReferences.filter((reference) => reference.description).length}`);
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
    primaryAncestorNextByHash,
    scene,
    nodeLayouts,
    references: describedReferences,
    flowGovernance,
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

async function buildFlowGovernanceViewState(
  repository: Repository,
  references: readonly RevisionGraphViewReference[],
  settings: FlowGovernanceSettings | undefined
): Promise<FlowGovernanceViewState | undefined> {
  const resolution = await resolveFlowConfigForRepository(repository.rootUri.fsPath, settings);
  const branchRefs = references
    .filter((ref) => ref.kind === 'head' || ref.kind === 'branch')
    .map((ref) => ref.name);
  const flowReferences = classifyFlowBranches([...new Set(branchRefs)], resolution.config);
  const state = createFlowGovernanceViewState(resolution, flowReferences);
  const pullRequestTargets = state.enabled
    ? await loadFlowPullRequestTargets(repository.rootUri.fsPath, state.references)
    : [];
  const enrichedState: FlowGovernanceViewState = { ...state, pullRequestTargets };
  return state.enabled || state.configSource === 'repository' || state.configSource === 'invalid'
    ? enrichedState
    : undefined;
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

function applyBranchDescriptions(
  references: readonly RevisionGraphViewReference[],
  descriptions: ReadonlyMap<string, string>
): RevisionGraphViewReference[] {
  return references.map((reference) => {
    if (reference.kind !== 'head' && reference.kind !== 'branch') {
      return reference;
    }
    const description = descriptions.get(reference.name);
    return description ? { ...reference, description } : reference;
  });
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
