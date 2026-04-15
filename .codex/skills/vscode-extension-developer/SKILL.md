---
name: vscode-extension-developer
description: Build, review, and evolve VS Code extensions, especially this repository's GIT Revision Graph. Use when working on extension manifests, activation flows, commands, revision-graph webview/controller logic, text content providers, extension-host UX, or integration with the built-in vscode.git API.
---

# VS Code Extension Developer

## Overview

Use native VS Code extension patterns first, but preserve the active architecture of the target project. In this repository, the primary product surface is a revision-graph `WebviewViewProvider` backed by native VS Code picks, confirmations, diff editors, and Source Control flows.

Prefer the built-in `vscode.git` API for repository state, refs, checkout, merge, and diff workflows. In this repository, targeted `git` commands are also part of the intended design for commit-graph and textual history data that the public API does not expose well, so do not remove or replace those paths unless the task specifically calls for it.

When the task targets this repository, read the skill reference `references/project-map.md` before making non-trivial changes.

When you need up-to-date documentation for VS Code APIs, extension manifests, or current extension guidance, use `context7` before relying on memory.

## Core Workflow

1. Inspect `package.json` first.
   - Confirm contributed commands, menus, views, icons, activation events, and `engines.vscode`.
   - Keep contributions and implementation in sync. If a command or view changes in code, update the manifest too.
2. Inspect the runtime entrypoints.
   - Read `src/extension.ts` for activation, registrations, and command wiring.
   - Read `src/revisionGraphPanel.ts` and `src/revisionGraph/controller.ts` for the active revision-graph view lifecycle, repository synchronization, and webview message handling.
   - Read `src/compareResultsView.ts` when the task touches compare flows, compare presentation, or view wiring.
   - Read `src/refActions.ts` and `src/workbenchRefActionServices.ts` for compare, checkout, branch, sync, merge, deletion, and native VS Code UX adapters.
   - Read `src/git.ts` for the subset of the `vscode.git` API this project relies on.
3. Preserve native extension ergonomics.
   - In this repository, keep the revision graph in the existing webview surface and keep surrounding workflows aligned with native VS Code patterns like `QuickPick`, `showInputBox`, `showWarningMessage`, `showInformationMessage`, `ThemeIcon`, `vscode.diff`, and `workbench.view.scm`.
   - Avoid introducing extra webviews for workflows the native workbench already supports well.
4. Keep Git integration lightweight.
   - Prefer the built-in `vscode.git` extension API for refs, repository state, checkout, merge, pull, push, and file content.
   - In this repository, preserve the existing targeted `git log`, `git diff`, `git show`, and related command paths for graph/history data or workflows the API does not support cleanly.
   - Avoid adding new shell-driven behavior for flows already handled well by the API.
5. Protect extension-host UX.
   - Handle missing repositories, multi-root workspaces, canceled picks, unresolved webview state, and unavailable Git integration gracefully.
   - Keep conflict handling and clean-worktree guards intact for workspace-changing actions.
   - Favor short, actionable user-facing messages.
6. Validate after changes.
   - Run `npm run build`.
   - Run `npm test` when changing behavior, controller logic, graph loading, or user workflows.
   - If behavior changes touch commands, views, the revision graph webview, or Git flows, describe the manual verification path in the final response.

## Implementation Rules

- Keep UI changes aligned with VS Code conventions.
- Keep activation lightweight and event-driven.
- Avoid blocking work in activation, repository event handlers, or webview refresh/render flows.
- Preserve multi-repository behavior unless the user explicitly narrows scope.
- Treat `package.json` as product surface, not just metadata.
- Keep the `src/git.ts` contract minimal and aligned to only the API members actually used.
- Prefer extracting helpers or modules when a change would make `src/extension.ts`, `src/revisionGraph/controller.ts`, or the webview runtime harder to reason about.
- Preserve the current split between native workbench UX adapters, graph backend loading, and webview presentation unless the task explicitly asks for a redesign.

## Change Checklist

- Update `package.json` when adding or renaming commands, views, menus, or activation events.
- Update README when user-visible behavior or supported workflows change.
- Keep labels, prompts, confirmation messages, and webview action text consistent with the feature flow.
- Re-check empty-state behavior for zero repositories and multi-repo workspaces.
- Re-check error handling around async Git operations, webview messages, and refresh cancellation.
- Add or update tests when changing command behavior, graph state shaping, render coordination, or webview shell output.

## Validation

- Required: `npm run build`
- Required for behavior changes: `npm test`
- Recommended for behavior changes:
  - Launch the Extension Development Host with `F5`
  - Open a Git repository in the host window
  - Exercise the affected command from the `GIT Revision Graph` view or Command Palette
  - Verify graph loading, repository switching, scope/filter toggles, and refresh behavior if those areas changed
  - Verify `Compare Results` view population and file opening if compare flows changed
  - Verify diff, checkout, branch creation, sync, merge, and deletion flows if those areas changed

## Project References

- Read `references/project-map.md` for repository-specific architecture, current views, commands, and validation notes.
