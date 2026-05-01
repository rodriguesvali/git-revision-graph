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

## Verification
- Run `npm run build`.
- Run `npm test` for command, graph loading, Git workflow, controller, repository selection, or guard changes.
- Manually test workspace-changing actions in an Extension Development Host when they affect checkout, branch, sync, merge, delete, or restore behavior.

Latest automated verification for this backend slice:

- `npm run build` passed.
- `npm test` passed with 221 tests.

## Decisions
- Prefer the built-in `vscode.git` API for refs, repository state, checkout, merge, pull, push, and diff workflows.
- Keep targeted Git CLI usage for graph/history data where the public API is insufficient.
- Preserve conflict guards and cancellation behavior.

## Handoff Notes
Document changed files, command IDs, manifest impact, Git operation risk, test results, and remaining manual checks.

## Known Gaps
Some Git integration behavior depends on live repositories and requires manual validation.
