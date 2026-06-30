# Frontend Build Guidance

Status: Active
Last consolidated: 2026-06-30

## Scope

Revision graph webview, Compare Results and Show Log editor panels, browser-side interactions,
theming, layout, minimap, search, focus modes, context menus, and user-facing copy.

## Current Guidance

- Keep the editor graph as the primary graph surface.
- Preserve VS Code theme compatibility and native workbench ergonomics.
- Preserve search, selection, minimap, zoom, persisted offsets, context menus, and virtualized
  rendering when changing graph scenes.
- Keep Focus Range and Focus Descendants mutually exclusive unless a scoped feature explicitly
  changes that product rule.
- Avoid adding persistent webviews or contribution surfaces without product approval.

## Verification

- Run `npm run build`.
- Run `npm test` for graph state, message validation, render coordination, webview shell, or
  interaction changes.
- Manually validate affected graph and review-panel workflows in an Extension Development Host.

Historical frontend notes are archived in `project-context/archive/build/frontend.md`.
