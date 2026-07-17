import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const runtimeSourcePath = `${projectRoot}/out/webview/revisionGraph.js`;
const testRuntimePath = `${projectRoot}/out-test/revisionGraphRuntime.cjs`;
const exportedNames = [
  'applyRevisionGraphWebviewCanvasSize',
  'applyRevisionGraphWebviewSceneGeometry',
  'applyRevisionGraphWebviewScenePlacement',
  'applyRevisionGraphWebviewToolbarBusyState',
  'buildRevisionGraphWebviewDirectionalMap',
  'buildRevisionGraphWebviewDistanceMap',
  'buildRevisionGraphWebviewVirtualIndex',
  'calculateRevisionGraphWebviewCanvasSize',
  'calculateRevisionGraphWebviewContextSubmenuPlacement',
  'calculateRevisionGraphWebviewNodeDragOffset',
  'calculateRevisionGraphWebviewNodeLeft',
  'calculateRevisionGraphWebviewNodeOffset',
  'calculateRevisionGraphWebviewScenePlacement',
  'calculateRevisionGraphWebviewViewportDrag',
  'calculateRevisionGraphWebviewViewportScrollPosition',
  'captureRevisionGraphWebviewViewportSceneCenter',
  'clearRevisionGraphWebviewVirtualSceneDom',
  'collectRevisionGraphWebviewVirtualIndexCandidates',
  'commitRevisionGraphWebviewVirtualSceneDom',
  'completeRevisionGraphWebviewVirtualSceneCommit',
  'createRevisionGraphFocusDescendantsMessage',
  'createRevisionGraphFocusRangeMessage',
  'createRevisionGraphWebviewContextMenuPlan',
  'createRevisionGraphWebviewContextSubmenuCloseScheduler',
  'createRevisionGraphWebviewFlowAiTextInteractions',
  'createRevisionGraphWebviewNodeRenderKey',
  'createRevisionGraphWebviewRelationshipHighlights',
  'createRevisionGraphWebviewRuntimeStateModel',
  'createRevisionGraphWebviewViewportDragState',
  'createRevisionGraphWebviewVirtualEdgeKey',
  'createRevisionGraphWebviewVirtualSceneKey',
  'createRevisionGraphWebviewVirtualSceneMarkup',
  'createRevisionGraphWebviewVirtualSceneRenderDecision',
  'createRevisionGraphWebviewVirtualViewportBounds',
  'describeRevisionGraphWebviewFallbackEdgePath',
  'ensureRevisionGraphWebviewMinimapViewportVisibleUi',
  'formatRevisionGraphWebviewNodeSummary',
  'formatRevisionGraphWebviewNodeTitle',
  'getFlowEqualizationOrigins',
  'getFocusDescendantsActionLabel',
  'getFocusRangeActionLabel',
  'getRevisionGraphWebviewFlowBranchValidationError',
  'getRevisionGraphWebviewFlowEqualizationOrigins',
  'getRevisionGraphWebviewFlowPullRequestWarning',
  'getRevisionGraphWebviewContextMenuComparisonTargets',
  'getRevisionGraphWebviewActiveSearchResultHash',
  'getRevisionGraphWebviewFlowKindLabel',
  'getRevisionGraphWebviewNodePresentationClass',
  'getRevisionGraphWebviewPrimaryAncestorPath',
  'getRevisionGraphWebviewReferenceKindLabel',
  'getRevisionGraphWebviewSearchActiveResultIndex',
  'getRevisionGraphWebviewSearchResultHashes',
  'getRevisionGraphWebviewVirtualBucketRange',
  'getRevisionGraphWebviewVirtualEdgeVerticalBounds',
  'getRevisionGraphWebviewVisibleNodeReferences',
  'handleHostMessage',
  'hideRevisionGraphWebviewLoading',
  'hideRevisionGraphWebviewStatus',
  'isRevisionGraphWebviewHostMessage',
  'isRevisionGraphWebviewVirtualEdgeVisible',
  'isRevisionGraphWebviewVirtualLayoutVisible',
  'normalizeRevisionGraphWebviewSearchQuery',
  'normalizeRevisionGraphWebviewSearchResultIndex',
  'renderRevisionGraphWebviewEdgeMarkup',
  'renderRevisionGraphWebviewMinimapContent',
  'renderRevisionGraphWebviewFlowKindIcon',
  'renderRevisionGraphWebviewNodeMarkup',
  'renderRevisionGraphWebviewReferenceKindIcon',
  'renderReferenceTooltipKind',
  'resetRevisionGraphWebviewVirtualSceneKey',
  'runRevisionGraphWebviewSceneRenderLifecycle',
  'scheduleRevisionGraphWebviewVirtualSceneRender',
  'scrollRevisionGraphWebviewViewportTo',
  'selectRevisionGraphWebviewVirtualScene',
  'shouldScrollRevisionGraphWebviewViewport',
  'showRevisionGraphWebviewLoading',
  'showRevisionGraphWebviewStatus',
  'syncDescendantFilter',
  'syncRangeFilter',
  'syncRevisionGraphWebviewMinimapPreferenceUi',
  'syncRevisionGraphWebviewMinimapViewportUi',
  'syncRevisionGraphWebviewRelationshipHighlightsUi',
  'syncRevisionGraphWebviewRemoteToolbarUi',
  'syncRevisionGraphWebviewSearchHighlights',
  'syncRevisionGraphWebviewSearchUi',
  'syncRevisionGraphWebviewSelectionHighlightsUi',
  'traceRevisionGraphWebviewPrimaryPath',
  'updateFlowGovernanceOptions'
];

const runtimeSource = readFileSync(runtimeSourcePath, 'utf8');
const exportBridge = `\nmodule.exports = {\n${exportedNames.map((name) => `  ${name}`).join(',\n')}\n};\n`;
const wrapperEnd = '\n})();';
const wrapperEndIndex = runtimeSource.lastIndexOf(wrapperEnd);
if (wrapperEndIndex < 0) {
  throw new Error(`Expected wrapped revision graph runtime at ${runtimeSourcePath}.`);
}
const testRuntimeSource = runtimeSource.slice(0, wrapperEndIndex)
  + exportBridge
  + runtimeSource.slice(wrapperEndIndex);
mkdirSync(`${projectRoot}/out-test`, { recursive: true });
writeFileSync(testRuntimePath, testRuntimeSource, 'utf8');
