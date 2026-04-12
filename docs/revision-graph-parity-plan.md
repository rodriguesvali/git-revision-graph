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
- Local mutations such as checkout, branch creation, and ref updates still trigger a full graph rebuild even when only ref decorations or HEAD state changed.
- Repository events are treated as generic refresh triggers instead of being classified into metadata-only updates versus topology-changing updates.

## Architectural Principles

The redesign should follow these rules:

1. Commit is the primary domain object.
2. Refs are annotations on commits.
3. Simplification belongs to a projection layer, never to the source model.
4. Layout is a dedicated concern, not mixed into parsing or action code.
5. The extension host owns Git I/O and orchestration.
6. The webview owns rendering and local interaction state.
7. Native VS Code workflows should still be reused for diff, SCM, checkout, merge, and document opening whenever possible.
8. Refresh strategy should distinguish topology changes from metadata-only mutations and prefer incremental updates when the loaded commit DAG is still valid.

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
- keep mutable ref and HEAD overlays separable from the immutable commit DAG when possible
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
- classify repository and command-side mutations by cost
- support partial state patches for metadata-only updates
- preserve selection, zoom, and viewport context across refreshes whenever possible

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

It should also be able to apply targeted updates for ref decorations, HEAD markers, selection, and viewport state without requiring a full scene reset every time.

## Performance and Efficiency Track

The parity work should include a first-class efficiency track, not just correctness and UX parity.

Goals:

- reduce unnecessary full graph rebuilds after local mutations
- avoid re-running `git log`, projection, layout, and full webview state serialization when the commit DAG did not change
- preserve viewport, zoom, and selection context during refreshes
- make repository event handling proportional to the actual scope of change

Key roadmap items:

1. Introduce refresh intent classification.
   - Separate mutations into:
     - metadata-only updates such as local checkout, HEAD movement within the loaded graph, branch creation from an already loaded commit, upstream/ahead-behind updates, and ref decoration changes
     - topology-affecting updates such as fetch introducing new commits, merge creating new commits, history widening, projection-option changes, and repository switching
   - Use that classification to choose between patching the current state, recomputing projection/layout, or rebuilding from source.
2. Add DAG reuse and snapshot signatures.
   - Cache the loaded commit graph by repository plus graph-load parameters.
   - Reuse the current DAG when refs or HEAD move but the loaded commit set is still valid.
   - Track when a command or repository event invalidates only overlays versus the underlying graph source.
3. Split immutable graph structure from mutable overlays.
   - Keep commit nodes, parent/child edges, and layout anchors stable when possible.
   - Recompute lightweight overlays for HEAD, branch/tag decorations, selection, conflict badges, and sync status separately.
4. Add partial webview updates.
   - Support host messages for patching refs, HEAD markers, selection, and viewport state without re-sending the full scene.
   - Keep `init-state` for first paint and `update-state` for full recomputation, but add narrower update messages for hot paths.
5. Preserve view context aggressively.
   - Keep the active selection, scroll position, and zoom level across metadata-only updates.
   - Re-center only when the selected commit disappears, the repository changes, or the user explicitly requests reorganization.
6. Reduce duplicate refresh triggers.
   - Avoid firing a generic refresh both from the action completion path and from the subsequent repository event when one classified update is enough.
   - Coalesce bursts of repository events into one classified refresh decision.
7. Measure cost before and after each optimization slice.
   - Add timing instrumentation around graph load, projection, layout, serialization, and postMessage delivery.
   - Log whether a refresh was metadata-only, projection-only, or full rebuild so regressions are visible.
8. Optimize specific local workflows first.
   - Checkout of an already loaded local branch should usually update HEAD and ref decorations without rebuilding the graph.
   - Branch creation from an already loaded commit should usually add a local ref decoration and HEAD marker patch without reloading history.
   - Sync/push flows that do not change the loaded commit window should prefer overlay updates plus ahead/behind recomputation.
   - Repository state changes that only affect conflict badges or worktree cleanliness should not invalidate graph topology.

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
- establish performance baselines before changing refresh behavior

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
- add timing probes for graph load, projection, layout, and host-to-webview update cost
- capture current refresh behavior for checkout, branch creation, merge, sync, and repository event bursts

Exit criteria:

- we can compare old and new graph snapshots from the same repo fixtures
- we have a baseline for full refresh cost and hot-path mutation cost

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
- keep projection inputs stable enough to support projection reuse when only overlays change

Exit criteria:

- the same source DAG can drive multiple view modes
- folding rules reconnect topology intentionally and predictably
- metadata-only updates do not force projection recomputation

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
- preserve selection identity across metadata-only refreshes

Exit criteria:

- actions are revision-driven, not ref-label-driven
- the node itself is the main click target
- selection survives local ref and HEAD updates whenever the selected commit is still present

### Phase 5: Add Navigation Parity

Goal:

- restore the navigation affordances expected from a revision graph

Tasks:

- implement a real overview/minimap
- add find by ref, hash, subject, message, and author
- add keyboard navigation and refresh behavior
- keep scroll/zoom centered around the active selection or HEAD
- avoid viewport resets for metadata-only updates

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
- classify workflow-side refreshes so local operations can patch the current graph instead of rebuilding it by default

Exit criteria:

- the graph feels like an operational tool, not just a visualizer
- common local workflows no longer trigger unnecessary full graph reloads

## Acceptance Criteria

The implementation can be considered "architecturally on track" when all of these are true:

- A merge commit can be rendered with all of its parents preserved in the source model.
- A commit without refs can remain hidden visually without breaking graph semantics.
- The visible scene is derived from a projection layer, not from destructive parsing shortcuts.
- The selected entity in the graph is a revision.
- The layout engine is externalized and replaceable.
- The overview/minimap is functional.
- Filters are explicit graph view options, not one-off special cases.
- Metadata-only mutations can update the visible graph without rebuilding the full source snapshot.

The implementation can be considered "functionally close to TortoiseGit" when these are true:

- Two selected revisions can be compared, logged, and shown as unified diff.
- One selected revision can be compared to HEAD and worktree when applicable.
- Users can filter the graph to current branch, local branches, or revision ranges.
- Tags can be folded or expanded without corrupting ancestry.
- Refresh, zoom, pan, and find feel native and predictable.
- Local workflows such as checkout and branch creation do not reset the graph unnecessarily when the visible commit window is still valid.

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

### Risk: optimization logic becomes too ad hoc and breaks graph correctness

Mitigation:

- classify updates explicitly instead of scattering one-off shortcuts across command handlers
- keep full rebuild as the fallback when a partial update cannot prove safety
- test partial updates against the same fixture graphs used for full rebuild validation

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
5. Add refresh intent classification and instrument the cost of full rebuild versus metadata-only patch flows.

That sequence reduces architecture risk before touching the UI too deeply.

## 0.0.12 Performance Implementation Plan

This release should take the first practical step toward efficient refreshes without waiting for the entire parity refactor to land.

### Why this is the right first slice

The current implementation already has the hooks needed to improve refresh efficiency, but they are wired in a coarse-grained way:

- command-side workflows call a generic `refresh()` after successful local mutations
- repository events such as `onDidChange` and `onDidCheckout` also trigger generic refreshes
- `buildReadyRevisionGraphViewState(...)` always rebuilds snapshot, projection, scene, layout metadata, and derived reference lists
- the host-to-webview protocol only distinguishes `init-state`, `update-state`, `set-loading`, and `set-error`

That means a local checkout or branch creation can trigger more work than the user-visible change actually requires.

### Release Objective

For `0.0.12`, the concrete objective should be:

- avoid unnecessary full graph rebuilds for metadata-only local operations when the loaded commit window still contains the relevant commit topology

This is intentionally narrower than full incremental rendering. The release should optimize the hot local paths first and keep full rebuilds as a safe fallback.

### Scope Boundaries

In scope:

- checkout to an already loaded local branch
- branch creation from a commit already present in the loaded graph
- HEAD and ref-decoration updates
- selection, zoom, and scroll preservation across lightweight updates
- event deduplication between explicit command refreshes and repository event refreshes
- instrumentation that proves whether the change reduced work

Out of scope for `0.0.12`:

- general-purpose partial updates for every repository mutation
- fetch-driven topology expansion
- merge-created commits outside the currently loaded snapshot
- replacing the current graph pipeline or layout engine
- eliminating full refresh as a fallback

### Proposed Technical Slices

#### Slice A: Add refresh intent classification

Goal:

- stop treating every update as the same kind of refresh

Implementation outline:

- introduce a small refresh intent model in the controller layer, for example:
  - `full-rebuild`
  - `projection-rebuild`
  - `metadata-patch`
  - `overlay-patch`
- tag command completions with the most likely intent instead of always calling a blind refresh
- classify repository events before scheduling work

Initial heuristics:

- `checkout` of an existing local branch:
  - default to `metadata-patch`
- `createBranch` from a commit already visible in the current scene:
  - default to `metadata-patch`
- `sync-current-head`:
  - start with `full-rebuild`, then relax later only if the visible commit window is unchanged
- `merge`:
  - keep `full-rebuild`
- projection option changes or repository changes:
  - `projection-rebuild` or `full-rebuild`

Likely touchpoints:

- `src/refActions.ts`
- `src/refActions/types.ts`
- `src/revisionGraph/controller.ts`

#### Slice B: Deduplicate refresh triggers

Goal:

- avoid doing command-side refresh work and then repeating it when the repository event arrives

Implementation outline:

- add a short-lived controller-side mutation token or suppression window
- when a known local command completes, record the expected repository effect
- when the matching `onDidChange` or `onDidCheckout` arrives, coalesce it into the already scheduled classified update instead of scheduling a second full refresh

Safety rule:

- if the observed repository state does not match the expected mutation, fall back to full rebuild

Likely touchpoints:

- `src/revisionGraph/controller.ts`
- `src/revisionGraph/renderCoordinator.ts`

#### Slice C: Separate stable scene structure from mutable overlays

Goal:

- reuse the current visible scene when topology did not change

Implementation outline:

- treat these as mutable overlays:
  - `currentHeadName`
  - `currentHeadUpstreamName`
  - `isWorkspaceDirty`
  - `mergeBlockedTargets`
  - ref labels bound to already visible commits
- treat these as stable for metadata-only updates:
  - `scene`
  - `nodeLayouts`
  - `sceneLayoutKey`
  - canvas dimensions
- add a helper that can derive a patched `RevisionGraphViewState` from the previous state plus current repository metadata

Likely touchpoints:

- `src/revisionGraphTypes.ts`
- `src/revisionGraph/panel/state.ts`
- `src/revisionGraph/backend.ts`

#### Slice D: Add narrow host-to-webview patch messages

Goal:

- stop re-sending the full graph payload when only overlays changed

Implementation outline:

- extend the host message protocol with one or two narrow messages first, for example:
  - `patch-metadata`
  - `patch-selection-context`
- keep the first version intentionally small:
  - HEAD name
  - upstream label
  - workspace dirty flag
  - merge-blocked target ids
  - visible reference decorations
- leave `update-state` in place as the fallback path

Likely touchpoints:

- `src/revisionGraphTypes.ts`
- `src/revisionGraph/controller.ts`
- `src/revisionGraph/webview/script/bootstrap.ts`

#### Slice E: Preserve viewport and selection context

Goal:

- lightweight updates should feel visually stable

Implementation outline:

- keep selection identity keyed by commit hash or stable reference id when possible
- preserve zoom and scroll on metadata-only patches
- keep auto-center and auto-arrange disabled for metadata-only updates
- only re-center when:
  - the selected commit/reference is no longer visible
  - the repository changed
  - the user explicitly asked to reorganize or focus

Likely touchpoints:

- `src/revisionGraph/controller.ts`
- `src/revisionGraph/webview/script/bootstrap.ts`
- `src/revisionGraph/webview/script/interactions.ts`

#### Slice F: Add instrumentation and success metrics

Goal:

- verify that the optimization actually reduces work

Implementation outline:

- measure and log:
  - snapshot load time
  - projection time
  - scene/layout build time
  - serialization/postMessage time
  - total refresh duration
- include the refresh intent in logs
- count how often:
  - a metadata patch succeeded
  - a metadata patch escalated to full rebuild
  - duplicate repository events were suppressed

Success criteria for `0.0.12`:

- checkout of an already loaded local branch no longer triggers a full graph rebuild in the common case
- branch creation from an already visible commit no longer triggers a full graph rebuild in the common case
- the graph preserves zoom/scroll/selection during those operations
- all optimized paths still fall back safely to full rebuild when invariants fail

### Current-Code Notes That Should Shape the Design

These current implementation details matter for the first optimization slice:

- `src/refActions.ts` currently ends successful mutations with `services.refreshController.refresh()`, which carries no intent or cost classification.
- `src/revisionGraph/controller.ts` currently treats `repository.state.onDidChange(...)` and `repository.onDidCheckout(...)` as generic refresh sources.
- `src/revisionGraph/panel/state.ts` currently rebuilds the full ready state in one path, which is clean but too coarse for metadata-only updates.
- `src/revisionGraphTypes.ts` currently has no patch-oriented host messages.
- `src/revisionGraph/backend.ts` already has snapshot caching, but the cache key includes current refs and HEAD metadata, which makes it too eager to invalidate for some metadata-only updates.

### Suggested Milestone Order for the Release

1. Add refresh intent types and thread them through command completions.
2. Add controller-side deduplication for command-triggered repository events.
3. Add a metadata-patch state builder that reuses the current scene.
4. Add one narrow host message for metadata-only updates.
5. Preserve selection/viewport for metadata-only updates.
6. Add instrumentation and compare before/after timings on checkout and create-branch flows.

### Suggested Test Matrix for the Release

- checkout local branch already present in the visible graph
- create branch from a commit already present in the visible graph
- checkout remote/tag path that still creates a new local branch
- merge path that must still use full rebuild
- dirty worktree/conflict updates that only change status overlays
- repository event burst after a local mutation
- fallback to full rebuild when a ref points outside the current loaded graph window

## Non-Goals for the First Refactor Wave

- pixel-perfect visual cloning of the TortoiseGit window chrome
- reproducing every historical TortoiseGit toggle before the data model is correct
- replacing native VS Code diff editors with a custom compare UI

The first mission is semantic fidelity, not skin-deep similarity.
