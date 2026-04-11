# Revision Graph Parity Plan

This document turns the current review into an execution plan for reproducing the TortoiseGit `Revision Graph` experience inside Visual Studio Code.

## Objective

Build a VS Code revision graph that is faithful to TortoiseGit in the parts that matter most:

- commit-centric graph, not ref-centric cards
- refs rendered as decorations on commits
- revision selection as the primary interaction model
- compare, log, unified diff, checkout, merge, and delete actions from graph context
- filtering, find, zoom, overview/minimap, and refresh workflows
- stable layout for merge-heavy histories

## Baseline

The TortoiseGit implementation is the reference behavior for this plan:

- Graph loading and history rewriting:
  - `src/TortoiseProc/RevisionGraph/RevisionGraphDlgFunc.cpp`
- Graph interaction, selection, scrolling, overview, and context menu:
  - `src/TortoiseProc/RevisionGraph/RevisionGraphWnd.cpp`
- Dialog and commands for zoom, find, refresh, and view toggles:
  - `src/TortoiseProc/RevisionGraph/RevisionGraphDlg.cpp`
- Filter dialog:
  - `src/TortoiseProc/RevisionGraph/RevGraphFilterDlg.cpp`
- User-facing behavior:
  - `doc/source/en/TortoiseGit/tgit_dug/dug_revgraph.xml`

Useful links:

- TortoiseGit revision graph source:
  - https://github.com/TortoiseGit/TortoiseGit/tree/master/src/TortoiseProc/RevisionGraph
- TortoiseGit revision graph documentation:
  - https://github.com/TortoiseGit/TortoiseGit/blob/master/doc/source/en/TortoiseGit/tgit_dug/dug_revgraph.xml
- ELK Layered algorithm reference:
  - https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html
- `elkjs` repository:
  - https://github.com/kieler/elkjs

## What TortoiseGit Actually Does

The TortoiseGit graph is not just a decorated `git log` list.

It:

1. Loads commit history and refs into an internal log structure.
2. Keeps the full commit DAG for the visible history window.
3. Rewrites or simplifies the visible graph according to view options such as tag folding and branch/merge visibility.
4. Runs a layered graph layout algorithm based on Sugiyama-style ranking and crossing minimization.
5. Centers the interaction around selected revisions, not selected ref labels.
6. Keeps navigation features like zoom, overview, find, refresh, and filter as first-class concepts.

That pipeline matters more than the exact UI chrome.

## Current Gap Summary

The current extension is a useful prototype, but it is not yet a faithful revision graph:

- The scene is built only from commits that already have refs.
- Each visible node keeps only one "nearest referenced ancestor" edge.
- Commits without refs disappear from the visible model instead of surviving as graph structure.
- Selection is attached to ref labels, not revisions.
- The webview compensates for layout limitations with manual reorganization and centering logic.
- Filtering is only ancestor-based and does not match the TortoiseGit model.
- The overview/minimap behavior is not implemented.
- The provider re-renders the full HTML for every refresh and most actions.

## Architectural Principles

The redesign should follow these rules:

1. Commit is the primary domain object.
2. Refs are annotations on commits.
3. Simplification belongs to a projection layer, never to the source model.
4. Layout is a dedicated concern, not mixed into parsing or action code.
5. The extension host owns Git I/O and orchestration.
6. The webview owns rendering and local interaction state.
7. Native VS Code workflows should still be reused for diff, SCM, checkout, merge, and document opening whenever possible.

## Target Architecture

### 1. Graph Source

Responsibility:

- load commits, parents, decorations, dates, authors, subjects, and hashes
- resolve ref metadata and normalize ref identities
- expose cancellable graph snapshots per repository

Suggested files:

- `src/revisionGraph/source/graphGit.ts`
- `src/revisionGraph/source/graphSnapshot.ts`
- `src/revisionGraph/source/refIndex.ts`

Notes:

- Keep using `git log` for graph data because the public `vscode.git` API does not expose the commit DAG.
- Keep using the built-in Git API for refs and mutations where it is strong.
- Prefer full decoration data and stable parsing over UI-specific parsing shortcuts.

### 2. Graph Model

Responsibility:

- represent the complete commit DAG for the loaded snapshot
- index commits by hash
- track refs, HEAD, upstream, and worktree state
- support ancestry, descendant, and selection queries

Suggested files:

- `src/revisionGraph/model/commitGraphTypes.ts`
- `src/revisionGraph/model/commitGraph.ts`
- `src/revisionGraph/model/commitGraphQueries.ts`

Core model idea:

- `CommitNode`
  - `hash`
  - `parents`
  - `children`
  - `author`
  - `date`
  - `subject`
  - `refs`
  - `isHead`
- `CommitGraph`
  - `commitsByHash`
  - `orderedHashes`
  - `headHash`
  - `refIndex`
  - `metadata`

### 3. Graph Projection

Responsibility:

- derive the visible graph from the full DAG
- apply user options and view filters
- preserve semantic correctness while simplifying the scene

Suggested files:

- `src/revisionGraph/projection/graphProjection.ts`
- `src/revisionGraph/projection/graphFilters.ts`
- `src/revisionGraph/projection/graphFolding.ts`
- `src/revisionGraph/projection/graphSelection.ts`

Projection modes to support:

- show all decorated commits
- show current branch only
- show local branches only
- show all branches
- fold tags
- show branchings and merges
- revision range filters
- ref-based filters
- search result focus

Important rule:

- if a commit is hidden, the projection layer must reconnect the visible topology intentionally, instead of relying on accidental nearest-ancestor shortcuts.

### 4. Layout Engine

Responsibility:

- assign visual layers, ordering, and bend points to the projected graph
- minimize crossings and keep merge-heavy histories legible

Suggested files:

- `src/revisionGraph/layout/layoutTypes.ts`
- `src/revisionGraph/layout/elkLayout.ts`
- `src/revisionGraph/layout/layoutCache.ts`

Recommendation:

- spike `elkjs` with the ELK layered algorithm as the main layout candidate
- configure it to emulate a Sugiyama-style layered graph, since that is also the family of algorithm used by TortoiseGit through OGDF

Why this is the current leading option:

- ELK Layered explicitly implements a Sugiyama-style layered algorithm
- `elkjs` runs in JavaScript and fits a VS Code extension/webview environment better than porting OGDF
- it supports routing and crossing minimization in a way that is much closer to the TortoiseGit baseline than the current hand-made lane allocator

### 5. View Model and Controller

Responsibility:

- translate graph snapshots, projections, and layout output into webview payloads
- keep repository lifecycle, refresh, and background loading outside the renderer

Suggested files:

- `src/revisionGraph/controller/revisionGraphController.ts`
- `src/revisionGraph/controller/revisionGraphViewState.ts`
- `src/revisionGraph/controller/revisionGraphActions.ts`
- `src/revisionGraph/controller/revisionGraphMessages.ts`

This layer should replace the current concentration of responsibilities in `src/revisionGraphPanel.ts`.

### 6. Webview Renderer

Responsibility:

- render the scene
- manage local selection, hover, zoom, pan, overview, and keyboard interaction
- ask the controller for state changes instead of recomputing graph semantics locally

Suggested files:

- `src/revisionGraph/webview/renderHtml.ts`
- `src/revisionGraph/webview/renderScene.ts`
- `src/revisionGraph/webview/renderMinimap.ts`
- `src/revisionGraph/webview/interaction.ts`

The webview should stop inventing graph semantics from ref labels and should render the view model it receives.

## Proposed Directory Shape

```text
src/
  revisionGraph/
    controller/
      revisionGraphActions.ts
      revisionGraphController.ts
      revisionGraphMessages.ts
      revisionGraphViewState.ts
    layout/
      elkLayout.ts
      layoutCache.ts
      layoutTypes.ts
    model/
      commitGraph.ts
      commitGraphQueries.ts
      commitGraphTypes.ts
    projection/
      graphFilters.ts
      graphFolding.ts
      graphProjection.ts
      graphSelection.ts
    source/
      graphGit.ts
      graphSnapshot.ts
      refIndex.ts
    webview/
      interaction.ts
      renderHtml.ts
      renderMinimap.ts
      renderScene.ts
```

This can be introduced incrementally without deleting the current files on day one.

## Phased Execution Plan

### Phase 0: Freeze the Baseline

Goal:

- protect the refactor with representative fixtures and behavior tests

Tasks:

- add fixture logs for:
  - linear history
  - merge-heavy history
  - many tags on the same commit
  - remote tracking branches
  - deleted branch references
  - detached HEAD / tag checkout flow
- add golden tests for parsing and projection inputs
- add a manual test matrix for parity against TortoiseGit screenshots or known repositories

Exit criteria:

- we can compare old and new graph snapshots from the same repo fixtures

### Phase 1: Replace the Data Model

Goal:

- move from ref-centric cards to a full commit DAG

Tasks:

- build `CommitGraph` from `git log` output
- retain parent and child links for every loaded commit
- normalize ref decorations from `repository.getRefs()`
- introduce a projected visible graph type that is separate from the source graph

Exit criteria:

- commits without refs remain usable as structure
- merge commits preserve all parents
- tests no longer encode "nearest referenced ancestor" as the core behavior

### Phase 2: Introduce a Real Projection Layer

Goal:

- reproduce TortoiseGit-like simplification without corrupting the source graph

Tasks:

- implement decorated-commit projection
- implement tag folding
- implement branch/merge visibility toggles
- implement current branch and local branches filters
- implement revision range filtering

Exit criteria:

- the same source DAG can drive multiple view modes
- folding rules reconnect topology intentionally and predictably

### Phase 3: Replace the Layout

Goal:

- make graph placement stable and readable for real repositories

Tasks:

- spike `elkjs` layered layout
- map projected nodes and edges into ELK graph input
- compute positions and routed edge sections
- cache layout results by repository plus projection signature

Exit criteria:

- manual node dragging is no longer required to make the graph readable
- merge-heavy repositories remain legible without custom reorganization

### Phase 4: Move Interaction to Revision Selection

Goal:

- match the TortoiseGit interaction model

Tasks:

- select revisions by node, with Ctrl/Cmd additive selection
- show commit tooltip with date, author, subject, hash, and refs
- make compare/log/unified diff operate from selected revisions
- support compare against HEAD and worktree from a selected revision

Exit criteria:

- actions are revision-driven, not ref-label-driven
- the node itself is the main click target

### Phase 5: Add Navigation Parity

Goal:

- restore the navigation affordances expected from a revision graph

Tasks:

- implement a real overview/minimap
- add find by ref, hash, subject, message, and author
- add keyboard navigation and refresh behavior
- keep scroll/zoom centered around the active selection or HEAD

Exit criteria:

- minimap works
- find can focus and select commits
- refresh preserves the best possible viewport context

### Phase 6: Finalize Workflow Parity

Goal:

- reach feature parity for graph-driven day-to-day workflows

Tasks:

- refine context menus for one revision vs two revisions
- improve branch/tag/remote action grouping
- preserve safe mutation checks for dirty worktrees and conflicts
- support copy ref names and commit hash actions

Exit criteria:

- the graph feels like an operational tool, not just a visualizer

## Acceptance Criteria

The implementation can be considered "architecturally on track" when all of these are true:

- A merge commit can be rendered with all of its parents preserved in the source model.
- A commit without refs can remain hidden visually without breaking graph semantics.
- The visible scene is derived from a projection layer, not from destructive parsing shortcuts.
- The selected entity in the graph is a revision.
- The layout engine is externalized and replaceable.
- The overview/minimap is functional.
- Filters are explicit graph view options, not one-off special cases.

The implementation can be considered "functionally close to TortoiseGit" when these are true:

- Two selected revisions can be compared, logged, and shown as unified diff.
- One selected revision can be compared to HEAD and worktree when applicable.
- Users can filter the graph to current branch, local branches, or revision ranges.
- Tags can be folded or expanded without corrupting ancestry.
- Refresh, zoom, pan, and find feel native and predictable.

## Risks and Mitigations

### Risk: layout cost becomes too high for large histories

Mitigation:

- cache layouts by projection signature
- keep layout work off the hot path
- support bounded loading first, then progressively widen

### Risk: webview payloads become too large

Mitigation:

- separate source graph from visible scene
- send only projected scene plus metadata needed for interaction
- avoid embedding redundant HTML for every derived state

### Risk: parity work drifts into a custom Git client

Mitigation:

- keep graph loading in Git CLI
- keep compare, checkout, merge, branch, and diff flows on the native VS Code side where possible

### Risk: refactor breaks the working MVP before the new path is ready

Mitigation:

- migrate in vertical slices
- keep old renderer and new graph pipeline side by side behind a temporary switch until Phase 3 is stable

## Immediate Next Slice

The highest-leverage next implementation slice is:

1. Introduce `CommitGraph` and `ProjectedGraph` types.
2. Port current parsing into the new source/model split.
3. Rework tests so they assert full DAG semantics before any layout logic.
4. Add a small layout spike using `elkjs` on fixture graphs.

That sequence reduces architecture risk before touching the UI too deeply.

## Non-Goals for the First Refactor Wave

- pixel-perfect visual cloning of the TortoiseGit window chrome
- reproducing every historical TortoiseGit toggle before the data model is correct
- replacing native VS Code diff editors with a custom compare UI

The first mission is semantic fidelity, not skin-deep similarity.
