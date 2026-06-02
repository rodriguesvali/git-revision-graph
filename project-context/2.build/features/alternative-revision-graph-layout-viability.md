# d3-dag Revision Graph Organization

## Goal

Replace the previous experimental graph-organization choices with a single production path based on a TortoiseGit-inspired major-operations projection and `d3-dag` Sugiyama layout.

## Decision

Use one algorithm only:

1. Build the existing commit DAG from Git log data.
2. Project it into a major-operations graph that preserves refs, merge commits, fork commits, roots, and tips.
3. Compress hidden linear commits into `ProjectedGraphEdge.through`.
4. Layout the projected graph with `d3-dag` Sugiyama.
5. Keep the existing webview renderer, interactions, minimap, cache, metadata patches, and VS Code workflows.

There is no runtime Python, no Graphviz dependency, and no user-facing strategy setting.

## Implementation

- Added `d3-dag` as the runtime layout dependency.
- Added `src/revisionGraph/layout/d3DagSugiyamaLayout.ts`.
- Kept `src/revisionGraph/layout/layeredLayout.ts` as the layout cache/coordinator, now delegating only to `d3-dag`.
- Added `projectTortoiseMajorOpsGraph` in `src/revisionGraph/projection/graphProjection.ts`.
- Updated ready-state building and backend visible-node counting to use the major-operations projection.
- Removed the previous layout alternatives from production code.
- Removed the graph organization strategy setting from `package.json`.

## Validation

- Passed: `npm run build`
- Passed: `npm test` with 304 passing tests.

## Follow-Up

- Manually validate in Extension Development Host against branch-heavy and merge-heavy repositories.
- Use `gitRevisionGraph.traceLoading` on large repositories to compare `scene.layout.d3DagSugiyama` cost against render cost.
- If large-repository layout cost becomes too high, tune `d3-dag` operators before changing product behavior.
