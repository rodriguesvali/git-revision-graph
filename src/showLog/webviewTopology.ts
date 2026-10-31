export function renderShowLogTopologyScript(): string {
  return `    function renderTopology(topology, isMerge, isFirstVisible, height) {
      const laneSpacing = GRAPH_LANE_SPACING;
      const width = getGraphContentWidth(topology.laneCount, laneSpacing);
      const centerY = (height / 2) - 2;
      const topY = -2;
      const bottomY = height - 2;
      const lineParts = [];

      for (const lane of topology.continuingLanes) {
        if (topology.mergeStartLanes.includes(lane) || topology.convergingLanes.includes(lane)) {
          continue;
        }
        const color = getLaneColor(topology.colorByLane[lane]);
        const x = laneX(lane, laneSpacing);
        const laneTopY = isFirstVisible && lane === topology.nodeLane ? centerY : topY;
        lineParts.push('<path class="graph-line" d="M ' + x + ' ' + laneTopY + ' L ' + x + ' ' + bottomY + '" stroke="' + color + '" />');
      }

      for (const lane of topology.convergingLanes) {
        const color = getLaneColor(topology.colorByLane[lane]);
        const startX = laneX(lane, laneSpacing);
        const endX = laneX(topology.nodeLane, laneSpacing);
        lineParts.push('<path class="graph-line" d="M ' + startX + ' ' + topY
          + ' C ' + startX + ' ' + (centerY - 4) + ', ' + endX + ' ' + (centerY - 4) + ', ' + endX + ' ' + centerY
          + '" stroke="' + color + '" />');
      }

      for (const lane of topology.secondaryParentLanes) {
        const color = getLaneColor(topology.colorByLane[lane]);
        const startX = laneX(topology.nodeLane, laneSpacing);
        const endX = laneX(lane, laneSpacing);
        const controlY = centerY + 4;
        const controlX = startX + ((endX - startX) * 0.58);
        lineParts.push(
          '<path class="graph-line" d="M ' + startX + ' ' + centerY
          + ' C ' + startX + ' ' + controlY + ', ' + controlX + ' ' + controlY + ', ' + endX + ' ' + bottomY
          + '" stroke="' + color + '" />'
        );
      }

      const nodeColor = getLaneColor(topology.colorByLane[topology.nodeLane]);
      const nodeX = laneX(topology.nodeLane, laneSpacing); let fixedNode = '';
      if (isMerge) {
        fixedNode = '<span class="graph-node-marker graph-node-merge" style="left: ' + nodeX + 'px; --show-log-node-color: ' + nodeColor + ';" aria-hidden="true"></span>';
      } else {
        fixedNode = '<span class="graph-node-marker' + (isFirstVisible ? ' graph-node-outgoing' : '') + '" style="left: ' + nodeX + 'px; --show-log-node-color: ' + nodeColor + ';" aria-hidden="true"></span>';
      }

      return '<svg class="graph-svg" width="' + width + '" style="width: ' + width + 'px;" viewBox="0 -2 ' + width + ' ' + height + '" preserveAspectRatio="none" aria-hidden="true">' + lineParts.join('') + '</svg>' + fixedNode;
    }

    function getMainGraphHeight(commit) {
      if (!hasCommitReferences(commit)) {
        return GRAPH_MAIN_COMPACT_HEIGHT;
      }
      return commit.expanded ? GRAPH_MAIN_META_HEIGHT : GRAPH_MAIN_HEIGHT;
    }

    function hasCommitReferences(commit) {
      return !!(commit.refs && commit.refs.length > 0);
    }

    function renderContinuationTopology(topology) {
      const laneSpacing = GRAPH_LANE_SPACING;
      const width = getGraphContentWidth(topology.laneCount, laneSpacing);
      const height = 28;
      const topY = -2;
      const bottomY = 26;
      const lineParts = [];

      for (const lane of topology.continuingLanes) {
        if (topology.convergingLanes.includes(lane)) {
          continue;
        }
        const color = getLaneColor(topology.colorByLane[lane]);
        const x = laneX(lane, laneSpacing);
        lineParts.push('<path class="graph-line" d="M ' + x + ' ' + topY + ' L ' + x + ' ' + bottomY + '" stroke="' + color + '" />');
      }

      return '<svg class="graph-svg" width="' + width + '" style="width: ' + width + 'px;" viewBox="0 -2 ' + width + ' ' + height + '" preserveAspectRatio="none" aria-hidden="true">' + lineParts.join('') + '</svg>';
    }

    function laneX(lane, laneSpacing) {
      return GRAPH_LEFT_INSET + lane * laneSpacing;
    }

    function getGraphContentWidth(laneCount, laneSpacing) {
      return GRAPH_LEFT_INSET + GRAPH_RIGHT_PADDING + (Math.max(laneCount - 1, 0) * laneSpacing) + 8;
    }

    function getLaneColor(colorIndex) {
      return LANE_COLORS[Math.abs(colorIndex || 0) % LANE_COLORS.length];
    }

`;
}
