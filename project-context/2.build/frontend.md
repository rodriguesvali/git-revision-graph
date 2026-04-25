# Frontend

## Scope
Revision graph webview, compare/log webview surfaces, browser-side graph interactions, theming, layout, filters, context menus, and user-visible copy.

## Inputs
Use `README.md`, `docs/revision-graph-parity-plan.md`, feature artifacts in `project-context/2.build/features/`, and existing webview code as sources.

## Changes
Record frontend changes here only when they affect shared webview behavior. Prefer feature-specific files under `project-context/2.build/features/` for individual feature notes.

## Verification
- Run `npm run build`.
- Run `npm test` for graph state, render coordination, controller, or behavior changes.
- Manually verify affected graph interactions in an Extension Development Host when changing webview behavior.

## Decisions
- Keep UI aligned with VS Code workbench conventions and theme variables.
- Preserve existing webview surface rather than adding new persistent webviews unless explicitly scoped.

## Handoff Notes
Document changed files, user-facing behavior, known browser-side state risks, and manual validation performed.

## Known Gaps
Manual VS Code webview validation is still needed for many UI regressions.
