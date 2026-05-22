# Revision Graph Performance Analysis vs TortoiseGit

## Goal

Understand why TortoiseGit's Revision Graph feels faster than this extension and determine whether the difference is mostly technology/runtime or implementation/algorithm.

## Sources Reviewed

- Local extension graph pipeline:
  - `src/revisionGraph/source/graphGit.ts`
  - `src/revisionGraph/model/commitGraph.ts`
  - `src/revisionGraph/projection/graphProjection.ts`
  - `src/revisionGraph/layout/layeredLayout.ts`
  - `src/revisionGraphData.ts`
  - `src/revisionGraph/panel/state.ts`
  - `src/revisionGraph/webview/script/bootstrap.ts`
- TortoiseGit source at `/tmp/tortoisegit-src`, synced to `origin/master` commit `aced68d0` dated `2026-04-22`:
  - `src/TortoiseProc/RevisionGraph/RevisionGraphDlgFunc.cpp`
  - `src/TortoiseProc/RevisionGraph/RevisionGraphWnd.cpp`
  - `src/TortoiseProc/RevisionGraph/RevisionGraphDlgDraw.cpp`
  - `src/TortoiseProc/LogDataVector.cpp`
  - `src/Git/Git.cpp`

## Current Extension Pipeline

The extension loads the graph with a targeted CLI command:

- `git log --all|--branches --topo-order --simplify-by-decoration --decorate=short --max-count=6000`
- If the visible graph is too small, it can retry with `12000`.

The resulting text is parsed into a `CommitGraph`, projected to visible decorated commits plus structural connectors, laid out with `elkjs` layered layout, converted into a scene, enriched with precomputed primary ancestor paths, serialized to the webview, and rendered as DOM nodes plus SVG edges.

The default graph window is bounded, but the state payload can still become large when many visible commits exist.

## TortoiseGit Pipeline

TortoiseGit also uses `--simplify-by-decoration` for the default revision graph. It optionally adds `--sparse` when branchings/merges are shown.

The important differences are:

- TortoiseGit reads commits through its git DLL integration (`git_open_log`, `git_get_log_nextcommit`) instead of spawning `git` and parsing formatted stdout for every graph load.
- It builds an OGDF graph directly from the loaded log entries.
- It lays out with OGDF `SugiyamaLayout`, using `OptimalRanking`, `MedianHeuristic`, and `FastHierarchyLayout`.
- It keeps OGDF edge bend points and renders those routed polylines through native GDI+/DC drawing.
- It does not need to serialize a large graph state across an extension-host/webview boundary.
- It does not maintain thousands or millions of DOM/SVG elements; drawing is immediate-mode native rendering.

## Measurements

Measured after `npm run build` using the compiled local modules.

### Performance Baseline

Use the TensorFlow repository available in the test environment as the standard real-world performance baseline for follow-up graph-load traces. It should be measured with the extension's current default graph options first, then with any optimization candidate, capturing `snapshot.gitLog`, `snapshot.parseCommitGraph`, `state.projectGraph`, `scene.layout.elk`, `state.primaryAncestorPaths`, `state.readyViewState`, and webview update behavior.

After the first optimization, `state.primaryAncestorPaths` is expected to report compact `next-map` construction rather than full path precomputation.

Initial TensorFlow trace from the Extension Development Host showed:

| Phase | Duration | Detail |
| --- | ---: | --- |
| `snapshot.gitLog` | 2375 ms | `limit=6000` |
| `snapshot.parseCommitGraph` | 161 ms | `commits=4627` |
| `state.projectGraph` | 31 ms | `nodes=4619; edges=4624` |

The load stalled after `state.projectGraph`, before `scene.layout.elk` emitted, confirming that cold ELK layout is the blocking phase for this baseline. A follow-up guard now bypasses ELK for projected graphs above `PROJECTED_GRAPH_ELK_LAYOUT_MAX_NODES` and uses the deterministic lane fallback immediately.

A second TensorFlow trace after the ELK guard reached `scene.total` and `state.primaryAncestorPaths`, then surfaced `Maximum call stack size exceeded` while assembling the ready view state. That was a separate large-graph implementation issue: host and webview layout code used spread calls over generated row/gap arrays. The layout helpers now scan numeric arrays iteratively instead of calling `Math.min(...largeArray)`.

### Real Repositories

With the current default `--simplify-by-decoration`, both local repositories produced small projected graphs:

| Repository | Limit | Git ms | Parse ms | Projection ms | Cold scene/layout ms | Warm scene/layout ms | Nodes | Edges | Payload |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `git-revision-graph` | 6000 | 10.2 | 11.9 | 1.3 | 135.4 | 0.3 | 31 | 30 | 32 KB |
| `TortoiseGit` | 6000 | 76.5 | 0.4 | 0.3 | 62.7 | 0.7 | 100 | 99 | 254 KB |

For normal small decorated graphs, raw JavaScript parsing is not the main bottleneck.

### Synthetic Scaling

The cold layout cost rises sharply on branchy visible graphs:

| Shape | Nodes | Edges | Projection ms | Cold scene/layout ms | Ancestor paths ms | Payload |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| linear all-decorated | 1000 | 999 | 2.4 | 438.3 | 80.0 | 4.7 MB |
| branchy all-decorated | 500 | 557 | 0.8 | 2071.4 | 16.1 | 1.2 MB |
| branchy all-decorated | 1000 | 1117 | 1.5 | 10298.7 | 63.6 | 4.7 MB |

`elkjs` is the dominant cold-start cost for branch-heavy visible graphs.

The precomputed `primaryAncestorPathsByHash` also grows quadratically on long visible chains:

| Visible nodes | Stored path entries | Build ms | JSON ms | JSON size |
| ---: | ---: | ---: | ---: | ---: |
| 1000 | 500,500 | 82.8 | 23.6 | 4.8 MB |
| 2000 | 2,001,000 | 322.7 | 102.6 | 19.1 MB |
| 4000 | 8,002,000 | 1349.3 | 395.8 | 76.4 MB |

This is an implementation issue independent of C++ vs JavaScript.

## Diagnosis

The performance gap is not simply "C++ is faster than JavaScript".

Technology matters in these places:

- TortoiseGit avoids process spawn and formatted stdout parsing by using git DLL calls and a native log cache.
- OGDF native layout is faster and gives routed bends that the renderer can use directly.
- Native immediate-mode drawing avoids DOM creation, DOM event binding, SVG path churn, and host-to-webview serialization.

But the larger current problem is implementation/architecture:

- `elkjs` is a generic layered graph layout engine used cold on projected graphs; branchy 1000-node graphs can take around 10 seconds in Node.
- `primaryAncestorPathsByHash` precomputes and serializes full ancestor paths for every node, which is O(n^2) in long chains.
- Full state updates still rebuild all DOM/SVG markup for topology changes.
- The webview receives a large fully materialized scene instead of a compact graph plus on-demand interaction queries.
- Edge routing is flattened to simple SVG paths; the extension pays layout cost but discards richer route information that TortoiseGit keeps from OGDF.

## Recommended Priority

1. Replace precomputed full ancestor paths with on-demand or compact parent pointers.
   - Keep parent/child adjacency in the webview and compute the highlighted path for the selected node only.
   - This removes the O(n^2) payload risk and should be a low-risk first win.
   - Implemented as a compact `primaryAncestorNextByHash` map while keeping `primaryAncestorPathsByHash` empty for compatibility.
2. Add a specialized Git-revision lane layout for the common revision graph case.
   - Use topological order plus active lanes and parent continuation.
   - Keep ELK only as an optional/fallback layout mode if visual quality requires it.
   - Interim guard implemented: projected graphs larger than the ELK threshold use the existing lane fallback instead of waiting indefinitely on ELK.
3. Preserve routed edge geometry if a layered layout engine remains.
   - Use layout bend points instead of rebuilding simple direct/one-bend SVG paths.
4. Reduce full webview replacement on topology-stable changes.
   - Continue expanding metadata patches and avoid sending unchanged scene data.
5. Keep Git I/O optimization secondary.
   - CLI `git log` is not currently the dominant cost in measured cases; improving layout/state payload will likely beat replacing Git access first.

## Implemented Follow-up Fixes

- Added an ELK size guard so large projected graphs use deterministic fallback lane layout before entering `elkjs`.
- Replaced large-array spread minimum calculations in shared host layout and webview auto-arrange layout with iterative scans.
- Reduced initial webview render work for large graphs by skipping automatic auto-arrange above 1000 nodes, disabling the manual reorganize action at that scale, avoiding redundant edge layout when no saved offsets exist, and using delegated node/ref/grip event handlers instead of per-card listeners.
- Added regression coverage for oversized projected graphs and long fan-out layout corridors.
- Verification: `npm run build` passed; `npm test` passed with 277 tests.

## Answer

The observed gap is a mix, but mostly not a language problem. C++/native rendering gives TortoiseGit a structural advantage, yet the extension currently pays avoidable costs: generic ELK layout on branchy graphs, quadratic ancestor-path state, large JSON transfer, and DOM/SVG rebuilds.

The highest-impact direction is to make the algorithm and state model more revision-graph-specific before considering a native component or a Git DLL/libgit replacement.
