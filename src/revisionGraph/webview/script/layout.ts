import {
  EDGE_VERTICAL_INSET,
  NODE_HORIZONTAL_GAP,
  NODE_MIN_WIDTH,
  REF_LINE_HEIGHT,
  VIEWPORT_PADDING_BOTTOM,
  VIEWPORT_PADDING_LEFT,
  VIEWPORT_PADDING_RIGHT,
  VIEWPORT_PADDING_TOP
} from '../shared';

export function renderRevisionGraphScriptLayout(): string {
  return `
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
      centerViewportOnPoint(targetCenterX, targetCenterY);
    }

    function centerNodeInViewport(hash) {
      if (!hash || !nodeElements.has(hash)) {
        return;
      }

      centerViewportOnPoint(
        getNodeLeft(hash) + getNodeWidth(hash) / 2 + layoutOffsetX,
        getNodeTop(hash) + getNodeHeight(hash) / 2 + layoutOffsetY
      );
    }

    function centerViewportOnPoint(targetCenterX, targetCenterY) {
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
  `;
}
