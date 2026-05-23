# Revision Graph Git-Aware Layout

## Goal

Improve card organization by making the base graph layout aware of Git concepts instead of relying on generic graph placement. The first iteration focuses on making the primary branch read as a stable trunk and distributing side branches around it.

## Scope

- Replace the default projected-graph coordinate calculation with a deterministic Git-aware layout.
- Keep the existing extension-host cache and scene-building pipeline.
- Replace the webview `Reorganize` action with a lightweight `Center HEAD` viewport action.
- Avoid new runtime dependencies and preserve performance on large repositories.

## Design

The layout now runs in `src/revisionGraph/layout/gitAwareLayout.ts`:

1. Detect a mainline from the best visible tip, prioritizing `HEAD`, `main`, `master`, default remotes, first-parent continuation, and release-like tags.
2. Assign layered rows from the mainline and propagate levels through child-to-parent edges, so a side descendant attached to a trunk parent is rendered on the same layer as its mainline sibling descendant.
3. Remove mainline nodes and group the remaining graph into side components.
4. Sort side components by trunk attachment row and weight.
5. Assign components left/right to balance total branch weight.
6. Reuse lateral lanes when component row intervals do not overlap.
7. Emit stable `x`/`y` coordinates for the existing scene builder.

The graph is now loaded already organized by the extension host. The webview keeps manual drag offsets and viewport centering behavior, but no longer owns a separate auto-arrange routine.

## Acceptance

- First-parent trunk nodes remain horizontally aligned.
- Side descendants are placed on the same layer as their mainline sibling descendant instead of all collapsing into the top layer.
- Independent side branch components are distributed on both sides of the trunk.
- Large linear histories render without invoking ELK.
- Layout cache keys use a new `git-aware-v2` namespace after the side-descendant row propagation fix.
- The toolbar action centers the viewport on `HEAD` instead of mutating graph coordinates.

## Verification

- `npm run build`
- `npm test`

## Follow-Ups

- Add screenshot/manual validation against the TortoiseGit and TensorFlow repositories.
- Add a minimap simplification path for large graphs so long edges do not dominate the overview.
- Consider renaming `layeredLayout.ts` after the Git-aware strategy settles, since it now owns cache orchestration rather than ELK execution.
