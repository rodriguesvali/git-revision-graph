const NODE_MIN_WIDTH = 128;
const REF_LINE_HEIGHT = 25;
    function applyNodeLayout(persist = true, options = {}) {
      for (const [hash, element] of nodeElements.entries()) {
        const defaultLeft = getDefaultNodeLeft(hash);
        const left = clampNodeLeft(hash, defaultLeft + Number(nodeOffsets[hash] || 0));
        nodeOffsets[hash] = left - defaultLeft;
        element.style.left = left + 'px';
      }
      updateEdges(edgeElements);
      if (options.updateScenePlacement !== false) {
        updateScenePlacement();
      }
      if (persist) {
        persistNodeLayout();
      }
      if (options.syncMinimap !== false) {
        syncMinimap();
      }
    }

    function persistNodeLayout() {
      const normalizedOffsets = {};
      for (const layout of graphNodes) {
        const offset = Number(nodeOffsets[layout.hash] || 0);
        if (Math.abs(offset) > 0.5) {
          normalizedOffsets[layout.hash] = offset;
        }
      }
      persistRevisionGraphNodeOffsets(vscode, sceneLayoutKey, normalizedOffsets);
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
	      const sourceHash = toHash;
	      const targetHash = fromHash;
        const edge = graphEdgeByKey.get(fromHash + '->' + toHash);
        const sourceNode = graphNodeByHash.get(sourceHash);
        const targetNode = graphNodeByHash.get(targetHash);
        if (
          edge &&
          sourceNode &&
          targetNode &&
          !hasNodeHorizontalOffset(sourceHash) &&
          !hasNodeHorizontalOffset(targetHash)
        ) {
          const routedPath = describeRoutedEdgePath(edge, sourceNode, targetNode);
          if (routedPath) {
            return routedPath;
          }
        }

	      const sourceX = getNodeCenterX(sourceHash);
	      const targetX = getNodeCenterX(targetHash);
	      const sourceTop = getNodeTop(sourceHash);
	      const sourceHeight = getNodeHeight(sourceHash);
	      const targetTop = getNodeTop(targetHash);
	      const targetHeight = getNodeHeight(targetHash);
	      const connectsDownward = sourceTop + sourceHeight / 2 <= targetTop + targetHeight / 2;
	      const sourceY = connectsDownward
        ? sourceTop + sourceHeight - EDGE_VERTICAL_INSET
        : sourceTop + EDGE_VERTICAL_INSET;
	      const targetY = connectsDownward
        ? targetTop + EDGE_VERTICAL_INSET
        : targetTop + targetHeight - EDGE_VERTICAL_INSET;
	      return describeEdgePath(sourceX, sourceY, targetX, targetY);
	    }

    function hasNodeHorizontalOffset(hash) {
      return Math.abs(Number(nodeOffsets[hash] || 0)) > 0.5;
    }

    function readViewportLayoutSize() {
      const width = viewport ? viewport.clientWidth : 0;
      const height = viewport ? viewport.clientHeight : 0;
      viewportClientWidth = Math.max(0, Number(width) || 0);
      viewportClientHeight = Math.max(0, Number(height) || 0);
      return { width: viewportClientWidth, height: viewportClientHeight };
    }

    function getViewportLayoutSize() {
      const fallbackWidth = Math.max(0, Number(window.innerWidth) || 0);
      const fallbackHeight = Math.max(0, Number(window.innerHeight) || 0);
      return {
        width: viewportClientWidth > 0 ? viewportClientWidth : fallbackWidth,
        height: viewportClientHeight > 0 ? viewportClientHeight : fallbackHeight
      };
    }

    function getVisibleViewportSize() {
      const viewportSize = getViewportLayoutSize();
      return {
        width: Math.max(0, viewportSize.width - VIEWPORT_PADDING_LEFT - VIEWPORT_PADDING_RIGHT),
        height: Math.max(0, viewportSize.height - VIEWPORT_PADDING_TOP - VIEWPORT_PADDING_BOTTOM)
      };
    }

    function syncCanvasSize() {
      traceWebviewPhase('webview.canvas-layout.sync-size', () => {
        const visibleSize = getVisibleViewportSize();
        const availableWidth = Math.max(baseCanvasWidth, visibleSize.width / currentZoom);
        const availableHeight = Math.max(baseCanvasHeight, visibleSize.height / currentZoom);
        canvas.style.width = availableWidth + 'px';
        canvas.style.height = availableHeight + 'px';
      });
    }

    function updateScenePlacement(options = {}) {
      traceWebviewPhase('webview.canvas-layout.scene-placement', () => {
        const useLayoutSource = options.source === 'layout';
        const bounds = useLayoutSource ? getGraphLayoutBounds() : getGraphBounds();
        const canvasWidth = getCanvasWidth();
        const canvasHeight = getCanvasHeight();
        const headAnchor = useLayoutSource ? getHeadLayoutAnchorBounds() : getHeadAnchorBounds();
        const preferredCenterX = headAnchor ? headAnchor.centerX : (bounds.minX + bounds.maxX) / 2;
        const preferredCenterY = headAnchor ? headAnchor.centerY : (bounds.minY + bounds.maxY) / 2;
        const maxOffsetX = Math.max(0, canvasWidth - baseCanvasWidth);
        const maxOffsetY = Math.max(0, canvasHeight - baseCanvasHeight);
        layoutOffsetX = clamp(preferredCenterX ? canvasWidth / 2 - preferredCenterX : 0, 0, maxOffsetX);
        layoutOffsetY = clamp(preferredCenterY ? canvasHeight / 2 - preferredCenterY : 0, 0, maxOffsetY);
        sceneLayer.style.transform = 'translate(' + layoutOffsetX + 'px, ' + layoutOffsetY + 'px)';
      });
    }

    function centerGraphInViewport(options = {}) {
      const useLayoutSource = options.source === 'layout';
      const bounds = useLayoutSource ? getDisplayedGraphLayoutBounds() : getDisplayedGraphBounds();
      const displayedHeadAnchor = useLayoutSource ? getDisplayedHeadLayoutAnchorBounds() : getDisplayedHeadAnchorBounds();
      const targetCenterX = displayedHeadAnchor ? displayedHeadAnchor.centerX : (bounds.minX + bounds.maxX) / 2;
      const targetCenterY = displayedHeadAnchor ? displayedHeadAnchor.centerY : (bounds.minY + bounds.maxY) / 2;
      centerViewportOnPoint(targetCenterX, targetCenterY, options);
    }

    function centerNodeInViewport(hash) {
      if (!hash || !graphNodeByHash.has(hash)) {
        return;
      }

      centerViewportOnPoint(
        getNodeLeft(hash) + getNodeWidth(hash) / 2 + layoutOffsetX,
        getNodeTop(hash) + getNodeHeight(hash) / 2 + layoutOffsetY
      );
    }

    function centerViewportOnPoint(targetCenterX, targetCenterY, options = {}) {
      const visibleSize = getVisibleViewportSize();
      const visibleWidth = visibleSize.width;
      const visibleHeight = visibleSize.height;
      const nextScrollLeft = Math.max(
        0,
        VIEWPORT_PADDING_LEFT + targetCenterX * currentZoom - visibleWidth / 2
      );
      const nextScrollTop = Math.max(
        0,
        VIEWPORT_PADDING_TOP + targetCenterY * currentZoom - visibleHeight / 2
      );
      const shouldScroll =
        Math.abs(viewport.scrollLeft - nextScrollLeft) > 0.5 ||
        Math.abs(viewport.scrollTop - nextScrollTop) > 0.5;
      traceWebviewPhase('webview.viewport-frame.scroll', () => {
        if (shouldScroll) {
          if (typeof viewport.scrollTo === 'function') {
            viewport.scrollTo({ left: nextScrollLeft, top: nextScrollTop, behavior: 'auto' });
          } else {
            viewport.scrollLeft = nextScrollLeft;
            viewport.scrollTop = nextScrollTop;
          }
        }
      }, shouldScroll ? 'action=scroll' : 'action=skip');
      if (options.syncMinimap !== false) {
        syncMinimap('viewport');
      }
    }

    function getGraphBounds() {
      return getGraphLayoutBounds();
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

    function getGraphLayoutBounds() {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const layout of graphNodes) {
        const left = layout.defaultLeft + Number(nodeOffsets[layout.hash] || 0);
        const top = layout.defaultTop;
        minX = Math.min(minX, left);
        maxX = Math.max(maxX, left + layout.width);
        minY = Math.min(minY, top);
        maxY = Math.max(maxY, top + layout.height);
      }
      if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
        return { minX: 0, maxX: baseCanvasWidth, minY: 0, maxY: baseCanvasHeight };
      }
      return { minX, maxX, minY, maxY };
    }

    function getDisplayedGraphLayoutBounds() {
      const bounds = getGraphLayoutBounds();
      return {
        minX: bounds.minX + layoutOffsetX,
        maxX: bounds.maxX + layoutOffsetX,
        minY: bounds.minY + layoutOffsetY,
        maxY: bounds.maxY + layoutOffsetY
      };
    }

    function getHeadAnchorBounds() {
      if (!headNodeHash || !graphNodeByHash.has(headNodeHash)) {
        return null;
      }
      const top = getNodeTop(headNodeHash);
      const left = getNodeLeft(headNodeHash);
      return {
        centerX: left + getNodeWidth(headNodeHash) / 2,
        centerY: top + getNodeHeight(headNodeHash) / 2
      };
    }

    function getHeadLayoutAnchorBounds() {
      const currentHeadHash = getCurrentHeadNodeHash();
      const layout = currentHeadHash ? graphNodeByHash.get(currentHeadHash) : null;
      if (!layout) {
        return null;
      }
      const left = layout.defaultLeft + Number(nodeOffsets[layout.hash] || 0);
      return {
        centerX: left + layout.width / 2,
        centerY: layout.defaultTop + layout.height / 2
      };
    }

    function getDisplayedHeadLayoutAnchorBounds() {
      const headBounds = getHeadLayoutAnchorBounds();
      if (!headBounds) {
        return null;
      }
      return {
        centerX: headBounds.centerX + layoutOffsetX,
        centerY: headBounds.centerY + layoutOffsetY
      };
    }

    function getCurrentHeadNodeHash() {
      const headReference =
        references.find((ref) => ref.kind === 'head') ||
        references.find((ref) => currentHeadName && ref.name === currentHeadName) ||
        null;
      return headReference ? headReference.hash : null;
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

    function getNodeLeft(hash) {
      const element = nodeElements.get(hash);
      if (!element) {
        const layout = graphNodeByHash.get(hash);
        return layout ? layout.defaultLeft + Number(nodeOffsets[hash] || 0) : 0;
      }
      return Number(element.style.left.replace('px', '')) || getDefaultNodeLeft(hash);
    }

    function getNodeTop(hash) {
      const element = nodeElements.get(hash);
      if (!element) {
        const layout = graphNodeByHash.get(hash);
        return layout ? layout.defaultTop : 0;
      }
      return Number(element.dataset.defaultTop || 0);
    }

    function getDefaultNodeLeft(hash) {
      const element = nodeElements.get(hash);
      if (!element) {
        const layout = graphNodeByHash.get(hash);
        return layout ? layout.defaultLeft : 0;
      }
      return Number(element.dataset.defaultLeft || 0);
    }

    function getNodeWidth(hash) {
      const element = nodeElements.get(hash);
      if (element) {
        return Number(element.dataset.nodeWidth || 0) || element.offsetWidth || NODE_MIN_WIDTH;
      }
      const node = graphNodeByHash.get(hash);
      return node ? node.width : NODE_MIN_WIDTH;
    }

    function getNodeHeight(hash) {
      const element = nodeElements.get(hash);
      if (element) {
        return Number(element.dataset.nodeHeight || 0) || element.offsetHeight || REF_LINE_HEIGHT;
      }
      const node = graphNodeByHash.get(hash);
      return node ? node.height : REF_LINE_HEIGHT;
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
      return references.find((ref) => ref.id === refId && isReferenceVisible(ref));
    }

    function syncMinimap(mode = 'full') {
      pendingMinimapSyncMode =
        pendingMinimapSyncMode === 'full' || mode === 'full'
          ? 'full'
          : 'viewport';
      if (pendingMinimapSyncFrame) {
        return;
      }

      pendingMinimapSyncFrame = requestAnimationFrame(() => {
        const nextMode = pendingMinimapSyncMode === 'viewport' ? 'viewport' : 'full';
        pendingMinimapSyncFrame = 0;
        pendingMinimapSyncMode = 'none';
        renderMinimap(nextMode);
      });
    }

    function renderMinimap(mode = 'full') {
      if (
        !graphMinimap ||
        !minimapSvg ||
        !minimapEdgeLayer ||
        !minimapNodeLayer ||
        !minimapViewport ||
        !minimapEnabled ||
        !currentState ||
        currentState.viewMode !== 'ready' ||
        graphNodes.length === 0
      ) {
        if (graphMinimap) {
          graphMinimap.hidden = true;
        }
        return;
      }

      const transform = getMinimapTransform();
      if (!transform) {
        graphMinimap.hidden = true;
        return;
      }

      graphMinimap.hidden = false;
      const shouldRenderContent = mode === 'full' || minimapNodeLayer.innerHTML.length === 0;
      if (shouldRenderContent) {
        minimapSvg.setAttribute('viewBox', '0 0 ' + transform.width + ' ' + transform.height);
        minimapSvg.style.width = transform.width + 'px';
        minimapSvg.style.height = transform.height + 'px';
        minimapEdgeLayer.innerHTML = graphEdges
          .map((edge) => renderMinimapEdge(edge, transform))
          .join('');
        minimapNodeLayer.innerHTML = graphNodes
          .map((layout) => renderMinimapNode(layout.hash, transform))
          .join('');
      }
      syncMinimapViewport(transform);
      if (!minimapDragState) {
        ensureMinimapViewportVisible(transform);
      }
    }

    function renderMinimapEdge(edge, transform) {
      if (!graphNodeByHash.has(edge.from) || !graphNodeByHash.has(edge.to)) {
        return '';
      }

      const sourceX = transform.mapX(getNodeCenterX(edge.from) + layoutOffsetX);
      const sourceY = transform.mapY(getNodeTop(edge.from) + getNodeHeight(edge.from) / 2 + layoutOffsetY);
      const targetX = transform.mapX(getNodeCenterX(edge.to) + layoutOffsetX);
      const targetY = transform.mapY(getNodeTop(edge.to) + getNodeHeight(edge.to) / 2 + layoutOffsetY);
      return '<line class="minimap-edge" x1="' + sourceX + '" y1="' + sourceY + '" x2="' + targetX + '" y2="' + targetY + '"></line>';
    }

    function renderMinimapNode(hash, transform) {
      const left = getNodeLeft(hash) + layoutOffsetX;
      const top = getNodeTop(hash) + layoutOffsetY;
      const width = Math.max(2, getNodeWidth(hash) * transform.scale);
      const height = Math.max(2, getNodeHeight(hash) * transform.scale);
      const x = transform.mapX(left);
      const y = transform.mapY(top);
      const nodeClass = hash === headNodeHash ? 'minimap-node head' : 'minimap-node';
      return '<rect class="' + nodeClass + '" x="' + x + '" y="' + y + '" width="' + width + '" height="' + height + '" rx="1.5"></rect>';
    }

    function syncMinimapViewport(transform) {
      const visibleSize = getVisibleViewportSize();
      syncRevisionGraphWebviewMinimapViewportUi(minimapViewport, transform, {
        visibleWidth: visibleSize.width / currentZoom,
        visibleHeight: visibleSize.height / currentZoom,
        visibleLeft: Math.max(0, (viewport.scrollLeft - VIEWPORT_PADDING_LEFT) / currentZoom),
        visibleTop: Math.max(0, (viewport.scrollTop - VIEWPORT_PADDING_TOP) / currentZoom)
      });
    }

    function ensureMinimapViewportVisible(transform) {
      if (!graphMinimap || !minimapViewport) {
        return;
      }

      ensureRevisionGraphWebviewMinimapViewportVisibleUi(graphMinimap, minimapViewport);
    }

    function centerViewportFromMinimapEvent(event) {
      const transform = getMinimapTransform();
      if (!transform || !graphMinimap || typeof graphMinimap.getBoundingClientRect !== 'function') {
        return;
      }

      const rect = graphMinimap.getBoundingClientRect();
      const localX = clamp(event.clientX - rect.left + graphMinimap.scrollLeft, 0, transform.width);
      const localY = clamp(event.clientY - rect.top + graphMinimap.scrollTop, 0, transform.height);
      const targetX = transform.unmapX(localX);
      const targetY = transform.unmapY(localY);
      centerViewportOnPoint(targetX, targetY);
    }

    function getMinimapTransform() {
      const bounds = getDisplayedGraphBounds();
      const graphWidth = Math.max(1, bounds.maxX - bounds.minX);
      const graphHeight = Math.max(1, bounds.maxY - bounds.minY);
      const width = 180;
      const height = 240;
      const padding = 8;
      const baseScale = Math.min(
        (width - padding * 2) / graphWidth,
        (height - padding * 2) / graphHeight
      );
      const scale = baseScale * minimapZoom;
      if (!Number.isFinite(scale) || scale <= 0) {
        return null;
      }
      const contentWidth = Math.max(width, graphWidth * scale + padding * 2);
      const contentHeight = Math.max(height, graphHeight * scale + padding * 2);
      const offsetX = padding + Math.max(0, contentWidth - padding * 2 - graphWidth * scale) / 2;
      const offsetY = padding + Math.max(0, contentHeight - padding * 2 - graphHeight * scale) / 2;

      return {
        bounds,
        width: contentWidth,
        height: contentHeight,
        scale,
        mapX: (value) => offsetX + (value - bounds.minX) * scale,
        mapY: (value) => offsetY + (value - bounds.minY) * scale,
        unmapX: (value) => bounds.minX + (value - offsetX) / scale,
        unmapY: (value) => bounds.minY + (value - offsetY) / scale
      };
    }
