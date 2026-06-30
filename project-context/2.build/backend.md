# Backend Build Guidance

Status: Active
Last consolidated: 2026-06-30

## Scope

Extension host orchestration, command registrations, Git API adapters, targeted Git CLI calls,
ref actions, content providers, repository synchronization, cache invalidation, and workflow
guards.

## Current Guidance

- Prefer the built-in `vscode.git` API for repository state and mutations.
- Keep targeted Git CLI usage bounded and limited to graph/history/textual data where the public
  API is insufficient.
- Preserve cancellation, stale-response guards, repository selection, multi-repository behavior,
  and zero-repository empty states.
- Preserve conflict guards before workspace-changing operations.
- Keep backend changes aligned with `src/extension.ts`, `src/revisionGraph/controller.ts`,
  `src/revisionGraph/backend.ts`, `src/refActions.ts`, `src/workbenchRefActionServices.ts`, and
  `src/git.ts`.

## Verification

- Run `npm run build`.
- Run `npm test` for command, controller, Git workflow, graph-loading, cache, repository, or guard
  changes.
- Manually validate live Git mutation paths in an Extension Development Host when behavior changes.

Historical backend notes are archived in `project-context/archive/build/backend.md`.
