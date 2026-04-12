import { RevisionGraphProjectionOptions } from '../../revisionGraphData';
import {
  EDGE_VERTICAL_INSET,
  NODE_HORIZONTAL_GAP,
  NODE_MIN_WIDTH,
  REF_LINE_HEIGHT,
  VIEWPORT_PADDING_BOTTOM,
  VIEWPORT_PADDING_LEFT,
  VIEWPORT_PADDING_RIGHT,
  VIEWPORT_PADDING_TOP,
  RevisionGraphNodeLayout
} from './shared';

type RevisionGraphReference = {
  readonly id: string;
  readonly hash: string;
  readonly name: string;
  readonly kind: string;
  readonly title: string;
};

type RevisionGraphClientEdge = {
  readonly from: string;
  readonly to: string;
};

export interface RenderRevisionGraphScriptOptions {
  readonly nonce: string;
  readonly references: readonly RevisionGraphReference[];
  readonly currentHeadName: string | undefined;
  readonly currentHeadUpstreamName: string | undefined;
  readonly isWorkspaceDirty: boolean;
  readonly projectionOptions: RevisionGraphProjectionOptions;
  readonly autoArrangeOnInit: boolean;
  readonly mergeBlockedTargets: readonly string[];
  readonly zoomLevels: readonly number[];
  readonly graphNodes: readonly RevisionGraphNodeLayout[];
  readonly graphEdges: readonly RevisionGraphClientEdge[];
  readonly primaryAncestorPathsByHash: Readonly<Record<string, readonly string[]>>;
  readonly sceneLayoutKey: string;
  readonly baseCanvasWidth: number;
  readonly baseCanvasHeight: number;
}

export function renderRevisionGraphScript({
  nonce,
  references,
  currentHeadName,
  currentHeadUpstreamName,
  isWorkspaceDirty,
  projectionOptions,
  autoArrangeOnInit,
  mergeBlockedTargets,
  zoomLevels,
  graphNodes,
  graphEdges,
  primaryAncestorPathsByHash,
  sceneLayoutKey,
  baseCanvasWidth,
  baseCanvasHeight
}: RenderRevisionGraphScriptOptions): string {
  return `<script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const references = ${JSON.stringify(references)};
    const currentHeadName = ${JSON.stringify(currentHeadName ?? null)};
    const currentHeadUpstreamName = ${JSON.stringify(currentHeadUpstreamName ?? null)};
    const isWorkspaceDirty = ${JSON.stringify(isWorkspaceDirty)};
    const currentProjectionOptions = ${JSON.stringify(projectionOptions)};
    const autoArrangeOnInit = ${JSON.stringify(autoArrangeOnInit)};
    const mergeBlockedTargets = new Set(${JSON.stringify(mergeBlockedTargets)});
    const zoomLevels = ${JSON.stringify(zoomLevels)};
    const graphNodes = ${JSON.stringify(graphNodes)};
    const graphEdges = ${JSON.stringify(graphEdges)};
    const selected = [];
    const headReference =
      references.find((ref) => ref.kind === 'head') ||
      references.find((ref) => currentHeadName && ref.name === currentHeadName) ||
      null;
    const headNodeHash = headReference ? headReference.hash : null;
    const viewport = document.getElementById('viewport');
    const canvas = document.getElementById('canvas');
    const sceneLayer = document.getElementById('sceneLayer');
    const contextMenu = document.getElementById('contextMenu');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingMessage = document.getElementById('loadingMessage');
    const workspaceLed = document.getElementById('workspaceLed');
    const scopeSelect = document.getElementById('scopeSelect');
    const showTagsToggle = document.getElementById('showTagsToggle');
    const showBranchingsToggle = document.getElementById('showBranchingsToggle');
    const reorganizeButton = document.getElementById('reorganizeButton');
    const zoomOutButton = document.getElementById('zoomOutButton');
    const zoomInButton = document.getElementById('zoomInButton');
    const nodeElements = new Map(
      Array.from(document.querySelectorAll('[data-node-hash]')).map((element) => [element.getAttribute('data-node-hash'), element])
    );
    const edgeElements = Array.from(document.querySelectorAll('[data-edge-from]'));
    const graphNodeByHash = new Map(graphNodes.map((node) => [node.hash, node]));
    const parentMap = buildDirectionalMap(graphEdges, 'from', 'to');
    const childMap = buildDirectionalMap(graphEdges, 'to', 'from');
    const headDistanceByHash = headNodeHash ? buildDistanceMap(headNodeHash, parentMap) : new Map();
    const primaryAncestorPathsByHash = ${JSON.stringify(primaryAncestorPathsByHash)};
    const sceneLayoutKey = ${JSON.stringify(sceneLayoutKey)};
    const storedState = vscode.getState() || {};
    const nodeOffsets = storedState.sceneLayoutKey === sceneLayoutKey
      ? Object.assign({}, storedState.nodeOffsets || {})
      : {};
    const baseCanvasWidth = ${baseCanvasWidth};
    const baseCanvasHeight = ${baseCanvasHeight};
    let currentZoom = 1;
    let layoutOffsetX = 0;
    let layoutOffsetY = 0;
    let dragState = null;
    let nodeDragState = null;
    let suppressNodeClick = false;
    for (const element of document.querySelectorAll('[data-ref-id]')) {
      element.addEventListener('click', (event) => {
        if (suppressNodeClick) {
          suppressNodeClick = false;
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        const refId = element.getAttribute('data-ref-id');
        const additive = event.ctrlKey || event.metaKey;
        if (!refId) return;
        const existingIndex = selected.indexOf(refId);
        if (!additive && selected.length === 1 && existingIndex === 0) {
          selected.splice(0, selected.length);
        } else if (!additive) {
          selected.splice(0, selected.length, refId);
        } else if (existingIndex >= 0) {
          selected.splice(existingIndex, 1);
        } else if (selected.length < 2) {
          selected.push(refId);
        } else {
          selected.splice(0, selected.length, selected[1], refId);
        }
        closeContextMenu();
        syncSelection();
      });
      element.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        const refId = element.getAttribute('data-ref-id');
        if (!refId) return;
        const target = getReference(refId);
        if (!target) return;
        openContextMenu(event.clientX, event.clientY, target);
      });
    }
    for (const grip of document.querySelectorAll('[data-node-grip]')) {
      grip.addEventListener('mousedown', (event) => {
        if (event.button !== 0) {
          return;
        }
        const node = grip.closest('[data-node-hash]');
        const hash = node ? node.getAttribute('data-node-hash') : undefined;
        if (!node || !hash) {
          return;
        }
        nodeDragState = {
          hash,
          element: node,
          startX: event.clientX,
          startOffset: Number(nodeOffsets[hash] || 0)
        };
        document.body.classList.add('node-dragging');
        node.classList.add('dragging');
        closeContextMenu();
        event.preventDefault();
        event.stopPropagation();
      });
    }
    if (workspaceLed && isWorkspaceDirty) {
      workspaceLed.addEventListener('click', () => {
        vscode.postMessage({ type: 'open-source-control' });
      });
    }
    if (scopeSelect) {
      scopeSelect.addEventListener('change', () => {
        postMessageWithLoading({
          type: 'set-projection-options',
          options: { refScope: scopeSelect.value }
        }, 'Updating graph scope...');
      });
    }
    if (showTagsToggle) {
      showTagsToggle.addEventListener('change', () => {
        postMessageWithLoading({
          type: 'set-projection-options',
          options: { showTags: showTagsToggle.checked }
        }, showTagsToggle.checked ? 'Showing tags...' : 'Hiding tags...');
      });
    }
    if (showBranchingsToggle) {
      showBranchingsToggle.addEventListener('change', () => {
        postMessageWithLoading({
          type: 'set-projection-options',
          options: { showBranchingsAndMerges: showBranchingsToggle.checked }
        }, showBranchingsToggle.checked ? 'Showing branchings and merges...' : 'Showing refs only...');
      });
    }
    if (reorganizeButton) {
      reorganizeButton.addEventListener('click', () => {
        autoArrangeLayout();
        centerGraphInViewport();
      });
    }
    if (zoomOutButton) {
      zoomOutButton.addEventListener('click', () => {
        zoomOut();
        centerGraphInViewport();
      });
    }
    if (zoomInButton) {
      zoomInButton.addEventListener('click', () => {
        zoomIn();
        centerGraphInViewport();
      });
    }
    viewport.addEventListener('mousedown', (event) => {
      if (event.button !== 0) {
        return;
      }
      dragState = {
        startX: event.clientX,
        startY: event.clientY,
        scrollLeft: viewport.scrollLeft,
        scrollTop: viewport.scrollTop,
        moved: false
      };
      viewport.classList.add('dragging');
      closeContextMenu();
      event.preventDefault();
    });
    viewport.addEventListener('scroll', syncMinimap);
    viewport.addEventListener('scroll', closeContextMenu);
    window.addEventListener('resize', () => {
      syncCanvasSize();
      updateScenePlacement();
      syncMinimap();
      closeContextMenu();
    });
    window.addEventListener('mousemove', (event) => {
      if (nodeDragState) {
        const defaultLeft = getDefaultNodeLeft(nodeDragState.hash);
        const rawOffset = nodeDragState.startOffset + (event.clientX - nodeDragState.startX) / currentZoom;
        nodeOffsets[nodeDragState.hash] = clampNodeOffset(nodeDragState.hash, defaultLeft, rawOffset);
        applyNodeLayout(false);
        return;
      }
      if (!dragState) {
        return;
      }
      const dx = event.clientX - dragState.startX;
      const dy = event.clientY - dragState.startY;
      if (!dragState.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        dragState.moved = true;
        suppressNodeClick = true;
      }
      viewport.scrollLeft = dragState.scrollLeft - dx;
      viewport.scrollTop = dragState.scrollTop - dy;
      syncMinimap();
    });
    window.addEventListener('mouseup', () => {
      if (nodeDragState) {
        document.body.classList.remove('node-dragging');
        nodeDragState.element.classList.remove('dragging');
        persistNodeLayout();
        nodeDragState = null;
      }
      if (!dragState) {
        return;
      }
      viewport.classList.remove('dragging');
      if (!dragState.moved) {
        suppressNodeClick = false;
      } else {
        setTimeout(() => {
          suppressNodeClick = false;
        }, 0);
      }
      dragState = null;
    });
    window.addEventListener('click', (event) => {
      if (!contextMenu.contains(event.target)) {
        closeContextMenu();
      }
    });
    window.addEventListener('keydown', (event) => {
      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        if (event.key === '+' || event.key === '=' || event.code === 'NumpadAdd') {
          event.preventDefault();
          zoomIn();
          return;
        }
        if (event.key === '-' || event.key === '_' || event.code === 'NumpadSubtract') {
          event.preventDefault();
          zoomOut();
          return;
        }
        if (event.key === '0' || event.code === 'Numpad0') {
          event.preventDefault();
          setZoom(1);
          return;
        }
      }
      if (event.key === 'Escape') {
        closeContextMenu();
        if (nodeDragState) {
          document.body.classList.remove('node-dragging');
          nodeDragState.element.classList.remove('dragging');
          nodeDragState = null;
          applyNodeLayout(false);
        }
      }
    });
    setZoom(1);
    applyNodeLayout(false);
    syncSelection();
    requestAnimationFrame(() => {
      if (autoArrangeOnInit) {
        autoArrangeLayout();
      }
      centerGraphInViewport();
    });

    function setZoom(zoom) {
      currentZoom = zoom;
      canvas.style.transform = 'scale(' + zoom + ')';
      syncCanvasSize();
      applyNodeLayout(false);
      syncToolbarActions();
      syncMinimap();
    }

    function zoomIn() {
      const nextZoom = zoomLevels.find((value) => value > currentZoom);
      if (nextZoom) {
        setZoom(nextZoom);
      }
    }

    function zoomOut() {
      const previousLevels = zoomLevels.filter((value) => value < currentZoom);
      const nextZoom = previousLevels.length > 0 ? previousLevels[previousLevels.length - 1] : undefined;
      if (nextZoom) {
        setZoom(nextZoom);
      }
    }

    function syncSelection() {
      for (const element of document.querySelectorAll('[data-ref-id]')) {
        const refId = element.getAttribute('data-ref-id');
        element.classList.toggle('base', refId === selected[0]);
        element.classList.toggle('compare', refId === selected[1]);
        element.classList.toggle('has-compare', selected.length === 2 && refId === selected[0]);
      }
      syncRelationshipHighlights();
      syncMinimap();
    }

    function syncRelationshipHighlights() {
      const anchorReference = selected[0] ? getReference(selected[0]) : undefined;
      const anchorHash = anchorReference ? anchorReference.hash : null;
      const ancestorPath = anchorHash ? getPrimaryAncestorPath(anchorHash) : [];
      const descendantPath = anchorHash ? tracePrimaryPath(anchorHash, 'descendant') : [];
      const ancestorHashes = new Set(ancestorPath);
      const descendantHashes = new Set(descendantPath);
      const relatedHashes = new Set([...ancestorHashes, ...descendantHashes]);
      const ancestorEdgeKeys = buildPathEdgeKeys(ancestorPath, 'ancestor');
      const descendantEdgeKeys = buildPathEdgeKeys(descendantPath, 'descendant');

      for (const [hash, element] of nodeElements.entries()) {
        const isAncestorRelated = !!anchorHash && anchorHash !== hash && ancestorHashes.has(hash);
        const isDescendantRelated = !!anchorHash && anchorHash !== hash && descendantHashes.has(hash);
        element.classList.toggle('selected', anchorHash === hash);
        element.classList.toggle('related', !!anchorHash && anchorHash !== hash && relatedHashes.has(hash));
        element.classList.toggle('ancestor-related', isAncestorRelated);
        element.classList.toggle('descendant-related', isDescendantRelated);
      }

      for (const element of edgeElements) {
        const fromHash = element.getAttribute('data-edge-from');
        const toHash = element.getAttribute('data-edge-to');
        const edgeKey = fromHash && toHash ? fromHash + '->' + toHash : '';
        const isAncestorPath = !!anchorHash && ancestorEdgeKeys.has(edgeKey);
        const isDescendantPath = !!anchorHash && descendantEdgeKeys.has(edgeKey);
        const isRelated = isAncestorPath || isDescendantPath;

        element.classList.toggle('related', isRelated);
        element.classList.toggle('ancestor-path', isAncestorPath);
        element.classList.toggle('descendant-path', isDescendantPath);
        element.classList.toggle('muted', !!anchorHash && !isRelated);
      }
    }

    function openContextMenu(clientX, clientY, target) {
      const base = selected[0] ? getReference(selected[0]) : undefined;
      const compare = selected[1] ? getReference(selected[1]) : undefined;
      const isCurrentHead = target.kind === 'head' || (currentHeadName && target.name === currentHeadName);
      const canSyncCurrentHead = target.kind === 'head' && !!currentHeadUpstreamName;
      const hasComparisonSelection =
        selected.length === 2 &&
        base &&
        compare &&
        (base.id === target.id || compare.id === target.id);

      contextMenu.innerHTML = '';
      if (hasComparisonSelection) {
        appendMenuItem('Compare', () => {
          vscode.postMessage({
            type: 'compare-selected',
            baseRefName: base.name,
            compareRefName: compare.name
          });
        });
        appendMenuItem('Show Log', () => {
          vscode.postMessage({
            type: 'show-log',
            baseRefName: base.name,
            compareRefName: compare.name
          });
        });
        appendMenuItem('Unified Diff', () => {
          vscode.postMessage({
            type: 'open-unified-diff',
            baseRefName: base.name,
            compareRefName: compare.name
          });
        });
        appendMenuItem('Clear Selection', () => {
          selected.splice(0, selected.length);
          syncSelection();
        });
      } else {
        appendMenuItem('Compare With Worktree', () => {
          vscode.postMessage({ type: 'compare-with-worktree', refName: target.name });
        });
        if (target.kind !== 'tag') {
          appendMenuItem('Checkout', () => {
            vscode.postMessage({ type: 'checkout', refName: target.name, refKind: target.kind });
          });
        }
        if (canSyncCurrentHead) {
          appendMenuItem('Sync with ' + currentHeadUpstreamName, () => {
            vscode.postMessage({ type: 'sync-current-head' });
          });
        }
        appendMenuItem('Create New Branch', () => {
          vscode.postMessage({ type: 'create-branch', refName: target.name, refKind: target.kind });
        });
        if (!isCurrentHead) {
          if (!(target.kind === 'remote' && target.name.endsWith('/HEAD'))) {
            const deleteLabel = target.kind === 'tag'
              ? 'Delete Tag: ' + target.name
              : target.kind === 'remote'
                ? 'Delete Remote Branch: ' + target.name
                : 'Delete Branch: ' + target.name;
            appendMenuItem(deleteLabel, () => {
              vscode.postMessage({ type: 'delete', refName: target.name, refKind: target.kind });
            });
          }
          if (!mergeBlockedTargets.has(target.kind + '::' + target.name)) {
            appendMenuItem('Merge Into ' + (currentHeadName || 'Current HEAD'), () => {
              vscode.postMessage({ type: 'merge', refName: target.name });
            });
          }
        }
        if (selected.length > 0) {
          appendMenuItem('Clear Selection', () => {
            selected.splice(0, selected.length);
            syncSelection();
          });
        }
      }
      contextMenu.style.left = clientX + 'px';
      contextMenu.style.top = clientY + 'px';
      contextMenu.classList.add('open');
    }

    function appendMenuItem(label, onClick, disabled = false) {
      const button = document.createElement('button');
      button.className = 'context-item';
      button.textContent = label;
      button.disabled = disabled;
      button.addEventListener('click', () => {
        onClick();
        closeContextMenu();
      });
      contextMenu.appendChild(button);
    }

    function closeContextMenu() {
      contextMenu.classList.remove('open');
      contextMenu.innerHTML = '';
    }

    function syncToolbarActions() {
      const canZoomIn = zoomLevels.some((value) => value > currentZoom);
      const canZoomOut = zoomLevels.some((value) => value < currentZoom);
      if (zoomInButton) {
        zoomInButton.disabled = !canZoomIn;
      }
      if (zoomOutButton) {
        zoomOutButton.disabled = !canZoomOut;
      }
    }

    function postMessageWithLoading(message, label) {
      showLoading(label);
      requestAnimationFrame(() => {
        vscode.postMessage(message);
      });
    }

    function showLoading(label) {
      if (typeof label === 'string' && loadingMessage) {
        loadingMessage.textContent = label;
      }
      if (loadingOverlay) {
        loadingOverlay.setAttribute('aria-hidden', 'false');
      }
      document.body.classList.add('loading');
      document.body.setAttribute('aria-busy', 'true');
      closeContextMenu();
    }

    function applyNodeLayout(persist = true) {
      for (const [hash, element] of nodeElements.entries()) {
        const defaultLeft = getDefaultNodeLeft(hash);
        const left = clampNodeLeft(hash, defaultLeft + Number(nodeOffsets[hash] || 0));
        nodeOffsets[hash] = left - defaultLeft;
        element.style.left = left + 'px';
      }
      updateEdges(edgeElements);
      updateScenePlacement();
      if (persist) {
        persistNodeLayout();
      }
      syncMinimap();
    }

    function persistNodeLayout() {
      const normalizedOffsets = {};
      for (const [hash] of nodeElements.entries()) {
        const offset = Number(nodeOffsets[hash] || 0);
        if (Math.abs(offset) > 0.5) {
          normalizedOffsets[hash] = offset;
        }
      }
      vscode.setState({ sceneLayoutKey, nodeOffsets: normalizedOffsets });
    }

    function autoArrangeLayout() {
      const positions = new Map(graphNodes.map((node) => [node.hash, node.defaultLeft]));
      const neighborMap = buildNeighborMap();
      for (let pass = 0; pass < 8; pass += 1) {
        relaxPositions(positions, graphNodes, neighborMap, false);
        relaxPositions(positions, [...graphNodes].reverse(), neighborMap, true);
        compactHorizontalSpread(positions, neighborMap);
        resolveRowOverlaps(positions);
      }
      for (const node of graphNodes) {
        const nextLeft = clampNodeLeft(node.hash, positions.get(node.hash) || node.defaultLeft);
        positions.set(node.hash, nextLeft);
        nodeOffsets[node.hash] = nextLeft - node.defaultLeft;
      }
      applyNodeLayout();
    }

    function buildNeighborMap() {
      const map = new Map();
      for (const node of graphNodes) {
        map.set(node.hash, []);
      }
      for (const edge of graphEdges) {
        if (map.has(edge.from)) {
          map.get(edge.from).push(edge.to);
        }
        if (map.has(edge.to)) {
          map.get(edge.to).push(edge.from);
        }
      }
      return map;
    }

    function buildDirectionalMap(edges, sourceKey, targetKey) {
      const map = new Map();
      for (const node of graphNodes) {
        map.set(node.hash, []);
      }
      for (const edge of edges) {
        const source = edge[sourceKey];
        const target = edge[targetKey];
        if (!map.has(source)) {
          map.set(source, []);
        }
        map.get(source).push(target);
      }
      return map;
    }

    function buildDistanceMap(startHash, adjacencyMap) {
      const distances = new Map([[startHash, 0]]);
      const queue = [startHash];
      while (queue.length > 0) {
        const hash = queue.shift();
        if (!hash) {
          continue;
        }
        const baseDistance = distances.get(hash) || 0;
        const nextHashes = adjacencyMap.get(hash) || [];
        for (const nextHash of nextHashes) {
          if (!distances.has(nextHash)) {
            distances.set(nextHash, baseDistance + 1);
            queue.push(nextHash);
          }
        }
      }
      return distances;
    }

    function getPrimaryAncestorPath(startHash) {
      const precomputedPath = primaryAncestorPathsByHash[startHash];
      return Array.isArray(precomputedPath) && precomputedPath.length > 0
        ? precomputedPath
        : tracePrimaryPath(startHash, 'ancestor');
    }

    function tracePrimaryPath(startHash, direction) {
      const path = [startHash];
      const visited = new Set(path);
      let currentHash = startHash;

      while (true) {
        const nextHash = selectPrimaryNeighbor(currentHash, visited, direction);
        if (!nextHash) {
          break;
        }
        path.push(nextHash);
        visited.add(nextHash);
        currentHash = nextHash;
      }

      return path;
    }

    function selectPrimaryNeighbor(currentHash, visited, direction) {
      const adjacencyMap = direction === 'ancestor' ? parentMap : childMap;
      const candidates = (adjacencyMap.get(currentHash) || []).filter((hash) => !visited.has(hash));
      if (candidates.length === 0) {
        return undefined;
      }

      const preferredCandidates = filterPreferredCandidates(currentHash, candidates, direction);
      const pool = preferredCandidates.length > 0 ? preferredCandidates : candidates;
      return [...pool].sort((leftHash, rightHash) =>
        scorePathCandidate(currentHash, leftHash, direction) - scorePathCandidate(currentHash, rightHash, direction)
      )[0];
    }

    function filterPreferredCandidates(currentHash, candidates, direction) {
      if (direction === 'descendant') {
        const onHeadPath = candidates.filter((hash) => headDistanceByHash.has(hash));
        return onHeadPath.length > 0 ? onHeadPath : [];
      }

      const currentHeadDistance = headDistanceByHash.get(currentHash);
      if (currentHeadDistance === undefined) {
        return [];
      }

      const forwardHeadPath = candidates.filter((hash) => {
        const candidateHeadDistance = headDistanceByHash.get(hash);
        return candidateHeadDistance !== undefined && candidateHeadDistance > currentHeadDistance;
      });
      return forwardHeadPath.length > 0 ? forwardHeadPath : [];
    }

    function scorePathCandidate(currentHash, candidateHash, direction) {
      const currentNode = graphNodeByHash.get(currentHash);
      const candidateNode = graphNodeByHash.get(candidateHash);
      const laneDelta = Math.abs((candidateNode?.lane || 0) - (currentNode?.lane || 0));
      const rowDistance = Math.abs((candidateNode?.row || 0) - (currentNode?.row || 0));
      const horizontalDistance = Math.abs((candidateNode?.defaultLeft || 0) - (currentNode?.defaultLeft || 0));
      const candidateHeadDistance = headDistanceByHash.get(candidateHash);

      if (direction === 'descendant' && candidateHeadDistance !== undefined) {
        return candidateHeadDistance * 10000 + laneDelta * 100 + rowDistance * 10 + horizontalDistance;
      }

      if (direction === 'ancestor') {
        const currentHeadDistance = headDistanceByHash.get(currentHash);
        if (currentHeadDistance !== undefined && candidateHeadDistance !== undefined) {
          return Math.abs(candidateHeadDistance - (currentHeadDistance + 1)) * 10000 + laneDelta * 100 + rowDistance * 10 + horizontalDistance;
        }
      }

      return laneDelta * 100 + rowDistance * 10 + horizontalDistance;
    }

    function buildPathEdgeKeys(path, direction) {
      const keys = new Set();
      for (let index = 0; index < path.length - 1; index += 1) {
        const currentHash = path[index];
        const nextHash = path[index + 1];
        const edgeKey = direction === 'ancestor'
          ? currentHash + '->' + nextHash
          : nextHash + '->' + currentHash;
        keys.add(edgeKey);
      }
      return keys;
    }

    function relaxPositions(positions, nodes, neighborMap, reverseBias) {
      for (const node of nodes) {
        const neighbors = neighborMap.get(node.hash) || [];
        if (neighbors.length === 0) {
          continue;
        }

        const sameLaneNeighbors = neighbors.filter((hash) => graphNodeByHash.get(hash)?.lane === node.lane);
        const effectiveNeighbors = sameLaneNeighbors.length > 0 ? sameLaneNeighbors : neighbors;
        const current = positions.get(node.hash) || node.defaultLeft;
        const neighborAverage =
          effectiveNeighbors.reduce((sum, hash) => sum + (positions.get(hash) || current), 0) / effectiveNeighbors.length;
        const laneBias = node.defaultLeft + (reverseBias ? -10 : 10) * Math.sign(neighborAverage - node.defaultLeft);
        const target = neighborAverage * 0.38 + laneBias * 0.62;
        positions.set(node.hash, clampNodeLeft(node.hash, current * 0.45 + target * 0.55));
      }
    }

    function resolveRowOverlaps(positions) {
      const rows = groupNodesByRow();
      for (const rowNodes of rows.values()) {
        const ordered = [...rowNodes]
          .sort((left, right) =>
            (positions.get(left.hash) || left.defaultLeft) - (positions.get(right.hash) || right.defaultLeft) ||
            left.defaultLeft - right.defaultLeft
          );
        if (ordered.length <= 1) {
          continue;
        }

        const resolved = ordered.map((node) => positions.get(node.hash) || node.defaultLeft);
        for (let index = 1; index < resolved.length; index += 1) {
          const previousNode = ordered[index - 1];
          const currentNode = ordered[index];
          const minGap = getMinimumGap(previousNode.hash, currentNode.hash);
          resolved[index] = Math.max(resolved[index], resolved[index - 1] + minGap);
        }

        const defaultCenter =
          ordered.reduce((sum, node) => sum + node.defaultLeft + getNodeWidth(node.hash) / 2, 0) / ordered.length;
        const resolvedCenter =
          resolved.reduce((sum, left, index) => sum + left + getNodeWidth(ordered[index].hash) / 2, 0) / resolved.length;
        const centered = resolved.map((left) => left + (defaultCenter - resolvedCenter));

        for (let index = 0; index < ordered.length; index += 1) {
          positions.set(ordered[index].hash, clampNodeLeft(ordered[index].hash, centered[index]));
        }
      }
    }

    function compactHorizontalSpread(positions, neighborMap) {
      if (graphNodes.length <= 1) {
        return;
      }
      const components = buildConnectedComponents(neighborMap);
      const spreadFactor = graphNodes.length >= 40 ? 0.62 : graphNodes.length >= 20 ? 0.72 : 0.84;

      for (const component of components) {
        const anchorX = getAutoLayoutAnchorX(positions, component);
        for (const hash of component) {
          const node = graphNodeByHash.get(hash);
          if (!node) {
            continue;
          }

          const current = positions.get(hash) || node.defaultLeft;
          const compressed = anchorX + (current - anchorX) * spreadFactor;
          positions.set(hash, clampNodeLeft(hash, compressed));
        }
      }
    }

    function groupNodesByRow() {
      const rows = new Map();
      for (const node of graphNodes) {
        if (!rows.has(node.row)) {
          rows.set(node.row, []);
        }
        rows.get(node.row).push(node);
      }
      return rows;
    }

    function buildConnectedComponents(neighborMap) {
      const components = [];
      const visited = new Set();

      for (const node of graphNodes) {
        if (visited.has(node.hash)) {
          continue;
        }

        const queue = [node.hash];
        const component = [];
        visited.add(node.hash);

        while (queue.length > 0) {
          const hash = queue.shift();
          if (!hash) {
            continue;
          }

          component.push(hash);
          for (const neighbor of neighborMap.get(hash) || []) {
            if (visited.has(neighbor)) {
              continue;
            }

            visited.add(neighbor);
            queue.push(neighbor);
          }
        }

        components.push(component);
      }

      return components;
    }

    function getAutoLayoutAnchorX(positions, component) {
      if (headNodeHash && component.includes(headNodeHash) && positions.has(headNodeHash)) {
        return positions.get(headNodeHash) || 0;
      }
      if (component.length === 0) {
        return 0;
      }
      return component.reduce((sum, hash) => {
        const node = graphNodeByHash.get(hash);
        if (!node) {
          return sum;
        }

        return sum + (positions.get(hash) || node.defaultLeft);
      }, 0) / component.length;
    }

    function updateEdges(elements) {
      for (const element of elements) {
        const fromHash = element.getAttribute('data-edge-from');
        const toHash = element.getAttribute('data-edge-to');
        if (!fromHash || !toHash) {
          continue;
        }
        element.setAttribute('d', buildEdgePath(fromHash, toHash));
      }
    }

    function buildEdgePath(fromHash, toHash) {
      const sourceX = getNodeCenterX(fromHash);
      const sourceY = getNodeSourceY(fromHash);
      const targetX = getNodeCenterX(toHash);
      const targetY = getNodeTargetY(toHash);
      const verticalSpan = Math.max(36, (targetY - sourceY) * 0.42);
      const horizontalBias = Math.min(140, Math.max(28, Math.abs(targetX - sourceX) * 0.28));
      const controlY1 = sourceY + verticalSpan;
      const controlY2 = targetY - verticalSpan;
      const controlX1 = targetX >= sourceX ? sourceX + horizontalBias : sourceX - horizontalBias;
      const controlX2 = targetX >= sourceX ? targetX - horizontalBias : targetX + horizontalBias;
      return 'M ' + sourceX + ' ' + sourceY + ' C ' + controlX1 + ' ' + controlY1 + ', ' + controlX2 + ' ' + controlY2 + ', ' + targetX + ' ' + targetY;
    }

    function syncCanvasSize() {
      const availableWidth = Math.max(
        baseCanvasWidth,
        Math.max(0, viewport.clientWidth - ${VIEWPORT_PADDING_LEFT} - ${VIEWPORT_PADDING_RIGHT}) / currentZoom
      );
      const availableHeight = Math.max(
        baseCanvasHeight,
        Math.max(0, viewport.clientHeight - ${VIEWPORT_PADDING_TOP} - ${VIEWPORT_PADDING_BOTTOM}) / currentZoom
      );
      canvas.style.width = availableWidth + 'px';
      canvas.style.height = availableHeight + 'px';
    }

    function updateScenePlacement() {
      const bounds = getGraphBounds();
      const canvasWidth = getCanvasWidth();
      const canvasHeight = getCanvasHeight();
      const headAnchor = getHeadAnchorBounds();
      const preferredCenterX = headAnchor ? headAnchor.centerX : (bounds.minX + bounds.maxX) / 2;
      const preferredCenterY = headAnchor ? headAnchor.centerY : (bounds.minY + bounds.maxY) / 2;
      const maxOffsetX = Math.max(0, canvasWidth - baseCanvasWidth);
      const maxOffsetY = Math.max(0, canvasHeight - baseCanvasHeight);
      layoutOffsetX = clamp(preferredCenterX ? canvasWidth / 2 - preferredCenterX : 0, 0, maxOffsetX);
      layoutOffsetY = clamp(preferredCenterY ? canvasHeight / 2 - preferredCenterY : 0, 0, maxOffsetY);
      sceneLayer.style.transform = 'translate(' + layoutOffsetX + 'px, ' + layoutOffsetY + 'px)';
    }

    function centerGraphInViewport() {
      const bounds = getDisplayedGraphBounds();
      const displayedHeadAnchor = getDisplayedHeadAnchorBounds();
      const targetCenterX = displayedHeadAnchor ? displayedHeadAnchor.centerX : (bounds.minX + bounds.maxX) / 2;
      const targetCenterY = displayedHeadAnchor ? displayedHeadAnchor.centerY : (bounds.minY + bounds.maxY) / 2;
      const visibleWidth = Math.max(0, viewport.clientWidth - ${VIEWPORT_PADDING_LEFT} - ${VIEWPORT_PADDING_RIGHT});
      const visibleHeight = Math.max(0, viewport.clientHeight - ${VIEWPORT_PADDING_TOP} - ${VIEWPORT_PADDING_BOTTOM});
      viewport.scrollLeft = Math.max(
        0,
        ${VIEWPORT_PADDING_LEFT} + targetCenterX * currentZoom - visibleWidth / 2
      );
      viewport.scrollTop = Math.max(
        0,
        ${VIEWPORT_PADDING_TOP} + targetCenterY * currentZoom - visibleHeight / 2
      );
      syncMinimap();
    }

    function getGraphBounds() {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const [hash] of nodeElements.entries()) {
        const left = getNodeLeft(hash);
        const top = getNodeTop(hash);
        minX = Math.min(minX, left);
        maxX = Math.max(maxX, left + getNodeWidth(hash));
        minY = Math.min(minY, top);
        maxY = Math.max(maxY, top + getNodeHeight(hash));
      }
      if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
        return { minX: 0, maxX: baseCanvasWidth, minY: 0, maxY: baseCanvasHeight };
      }
      return { minX, maxX, minY, maxY };
    }

    function getDisplayedGraphBounds() {
      const bounds = getGraphBounds();
      return {
        minX: bounds.minX + layoutOffsetX,
        maxX: bounds.maxX + layoutOffsetX,
        minY: bounds.minY + layoutOffsetY,
        maxY: bounds.maxY + layoutOffsetY
      };
    }

    function getHeadAnchorBounds() {
      if (!headNodeHash || !nodeElements.has(headNodeHash)) {
        return null;
      }
      const top = getNodeTop(headNodeHash);
      const left = getNodeLeft(headNodeHash);
      return {
        centerX: left + getNodeWidth(headNodeHash) / 2,
        centerY: top + getNodeHeight(headNodeHash) / 2
      };
    }

    function getDisplayedHeadAnchorBounds() {
      const headBounds = getHeadAnchorBounds();
      if (!headBounds) {
        return null;
      }
      return {
        centerX: headBounds.centerX + layoutOffsetX,
        centerY: headBounds.centerY + layoutOffsetY
      };
    }

    function getNodeCenterX(hash) {
      return getNodeLeft(hash) + getNodeWidth(hash) / 2;
    }

    function getNodeSourceY(hash) {
      return getNodeTop(hash) + getNodeHeight(hash) - ${EDGE_VERTICAL_INSET};
    }

    function getNodeTargetY(hash) {
      return getNodeTop(hash) + ${EDGE_VERTICAL_INSET};
    }

    function getNodeLeft(hash) {
      const element = nodeElements.get(hash);
      if (!element) {
        return 0;
      }
      return Number(element.style.left.replace('px', '')) || getDefaultNodeLeft(hash);
    }

    function getNodeTop(hash) {
      const element = nodeElements.get(hash);
      if (!element) {
        return 0;
      }
      return Number(element.dataset.defaultTop || 0);
    }

    function getDefaultNodeLeft(hash) {
      const element = nodeElements.get(hash);
      if (!element) {
        return 0;
      }
      return Number(element.dataset.defaultLeft || 0);
    }

    function getNodeWidth(hash) {
      const element = nodeElements.get(hash);
      if (element) {
        return element.offsetWidth || Number(element.dataset.nodeWidth || 0) || ${NODE_MIN_WIDTH};
      }
      const node = graphNodeByHash.get(hash);
      return node ? node.width : ${NODE_MIN_WIDTH};
    }

    function getNodeHeight(hash) {
      const element = nodeElements.get(hash);
      if (element) {
        return element.offsetHeight || Number(element.dataset.nodeHeight || 0) || ${REF_LINE_HEIGHT};
      }
      const node = graphNodeByHash.get(hash);
      return node ? node.height : ${REF_LINE_HEIGHT};
    }

    function getMinimumGap(leftHash, rightHash) {
      return getNodeWidth(leftHash) / 2 + getNodeWidth(rightHash) / 2 + ${NODE_HORIZONTAL_GAP};
    }

    function clampNodeOffset(hash, defaultLeft, offset) {
      const clampedLeft = clampNodeLeft(hash, defaultLeft + offset);
      return clampedLeft - defaultLeft;
    }

    function clampNodeLeft(hash, left) {
      const nodeWidth = getNodeWidth(hash);
      return Math.max(0, Math.min(getCanvasWidth() - nodeWidth, left));
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function getCanvasWidth() {
      return Number(canvas.style.width.replace('px', '')) || baseCanvasWidth;
    }

    function getCanvasHeight() {
      return Number(canvas.style.height.replace('px', '')) || baseCanvasHeight;
    }

    function getReference(refId) {
      return references.find((ref) => ref.id === refId);
    }

    function syncMinimap() {}
  </script>`;
}
