# Alternative Revision Graph Layout Viability

## Context

The current product weakness is still graph organization, especially around branch-heavy and merge-heavy histories. A recommended external reference, `chaoqing/git-revision-graph`, shows a small Python implementation that generates TortoiseGit-like revision graphs for selected refs.

This analysis compares that reference and `docs/plano_git_revision_graph.md` with the current extension architecture.

## Current Baseline

- The extension is already beyond the older ref-card prototype described in some planning notes.
- Current source loading uses targeted `git log` calls through `src/revisionGraph/source/graphGit.ts`.
- The graph model already separates source DAG, projection, and layout:
  - `src/revisionGraph/model/commitGraph.ts`
  - `src/revisionGraph/projection/graphProjection.ts`
  - `src/revisionGraph/layout/gitAwareLayout.ts`
  - `src/revisionGraph/layout/layeredLayout.ts`
- The active graph command currently uses `--topo-order --simplify-by-decoration`.
- The active layout strategy is deterministic Git-aware placement with many local heuristics and a cache key namespace.

## External Reference Findings

`chaoqing/git-revision-graph` is useful as an algorithmic reference, but it is not a drop-in solution.

Useful ideas:

- Select refs first, then generate a major-operation graph instead of drawing every linear commit.
- Preserve commits with visible refs, merges, forks, and roots.
- Reconnect hidden linear commits to the next visible ancestor.
- Output a simplified DAG and let an external graph engine place it.

Constraints:

- It is a Python CLI, not a VS Code extension or browser renderer.
- It depends on Graphviz/DOT for layout and SVG generation.
- Its implementation is small and alpha-quality.
- Its license metadata is inconsistent across sources, but the repository declares AGPL. If the project is willing to move to AGPL, licensing should not block deeper reuse or a closer port. The remaining concern is technical fit, not license compatibility.

## Plano Document Findings

`docs/plano_git_revision_graph.md` recommends a backend simplification pipeline and a frontend Cytoscape.js + Dagre layout.

Parts that align with the current repo:

- Use structured `git log` output.
- Keep critical commits.
- Compress linear paths.
- Keep graph semantics in backend/model layers.
- Test an alternate layout before replacing the old one.

Parts that should be adjusted:

- Do not create a generic `src/webviewProvider.ts`; the project already has `src/revisionGraphPanel.ts`, `src/revisionGraph/controller.ts`, and `src/revisionGraphWebview.ts`.
- Do not move graph semantics into `media/main.js`; the current webview script is already under `src/revisionGraph/webview/script/*`.
- Do not immediately add Cytoscape/Dagre as production dependencies. First prove quality and performance against fixtures.
- Do not rely only on decorated commits; the current source/projection boundary should preserve enough structural commits to avoid topology corruption.

## Viability Assessment

Recommended path: viable as a controlled alternate algorithm spike.

The most feasible version is not a full rewrite. It is a second graph organization strategy inside the existing pipeline:

1. Keep current Git loading and `CommitGraph`.
2. Add an explicit projection strategy for TortoiseGit-like simplification if current projection cannot express the desired behavior cleanly.
3. Add an alternate layout strategy behind a temporary internal switch.
4. Compare output against existing `gitAwareLayout` on fixtures and real repositories.
5. Keep the old layout available until visual and performance criteria are met.

## Candidate Strategies

### Strategy A: Projection-Only Improvement

Improve critical-node selection and edge rewiring in `graphProjection.ts`, while keeping `gitAwareLayout.ts`.

Pros:

- Smallest dependency and release risk.
- Best fit with current code.
- Easier to test with existing node/edge assertions.

Cons:

- May not solve horizontal organization and edge crossing by itself.

### Strategy B: Alternate TypeScript Sugiyama/Dagre Layout

Keep current projection, then add a layout strategy based on a layered graph algorithm, either custom TypeScript or a lightweight dependency spike.

Pros:

- Directly targets graph organization.
- Easy to place behind `layoutProjectedGraph`.
- Can be compared side by side with `gitAwareLayout`.

Cons:

- Dependency and bundle-size risk if using Cytoscape/Dagre.
- Generic layered layout may ignore Git-specific trunk/branch expectations unless tuned.

### Strategy C: Graphviz/DOT Integration Or Close Port

Generate DOT and use Graphviz-like layout.

Pros:

- Closest to the external Python reference.
- Mature crossing minimization.
- If the extension moves to AGPL, the external implementation can be studied more directly and selectively ported.

Cons:

- Poor fit for a published VS Code extension.
- Requires native/system dependency or WebAssembly Graphviz.
- Higher packaging, performance, and Marketplace support risk.
- Still requires adaptation from a batch SVG/DOT generator into an interactive VS Code graph with selection, commands, context menus, cache, minimap, and incremental refresh behavior.

## Recommendation

Start with Strategy A plus a small Strategy B spike. If the maintainer accepts an AGPL move, add a parallel source-reading task to map the Python implementation line by line into the existing TypeScript graph model. The target is a TypeScript port, not runtime coupling to Python or Graphviz.

Specifically:

- Add a strategy interface around projection/layout, not a separate webview stack.
- Implement a `tortoiseSimplifiedProjection` test module only if current `projectDecoratedCommitGraph` cannot match the desired node set.
- Add a `dagLayered`, `sugiyamaSpike`, or `portedTortoiseMajorOps` layout function that consumes the existing `ProjectedGraph` and returns the same position map as `calculateGitAwareProjectedGraphLayout`.
- Use a temporary setting or internal constant to switch strategies during development.
- Add fixture-based comparisons for node visibility, edge rewiring, row monotonicity, lane stability, and edge crossings.

## Porting Direction

The port should translate the Python reference into repo-native TypeScript modules:

- Git data stays in the current `git log` source layer.
- Ref filtering maps to `RevisionGraphProjectionOptions` instead of Python CLI arguments.
- Critical-node selection becomes a pure projection helper.
- Path compression returns `ProjectedGraphEdge.through` values so hidden commits remain traceable.
- Layout output remains `Map<string, { x: number; y: number }>` for compatibility with `layoutProjectedGraph`.
- The webview continues to render the existing scene payload and keeps current interactions, actions, minimap, cache, and metadata patch behavior.

Do not invoke the Python package, shell out to a Python script, or require system Graphviz for normal extension operation.

## Acceptance Criteria for the Spike

- Existing graph actions and webview payload shape remain unchanged.
- The alternate strategy can be enabled without changing `package.json` contribution points.
- The old `gitAwareLayout` remains available as a fallback.
- For every projected edge, descendants render above ancestors.
- Merge commits preserve all visible parent relationships.
- Hidden linear commits reconnect through intentional `through` paths.
- Layout quality improves on at least two branch-heavy fixtures or real repositories.
- Initial render performance does not regress materially on large visible graphs.
- `npm run build` and `npm test` pass.

## Open Questions

- Which real repository should become the standard visual fixture for layout comparison?
- Should the temporary strategy switch be a hidden setting, an environment variable, or a test-only hook?
- Is the desired graph closer to TortoiseGit's full revision graph, TortoiseGit's simplified major-operation view, or the Python reference's selected-ref diagram?
- Are we willing to add a runtime layout dependency after the spike if it outperforms the current layout?
- Are we willing to change the extension license to AGPL before a close port, or should the spike remain clean-room until the decision is final?

## Decision

Proceed with an alternate algorithm spike. Do not replace the current production layout yet. If the project license is changed to AGPL, a closer port of the Python simplification logic becomes acceptable. The implementation target is a TypeScript port inside the existing extension pipeline, not invoking the Python CLI or requiring system Graphviz.

## Implementation Notes

Status: Implemented initial TypeScript spike.

- Added `portedTortoiseMajorOps` as a selectable graph organization strategy.
- Kept `gitAware` as the default production strategy.
- Added `projectTortoiseMajorOpsGraph` to preserve refs, merge commits, fork commits, roots, and tips while compressing linear hidden commits through `ProjectedGraphEdge.through`.
- Added `calculatePortedTortoiseMajorOpsLayout` as a dependency-free layered layout using topological rows and barycenter row ordering.
- Routed the selected strategy through ready-state graph projection and scene layout.
- Added `gitRevisionGraph.graphOrganizationStrategy` with enum values `gitAware` and `portedTortoiseMajorOps`.
- Kept the webview payload and interactions unchanged.

Status update: Added `d3-dag` Sugiyama spike.

- Installed `d3-dag` as the layout dependency for the next experimental strategy.
- Added `d3DagSugiyama` as a third selectable graph organization strategy.
- Kept `d3DagSugiyama` on the Tortoise-like major-operations projection so it tests simplification plus a real Sugiyama-family layout.
- Added `calculateD3DagSugiyamaLayout`, using `graphConnect`, `sugiyama`, `layeringLongestPath`, `decrossTwoLayer`, `twolayerAgg`, `coordGreedy`, card-size-aware `nodeSize`, and explicit layout gaps.
- Kept the existing webview renderer, interactions, minimap, metadata patches, and fallback strategies unchanged.
- The implementation used current `d3-dag` documentation from Context7 before coding.

## Verification

- Passed: `npm run build`
- Passed: `npm test` with 316 passing tests.
