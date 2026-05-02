# Release 0.0.28 Prioritization

## Intent

Version `0.0.28` should define and, if approved after Define, implement the next graph cache architecture improvement: separate immutable commit DAG/history data from mutable repository overlays.

The goal is to make repeated graph refreshes faster and less disruptive in large repositories without weakening repository freshness, cancellation behavior, or the existing VS Code-native graph workflow.

## Inputs Reviewed

- `package.json` baseline version `0.0.27`
- `project-context/3.deliver/release.md` current release readiness state for `0.0.27`
- `project-context/2.build/features/0.0.27-cache-stabilization.md`
- `docs/release-0.0.27-prioritization.md`
- `docs/revision-graph-parity-plan.md`
- Current cache touchpoints in `src/revisionGraph/backend.ts`, `src/revisionGraph/controller.ts`, `src/revisionGraph/panel/state.ts`, `src/revisionGraph/layout/layeredLayout.ts`, `src/revisionGraphData.ts`, and `src/extension.ts`

## Product Observations

- `0.0.27` improved cache observability, completed-snapshot reuse for cancelable refreshes, persisted layout-cache write deduplication, and Show Log cache bounding.
- The backend snapshot cache remains intentionally short lived and conservative. It protects freshness, but it cannot deliver broad reuse because the key includes current refs, `HEAD`, projection options, and graph load policy.
- The controller already has a useful metadata-patch path that can reuse the active snapshot when only repository metadata changes.
- The next meaningful cache gain is architectural: cache the expensive history/topology data separately from mutable overlays that can be refreshed from the Git API.

## Recommended Scope

### 1. Define Immutable Graph Snapshot Boundaries

Risk:

- The current graph snapshot mixes expensive history/topology with ref decorations that change frequently.
- Over-broad reuse can show stale refs or wrong `HEAD` state.

Candidate direction:

- Define an immutable snapshot type for commit DAG/history loaded from targeted `git log`.
- Keep commit hash, parent links, author/date/subject, boundary data, and load metadata in this layer.
- Exclude current `HEAD`, repository refs, upstream/published state, workspace dirtiness, merge-blocked state, and action overlays.

Primary touchpoints:

- `src/revisionGraph/source/graphSnapshot.ts`
- `src/revisionGraph/backend.ts`
- `src/revisionGraph/model/commitGraphTypes.ts`

### 2. Define Mutable Overlay State

Risk:

- Metadata-only changes currently can force full graph reloads when they cannot be patched against the current scene.
- Ref decoration and `HEAD` movement need freshness guarantees that are easier to reason about when they are explicit overlays.

Candidate direction:

- Build a repository overlay from `repository.getRefs()`, `repository.state.HEAD`, upstream state, published-local-branch state, workspace dirtiness, and merge-blocked metadata.
- Apply overlays to the immutable graph before projection/state building.
- Keep overlay refreshes cheap and cancelable.

Primary touchpoints:

- `src/revisionGraph/controller.ts`
- `src/revisionGraph/panel/state.ts`
- `src/revisionGraph/backend.ts`

### 3. Classify Refresh Events

Risk:

- Cache invalidation can become ad hoc if event intent is not explicit.
- Fetch, pull, checkout, branch creation, tag creation, push-only sync, and repository switching have different topology and overlay implications.

Candidate direction:

- Extend the refresh intent model so each path declares whether it requires immutable snapshot reload, overlay rebuild, projection rebuild, or only metadata patching.
- Preserve full rebuild fallback whenever the overlay cannot be applied safely.

Primary touchpoints:

- `src/revisionGraphRefresh.ts`
- `src/revisionGraph/controller.ts`
- `src/refActions.ts`

### 4. Preserve Bounded Cache Behavior

Risk:

- A deeper graph cache can become expensive in memory, especially in multi-repository workspaces and large histories.

Candidate direction:

- Bound immutable snapshots by repository, graph load policy, projection-relevant history parameters, entry count, and age.
- Keep cache metrics visible through `gitRevisionGraph.traceLoading`.
- Avoid persistent commit DAG caching in `0.0.28` unless separately approved.

Primary touchpoints:

- `src/revisionGraph/backend.ts`
- `src/revisionGraph/loadTrace.ts`

## Out Of Scope By Default

- New user-visible Git workflows.
- Marketplace publication, version bumping, or VSIX packaging without explicit approval.
- Persistent on-disk commit DAG storage.
- Full-history graph rendering beyond the bounded recent-commit window.
- Replacing the existing webview/controller architecture.
- Replacing targeted Git CLI graph loading with a different history engine.

## Suggested Release Narrative

`0.0.28` can be positioned as a graph responsiveness release:

- clearer separation between loaded history and live repository metadata
- fewer unnecessary `git log` reloads after metadata-only updates
- safer cache invalidation rules
- continued trace visibility for cache hits, misses, bypasses, and fallbacks

## Acceptance Criteria

- Immutable graph data and mutable overlay data have explicit types and ownership.
- Metadata-only updates can refresh refs/HEAD without re-running `git log` when the relevant commit topology is already loaded.
- History/topology changes still trigger a fresh immutable snapshot.
- Projection rebuilds reuse immutable graph data when safe.
- Cache behavior remains bounded by repository, load policy, entry count, and age.
- Trace output distinguishes immutable-cache hits/misses from overlay rebuilds and full fallbacks.
- Tests cover freshness after rapid refresh, repository switching, checkout, branch/tag creation, fetch, push-only sync, pull-only sync, and cancellation fallback.

## Verification Plan

- `npm run build`
- `npm test`
- Manual Extension Development Host smoke:
  - Enable `gitRevisionGraph.traceLoading`.
  - Load a large repository graph and record baseline `snapshot.gitLog`, projection, and layout timings.
  - Repeat refreshes and confirm cache trace behavior is understandable.
  - Checkout a branch whose tip is already loaded and confirm no unnecessary `git log` reload.
  - Create a branch or tag on a loaded commit and confirm overlay updates without stale refs.
  - Fetch or pull new commits and confirm the immutable graph reloads when topology changes.
  - Switch repositories and confirm no cache bleed between repositories.

## Risks

- Incorrect invalidation can show stale refs, stale `HEAD`, or incomplete topology.
- A superset snapshot could increase initial load cost if it fetches more history than the user needs.
- Overlay application can duplicate projection logic if ownership boundaries are not clean.
- Cache metrics can become noisy unless labels clearly distinguish immutable, overlay, projection, and layout phases.

## Open Questions

- Should `0.0.28` introduce an exact-key immutable snapshot cache first, or immediately pursue a projection-superset cache?
- Which operations must force immutable reload: fetch, pull, merge, checkout, branch creation, tag creation, delete ref, repository state change, or repository set change?
- Should `git log` continue to include decoration data for compatibility while overlays are introduced, or should decoration be moved out of snapshot loading in the same release?
- What cache TTL and entry budget are appropriate for large multi-repository workspaces?
- Should cache efficiency be judged by trace timings only, or should the extension expose aggregate cache counters in diagnostics?
