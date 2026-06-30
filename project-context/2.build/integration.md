# Integration Guidance

Status: Active
Last consolidated: 2026-06-30

## Scope

Alignment between `package.json`, activation, command handlers, Git workflows, webview messages,
README/CHANGELOG, tests, and release artifacts.

## Current Guidance

- Treat `package.json` as product surface.
- Keep command IDs, view types, menus, activation behavior, README, and tests aligned.
- When VS Code contribution points change, update manifest, registrations, docs, and tests in the
  same feature slice.
- Preserve the Source Control toolbar launch path and singleton editor graph behavior.
- Keep archived artifacts historical unless explicitly reopened.

## Verification

- Run `npm run build`.
- Run `npm test` for behavior or contribution-surface changes.
- Use `git diff --check` before release-candidate handoff.

Historical integration notes are archived in `project-context/archive/build/integration.md`.
