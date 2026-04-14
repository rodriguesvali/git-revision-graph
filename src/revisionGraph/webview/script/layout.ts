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
      expandHorizontalSpreadToViewport(positions, neighborMap);
      resolveRowOverlaps(positions);
      for (const node of graphNodes) {
        const nextLeft = clampNodeLeft(node.hash, positions.get(node.hash) || node.defaultLeft);
        positions.set(node.hash, nextLeft);
        nodeOffsets[node.hash] = nextLeft - node.defaultLeft;
	      }
	      applyNodeLayout();
	    }

	    function autoArrangeTortoiseLayout() {
	      const neighborMap = buildNeighborMap();
	      const familyAssignments = buildNodeFamilyAssignments(neighborMap);
	      const familyAnchors = buildFamilyAnchorMap(familyAssignments);
	      if (familyAnchors.size === 0) {
	        autoArrangeLayout();
	        return;
	      }

	      const positions = new Map(graphNodes.map((node) => [node.hash, node.defaultLeft]));
	      seedTortoisePositions(positions, familyAssignments, familyAnchors);
	      for (let pass = 0; pass < 6; pass += 1) {
	        relaxTortoisePositions(positions, graphNodes, neighborMap, familyAssignments, familyAnchors);
	        relaxTortoisePositions(positions, [...graphNodes].reverse(), neighborMap, familyAssignments, familyAnchors);
	        pullFamiliesTowardAnchors(positions, familyAssignments, familyAnchors, 0.18);
	        resolveRowOverlaps(positions);
	      }

	      pullFamiliesTowardAnchors(positions, familyAssignments, familyAnchors, 0.5);
	      resolveRowOverlaps(positions);
	      for (const node of graphNodes) {
	        const nextLeft = clampNodeLeft(node.hash, positions.get(node.hash) || node.defaultLeft);
	        positions.set(node.hash, nextLeft);
	        nodeOffsets[node.hash] = nextLeft - node.defaultLeft;
	      }
	      applyNodeLayout();
	    }

	    function seedTortoisePositions(positions, familyAssignments, familyAnchors) {
	      for (const node of graphNodes) {
	        const family = familyAssignments.get(node.hash);
	        const anchor = family ? familyAnchors.get(family) : undefined;
	        if (anchor === undefined) {
	          continue;
	        }

	        const width = getNodeWidth(node.hash);
	        const anchorLeft = anchor - width / 2;
	        const explicitFamily = getExplicitNodeFamily(node);
	        const weight = explicitFamily ? 0.78 : 0.48;
	        positions.set(
	          node.hash,
	          clampNodeLeft(node.hash, node.defaultLeft * (1 - weight) + anchorLeft * weight)
	        );
	      }
	    }

	    function relaxTortoisePositions(positions, nodes, neighborMap, familyAssignments, familyAnchors) {
	      for (const node of nodes) {
	        const neighbors = neighborMap.get(node.hash) || [];
	        const currentLeft = positions.get(node.hash) || node.defaultLeft;
	        const nodeWidth = getNodeWidth(node.hash);
	        const currentCenter = currentLeft + nodeWidth / 2;
	        const defaultCenter = node.defaultLeft + nodeWidth / 2;
	        const family = familyAssignments.get(node.hash);
	        const familyAnchor = family ? familyAnchors.get(family) : undefined;
	        const sameFamilyNeighbors = family
	          ? neighbors.filter((hash) => familyAssignments.get(hash) === family)
	          : [];
	        const effectiveNeighbors = sameFamilyNeighbors.length > 0 ? sameFamilyNeighbors : neighbors;
	        const neighborCenter = effectiveNeighbors.length > 0
	          ? effectiveNeighbors.reduce((sum, hash) => sum + ((positions.get(hash) || getDefaultNodeLeft(hash)) + getNodeWidth(hash) / 2), 0) / effectiveNeighbors.length
	          : currentCenter;
	        const familyBias = familyAnchor === undefined
	          ? defaultCenter
	          : effectiveNeighbors.length > 0
	            ? familyAnchor * 0.64 + neighborCenter * 0.36
	            : familyAnchor;
	        const targetCenter = effectiveNeighbors.length > 0
	          ? neighborCenter * 0.48 + familyBias * 0.42 + defaultCenter * 0.1
	          : familyBias * 0.82 + defaultCenter * 0.18;
	        const targetLeft = targetCenter - nodeWidth / 2;
	        positions.set(node.hash, clampNodeLeft(node.hash, currentLeft * 0.28 + targetLeft * 0.72));
	      }
	    }

	    function pullFamiliesTowardAnchors(positions, familyAssignments, familyAnchors, weight) {
	      for (const node of graphNodes) {
	        const family = familyAssignments.get(node.hash);
	        const anchor = family ? familyAnchors.get(family) : undefined;
	        if (anchor === undefined) {
	          continue;
	        }

	        const currentLeft = positions.get(node.hash) || node.defaultLeft;
	        const anchorLeft = anchor - getNodeWidth(node.hash) / 2;
	        positions.set(
	          node.hash,
	          clampNodeLeft(node.hash, currentLeft * (1 - weight) + anchorLeft * weight)
	        );
	      }
	    }

	    function buildNodeFamilyAssignments(neighborMap) {
	      const explicitFamilyByHash = new Map();
	      const bestCandidateByHash = new Map();
	      const queue = [];

	      for (const node of graphNodes) {
	        const explicitFamily = getExplicitNodeFamily(node);
	        if (!explicitFamily) {
	          continue;
	        }

	        const seed = {
	          hash: node.hash,
	          family: explicitFamily.key,
	          distance: 0,
	          priority: explicitFamily.priority,
	          sourceRow: node.row
	        };
	        explicitFamilyByHash.set(node.hash, explicitFamily.key);
	        bestCandidateByHash.set(node.hash, seed);
	        queue.push(seed);
	      }

	      queue.sort(compareFamilyCandidates);

	      while (queue.length > 0) {
	        const current = queue.shift();
	        if (!current) {
	          continue;
	        }

	        for (const neighborHash of neighborMap.get(current.hash) || []) {
	          const explicitFamily = explicitFamilyByHash.get(neighborHash);
	          if (explicitFamily && explicitFamily !== current.family) {
	            continue;
	          }

	          const candidate = {
	            hash: neighborHash,
	            family: current.family,
	            distance: current.distance + 1,
	            priority: current.priority,
	            sourceRow: current.sourceRow
	          };
	          const currentBest = bestCandidateByHash.get(neighborHash);
	          if (currentBest && !isBetterFamilyCandidate(candidate, currentBest)) {
	            continue;
	          }

	          bestCandidateByHash.set(neighborHash, candidate);
	          queue.push(candidate);
	          queue.sort(compareFamilyCandidates);
	        }
	      }

	      return new Map([...bestCandidateByHash.entries()].map(([hash, candidate]) => [hash, candidate.family]));
	    }

	    function buildFamilyAnchorMap(familyAssignments) {
	      const familyStats = new Map();
	      let totalCenter = 0;
	      let totalCount = 0;

	      for (const node of graphNodes) {
	        const family = familyAssignments.get(node.hash);
	        if (!family) {
	          continue;
	        }

	        const explicitFamily = getExplicitNodeFamily(node);
	        const center = node.defaultLeft + getNodeWidth(node.hash) / 2;
	        const stats = familyStats.get(family) || {
	          family,
	          priority: explicitFamily ? explicitFamily.priority : 99,
	          totalCenter: 0,
	          count: 0
	        };
	        stats.priority = explicitFamily ? Math.min(stats.priority, explicitFamily.priority) : stats.priority;
	        stats.totalCenter += center;
	        stats.count += 1;
	        familyStats.set(family, stats);
	        totalCenter += center;
	        totalCount += 1;
	      }

	      if (familyStats.size === 0) {
	        return new Map();
	      }

	      const orderedFamilies = [...familyStats.values()]
	        .map((stats) => ({
	          ...stats,
	          averageCenter: stats.count > 0 ? stats.totalCenter / stats.count : 0
	        }))
	        .sort((left, right) =>
	          left.averageCenter - right.averageCenter ||
	          left.priority - right.priority ||
	          left.family.localeCompare(right.family)
	        );

	      const headFamily = currentHeadName
	        ? 'branch:' + currentHeadName
	        : headNodeHash
	          ? familyAssignments.get(headNodeHash)
	          : undefined;
	      const headIndex = headFamily
	        ? orderedFamilies.findIndex((stats) => stats.family === headFamily)
	        : -1;
	      const anchorCenter = headFamily && headIndex >= 0
	        ? orderedFamilies[headIndex].averageCenter
	        : totalCount > 0
	          ? totalCenter / totalCount
	          : getCanvasWidth() / 2;
	      const spacing = computeFamilySpacing();
	      const normalizedHeadIndex = headIndex >= 0 ? headIndex : Math.floor(orderedFamilies.length / 2);
	      const anchors = new Map();

	      for (const [index, stats] of orderedFamilies.entries()) {
	        anchors.set(stats.family, anchorCenter + (index - normalizedHeadIndex) * spacing);
	      }

	      return anchors;
	    }

	    function getExplicitNodeFamily(node) {
	      const reference = pickNodeFamilyReference(node.refs);
	      if (!reference) {
	        return undefined;
	      }

	      switch (reference.kind) {
	        case 'head':
	          return { key: 'branch:' + reference.name, priority: 0 };
	        case 'branch':
	          return { key: 'branch:' + reference.name, priority: 1 };
	        case 'remote':
	          return { key: 'branch:' + getRemoteFamilyName(reference.name), priority: 2 };
	        case 'stash':
	          return { key: 'stash:stash', priority: 3 };
	        case 'tag':
	          return { key: 'tag:' + reference.name, priority: 4 };
	      }
	    }

	    function pickNodeFamilyReference(refs) {
	      return refs.find((ref) => ref.kind === 'head' || ref.kind === 'branch')
	        || refs.find((ref) => ref.kind === 'remote')
	        || refs.find((ref) => ref.kind === 'stash')
	        || refs.find((ref) => ref.kind === 'tag');
	    }

	    function getRemoteFamilyName(refName) {
	      const slashIndex = refName.indexOf('/');
	      if (slashIndex < 0 || slashIndex === refName.length - 1) {
	        return refName;
	      }

	      const suffix = refName.slice(slashIndex + 1);
	      return suffix === 'HEAD' ? refName : suffix;
	    }

	    function computeFamilySpacing() {
	      const maxWidth = graphNodes.reduce((max, node) => Math.max(max, getNodeWidth(node.hash)), 0);
	      return clamp(maxWidth + 56, 168, 252);
	    }

	    function compareFamilyCandidates(left, right) {
	      return left.distance - right.distance
	        || left.priority - right.priority
	        || left.sourceRow - right.sourceRow
	        || left.family.localeCompare(right.family);
	    }

	    function isBetterFamilyCandidate(candidate, currentBest) {
	      const targetRow = graphNodeByHash.get(candidate.hash)?.row || 0;
	      const candidateRowDistance = Math.abs(candidate.sourceRow - targetRow);
	      const currentRowDistance = Math.abs(currentBest.sourceRow - targetRow);
	      return candidate.distance < currentBest.distance
	        || (
	          candidate.distance === currentBest.distance
	          && (
	            candidate.priority < currentBest.priority
	            || (
	              candidate.priority === currentBest.priority
	              && (
	                candidateRowDistance < currentRowDistance
	                || (
	                  candidateRowDistance === currentRowDistance
	                  && candidate.family.localeCompare(currentBest.family) < 0
	                )
	              )
	            )
	          )
	        );
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
      const spreadFactor = graphNodes.length >= 40 ? 0.8 : graphNodes.length >= 20 ? 0.88 : 0.94;

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

    function expandHorizontalSpreadToViewport(positions, neighborMap) {
      if (graphNodes.length <= 1) {
        return;
      }

      const components = buildConnectedComponents(neighborMap);
      const canvasWidth = getCanvasWidth();
      for (const component of components) {
        if (component.length <= 1) {
          continue;
        }

        const ordered = [...component]
          .map((hash) => graphNodeByHash.get(hash))
          .filter((node) => !!node)
          .sort((left, right) =>
            (positions.get(left.hash) || left.defaultLeft) - (positions.get(right.hash) || right.defaultLeft) ||
            left.defaultLeft - right.defaultLeft
          );

        if (ordered.length <= 1) {
          continue;
        }

        const bounds = getPositionBounds(ordered, positions);
        const usedWidth = bounds.maxX - bounds.minX;
        const availableWidth = Math.max(0, canvasWidth - 24);
        if (availableWidth <= usedWidth + 24) {
          continue;
        }

        const anchorX = getAutoLayoutAnchorX(positions, component);
        const extraWidth = Math.min(availableWidth - usedWidth, usedWidth * 0.42);
        const expansionFactor = 1 + extraWidth / Math.max(1, usedWidth);

        for (const node of ordered) {
          const current = positions.get(node.hash) || node.defaultLeft;
          const expanded = anchorX + (current - anchorX) * expansionFactor;
          positions.set(node.hash, clampNodeLeft(node.hash, expanded));
        }
      }
    }

    function getPositionBounds(nodes, positions) {
      let minX = Infinity;
      let maxX = -Infinity;
      for (const node of nodes) {
        const left = positions.get(node.hash) || node.defaultLeft;
        minX = Math.min(minX, left);
        maxX = Math.max(maxX, left + getNodeWidth(node.hash));
      }
      if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
        return { minX: 0, maxX: 0 };
      }
      return { minX, maxX };
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
	      return 'M ' + sourceX + ' ' + sourceY + ' L ' + targetX + ' ' + targetY;
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
