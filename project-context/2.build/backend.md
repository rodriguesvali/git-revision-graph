# Backend

## Scope
Extension host orchestration, command registrations, Git API adapters, targeted Git CLI integration, ref actions, content providers, repository synchronization, and workflow guards.

## Inputs
Use `package.json`, `src/extension.ts`, `src/git.ts`, `src/refActions.ts`, `src/workbenchRefActionServices.ts`, feature artifacts, and the VS Code extension developer skill references.

## Changes
Record shared backend changes here. Feature-specific implementation notes belong under `project-context/2.build/features/`.

- 2026-05-01 `0.0.27` stabilization hardening:
  - Added timeout support to targeted Git execution.
  - Added output caps/timeouts to expensive Git CLI paths.
  - Added Git option terminators before direct revision arguments where command syntax supports them.
  - Added repository containment checks before compare restore writes/deletes worktree paths.
  - Switched ref-backed content loading to the shared bounded Git executor.
- 2026-05-01 `0.0.27` cache stabilization:
  - Added snapshot cache trace events for hits, misses, and cancelable pending-entry bypasses.
  - Reused completed graph snapshot cache entries for cancelable refreshes without sharing cancelable in-flight Git work.
  - Skipped redundant persisted layout-cache workspace-state writes when the serialized payload is unchanged.
  - Bounded Show Log expanded-change caching with a small LRU-style commit budget.
- 2026-05-02 `0.0.28` graph cache architecture:
  - Applied explicit repository overlays to ready-state graph snapshots before projection and merge-blocked target calculation.
  - Reused the same overlay normalization for metadata patches and ready-state builds.
  - Relaxed short-lived snapshot cache keys so same-commit ref renames can reuse loaded history while live labels come from repository overlays.
  - Added `state.repositoryOverlay` graph load trace timing.
- 2026-05-02 `0.0.28` current scope refinement:
  - Current-scope graph loading keeps using `HEAD` by default and switches to `--all` when `Show Current Branch Descendants` is enabled.
  - Projection now includes visible descendant ref tips from `HEAD` in addition to the current branch ancestry when the option is enabled.

## Verification
- Run `npm run build`.
- Run `npm test` for command, graph loading, Git workflow, controller, repository selection, or guard changes.
- Manually test workspace-changing actions in an Extension Development Host when they affect checkout, branch, sync, merge, delete, or restore behavior.

Latest automated verification for this backend slice:

- `npm run build` passed.
- `npm test` passed with 237 tests.

## Decisions
- Prefer the built-in `vscode.git` API for refs, repository state, checkout, merge, pull, push, and diff workflows.
- Keep targeted Git CLI usage for graph/history data where the public API is insufficient.
- Preserve conflict guards and cancellation behavior.

## Handoff Notes
Document changed files, command IDs, manifest impact, Git operation risk, test results, and remaining manual checks.

## Known Gaps
Some Git integration behavior depends on live repositories and requires manual validation.
