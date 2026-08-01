    function getPrimaryAncestorPath(startHash: string) {
      return getRevisionGraphWebviewPrimaryAncestorPath(startHash, getPrimaryPathContext());
    }

    function tracePrimaryPath(startHash: string, direction: 'ancestor' | 'descendant') {
      return traceRevisionGraphWebviewPrimaryPath(startHash, direction, getPrimaryPathContext());
    }

    function getPrimaryPathContext() {
      return {
        primaryAncestorNextByHash,
        parentMap: graphTopology.parentMap,
        childMap: graphTopology.childMap,
        headDistanceByHash: graphTopology.headDistanceByHash,
        nodesByHash: graphNodeByHash
      };
    }
