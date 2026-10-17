# QA Guidance

Status: Active
Last consolidated: 2026-06-30

## Standard Checks

- `npm run build` after meaningful changes.
- `npm test` for behavior, command, controller, graph, Git workflow, webview, or release-bound
  changes.
- `npm run test:e2e` runs empty, single-repository and two-repository safety scenarios
  in real VS Code hosts. CI covers the declared minimum and stable. See the
  [S4 artifact](features/1.7.5-extension-host-safety-regressions.md) for real transport,
  Git/fault assertions and the boundary between automated checks and manual UX.
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
