    function getPrimaryAncestorPath(startHash) {
      return getRevisionGraphWebviewPrimaryAncestorPath(startHash, getPrimaryPathContext());
    }

    function tracePrimaryPath(startHash, direction) {
      return traceRevisionGraphWebviewPrimaryPath(startHash, direction, getPrimaryPathContext());
    }

    function getPrimaryPathContext() {
      return {
        primaryAncestorNextByHash,
        parentMap,
        childMap,
        headDistanceByHash,
        nodesByHash: graphNodeByHash
      };
    }
