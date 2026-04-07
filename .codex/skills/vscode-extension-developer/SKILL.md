---
name: vscode-extension-developer
description: Build, review, and evolve VS Code extensions, especially this repository's Git Refs Explorer. Use when working on extension manifests, activation flows, commands, views, TreeDataProvider logic, text content providers, extension-host UX, or integration with the built-in vscode.git API.
---

# VS Code Extension Developer

## Overview

Use native VS Code extension patterns first. Prefer commands, tree views, content providers, and the built-in `vscode.git` API over custom shells, custom Git parsing, or webviews unless the user explicitly asks for a heavier UI.

When the task targets this repository, read `references/project-map.md` before making non-trivial changes.

When you need up-to-date documentation for VS Code APIs, extension manifests, or current extension guidance, use `context7` before relying on memory.

## Core Workflow

1. Inspect `package.json` first.
   - Confirm contributed commands, menus, views, icons, activation events, and `engines.vscode`.
   - Keep contributions and implementation in sync. If a command or view changes in code, update the manifest too.
2. Inspect the runtime entrypoints.
   - Read `src/extension.ts` for activation, registrations, UI flows, and command handlers.
   - Read `src/git.ts` for the subset of the `vscode.git` API this project relies on.
3. Preserve native extension ergonomics.
   - Prefer `TreeDataProvider`, `QuickPick`, `showInputBox`, `showWarningMessage`, `ThemeIcon`, and `vscode.diff`.
   - Avoid introducing a `Webview` for workflows the native workbench already supports well.
4. Keep Git integration lightweight.
   - Prefer the built-in `vscode.git` extension API for refs, diffs, checkout, merge, and file content.
   - Avoid shelling out to `git` for core product behavior unless the API cannot support the required flow.
5. Protect extension-host UX.
   - Handle missing repositories, multi-root workspaces, canceled picks, and unavailable Git integration gracefully.
   - Favor short, actionable user-facing messages.
6. Validate after changes.
   - Run `npm run build`.
   - If behavior changes touch commands, views, or Git flows, describe the manual verification path in the final response.

## Implementation Rules

- Keep UI changes aligned with VS Code conventions.
- Keep activation lightweight and event-driven.
- Avoid blocking work in activation or tree rendering.
- Preserve multi-repository behavior unless the user explicitly narrows scope.
- Treat `package.json` as product surface, not just metadata.
- Keep the `src/git.ts` contract minimal and aligned to only the API members actually used.
- Prefer extracting helpers or modules when a change would make `src/extension.ts` harder to reason about.

## Change Checklist

- Update `package.json` when adding or renaming commands, views, menus, or activation events.
- Update README when user-visible behavior or supported workflows change.
- Keep labels, prompts, and confirmation messages consistent with the feature flow.
- Re-check empty-state behavior for zero repositories and multi-repo workspaces.
- Re-check error handling around async Git operations.

## Validation

- Required: `npm run build`
- Recommended for behavior changes:
  - Launch the Extension Development Host with `F5`
  - Open a Git repository in the host window
  - Exercise the affected command from the `Git Refs` view or Command Palette
  - Verify diff, checkout, merge, and refresh behavior if those areas changed

## Project References

- Read `references/project-map.md` for repository-specific architecture, current commands, and validation notes.
