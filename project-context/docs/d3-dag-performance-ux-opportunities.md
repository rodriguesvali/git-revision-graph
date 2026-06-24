# d3-dag Performance and UX Opportunities

Created: 2026-06-24

Release alignment: the adaptive Sugiyama layout slice is planned for `1.3.0`.

## Purpose

Assess the current d3-dag documentation against the active Git Revision Graph implementation and identify practical opportunities to improve performance or graph UX without replacing the existing VS Code extension architecture.

## Current Project Fit

- The project already uses `d3-dag` as a runtime dependency and lays out the major-operations projection with Sugiyama.
- The active layout path is `src/revisionGraph/layout/d3DagSugiyamaLayout.ts`.
- Cache misses run through a Node worker via `src/revisionGraph/layout/d3DagSugiyamaLayoutWorkerHost.ts`, while cache identity and bounded persistence live in `src/revisionGraph/layout/layeredLayout.ts`.
- The webview already virtualizes node and edge rendering in `src/revisionGraph/webview/script/bootstrap.ts`, so d3-dag opportunities should focus on layout quality, adaptive layout cost, and edge geometry rather than DOM rendering replacement.

## Documentation Signals

Primary d3-dag documentation reviewed:

- README and API overview: https://github.com/erikbrinkman/d3-dag
- TypeDoc examples: https://erikbrinkman.github.io/d3-dag/documents/examples.html
- Sugiyama API/source docs: https://github.com/erikbrinkman/d3-dag/blob/main/src/sugiyama/index.ts
- Grid layout source docs: https://github.com/erikbrinkman/d3-dag/blob/main/src/grid/index.ts
- Zherebko layout source docs: https://github.com/erikbrinkman/d3-dag/blob/main/src/zherebko/index.ts

Relevant d3-dag capabilities:

- `sugiyama()` supports independent choices for layering, decrossing, coordinate assignment, node sizing, gaps, and post-layout tweaks.
- Fast interactive layouts can use `layeringLongestPath()`, `decrossDfs()`, and `coordGreedy()`.
- `decrossTwoLayer()` is the balanced heuristic; `decrossOpt()` and some optimal lane operators are for small graphs only.
- `grid()` and `zherebko()` provide topological layouts that are much faster but visually different from the current Git graph.
- Layouts produce node coordinates and link points; the project currently keeps node coordinates and recreates edge paths in the webview.
- Tweaks such as `tweakShape()`, `tweakDirection()`, `tweakSize()`, `tweakGrid()`, and `tweakSugiyama()` can modify final geometry after layout.

## Findings

### 1. Adaptive Sugiyama Quality Is The Best Near-Term Performance Path

The current layout already uses `layeringLongestPath()` and `coordGreedy()`, plus a custom decross operator that uses `decrossTwoLayer().order(twolayerAgg()).passes(4)` unless a layer exceeds 300 nodes, then falls back to `decrossDfs()`.

Opportunity:

- Add an explicit graph-shape based layout profile before constructing the operator.
- Keep the current profile for normal graphs.
- Use a cheaper profile for large graphs, high edge count, or repeated trace evidence of slow layout.
- Candidate cheap profile: `decrossTwoLayer().order(twolayerAgg()).passes(1)` before jumping all the way to `decrossDfs()`.

Why:

- The d3-dag docs describe DFS decrossing and greedy coordinates as interactive-friendly, but a quick local synthetic benchmark showed `passes(1)` can be a better incremental compromise for branchy linear histories than `decrossDfs()`.
- This keeps the current visual language and cache/worker architecture intact.

Implementation notes:

- Add profile selection to `calculateD3DagSugiyamaLayout(...)`.
- Include profile identity in `PROJECTED_GRAPH_LAYOUT_STRATEGY_KEY` or the layout cache hash.
- Extend trace detail with node count, edge count, max layer width, decross profile, and layout duration.
- Add fixtures for normal, fan-out, and long-chain histories.

### 2. Preserve d3-dag Link Points For Better Edge UX

The d3-dag layout computes link points, but the project currently returns only node positions and then builds simplified edge paths in the webview.

Opportunity:

- Extend the layout result to optionally include default edge route points.
- Use those points for initial edge rendering, especially for merge-heavy and fan-out histories.
- Keep the current webview path recalculation for horizontal drag, or transform default points by node offset when possible.

Why:

- This could improve readability without changing the projection model.
- It may reduce visual ambiguity where the current single-bend edge renderer hides the path chosen by Sugiyama's dummy-node routing.

Risk:

- Manual horizontal node dragging currently recomputes edges from endpoints. Route-aware dragging needs careful fallback behavior.
- Scene layout keys and persisted offsets must include route-affecting strategy changes.

### 3. Use Shape/Tweak APIs Sparingly

Potentially useful:

- `tweakShape()` with rectangular/top-bottom shape handling could make edge endpoints respect card boundaries more consistently than fixed insets.
- `tweakSugiyama()` may expose more useful internal edge control points if route preservation is adopted.

Less useful right now:

- `tweakSize()` conflicts with the existing canvas, minimap, zoom, and Center HEAD behavior.
- `tweakDirection()`/`tweakFlip()` are unnecessary unless the product introduces a left-to-right graph mode.

### 4. Compact Fast Layout Should Be A Spike, Not A Default

`grid()` and `zherebko()` are attractive for speed and compactness. A local synthetic benchmark showed them much faster than the current Sugiyama-like path, but they produce a noticeably different visual model.

Opportunity:

- Prototype an internal "compact fallback" for very large graphs or a future explicit layout mode.
- Prefer hidden/adaptive fallback first over adding toolbar complexity.

Risk:

- The project promises a Git revision graph, not a generic workflow DAG. `zherebko()` and `grid()` may feel less like Git tooling even when faster.
- New layout modes require cache namespace changes, README wording, and manual Extension Development Host validation.

### 5. Rank Constraints Are Promising For Stability

The docs expose rank hooks for topological-style layouts. This could help preserve expected ordering around HEAD, upstream, current branch, remote branches, tags, and stashes.

Opportunity:

- Explore rank constraints in `grid()`/`zherebko()` spikes.
- For Sugiyama, consider a custom operator only if current ordering instability is observed in real fixtures.

Risk:

- Over-constraining rank/order can make edge crossings worse or produce unexpected spacing.

### 6. Current Graph Construction Is Valid

The current `graphConnect().single(true)` plus self-pair entries is a valid way to preserve isolated projected nodes. A local check confirmed same-source-target entries create nodes without retained self-links when `single(true)` is enabled.

No change recommended unless readability of the construction becomes an issue.

## Micro-Benchmark Snapshot

Local synthetic benchmark on 2026-06-24, including graph construction and layout:

```text
size=200 edges=212
  currentLike   61.2ms
  twoLayerPass1 24.5ms
  dfsOnly       47.8ms
  zherebko       6.0ms
  grid           7.8ms

size=800 edges=858
  currentLike  165.6ms
  twoLayerPass1 89.7ms
  dfsOnly      198.1ms
  zherebko      25.9ms
  grid          29.6ms

size=1500 edges=1611
  currentLike  220.7ms
  twoLayerPass1 147.1ms
  dfsOnly      327.8ms
  zherebko      17.1ms
  grid          19.0ms
```

This benchmark is not a release metric. It is enough to justify a real fixture-backed spike, especially around decross pass count and compact topological fallback.

## Recommended Next Slice

Implemented on 2026-06-24 as the first contained "adaptive d3-dag layout profile" slice:

1. Added profile selection with `balanced`, `fast-two-layer`, and `dfs-wide` modes.
2. Kept current behavior as the default profile.
3. Switched to `fast-two-layer` when `nodes >= 800` or `edges >= 1000`.
4. Kept `dfs-wide` for estimated layers wider than `300` nodes, plus the realized wide-layer guard.
5. Included profile identity in the layout cache namespace by moving to `d3-dag-sugiyama-v3`.
6. Added regression tests for profile selection, cache identity, worker metadata, trace detail, and row direction.
7. Validated with `npm run build` and `npm test`.

Manual Extension Development Host loading with `gitRevisionGraph.traceLoading` remains recommended before release.

## Avoid For Now

- Do not replace the revision graph renderer with D3 DOM/SVG rendering; the existing webview virtualization already addresses the larger DOM problem.
- Do not use `decrossOpt()` or optimal lane operators for normal repository graphs.
- Do not add a visible layout-mode control until there is a clear user-facing reason.
- Do not move layout into the webview; the worker-thread extension-host-side layout currently protects VS Code responsiveness and keeps rendering payloads deterministic.
