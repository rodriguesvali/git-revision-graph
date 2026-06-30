# QA Guidance

Status: Active
Last consolidated: 2026-06-30

## Standard Checks

- `npm run build` after meaningful changes.
- `npm test` for behavior, command, controller, graph, Git workflow, webview, or release-bound
  changes.
- `git diff --check` before release-candidate handoff.

## Manual Smoke Areas

Use an Extension Development Host for user-visible graph or Git workflow changes:

- graph open/reveal from Source Control and Command Palette;
- repository switching, zero-repository state, and multi-repository selection;
- graph scopes, Focus Range, Focus Descendants, search, minimap, zoom, and context menus;
- Compare Results, unified diff, Show Log, and file diff opening;
- checkout, branch/tag creation, sync, merge/conflict, delete, reset, stash, restore, and remote
  permission failures.

## Result Recording

Record concise command results and manual coverage in the active feature artifact and, for
release-bound work, in `project-context/3.deliver/release.md`.

Historical QA logs are archived in `project-context/archive/build/qa.md`.
