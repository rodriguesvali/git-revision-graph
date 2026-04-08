# Project Map

## Overview

This repository is a small VS Code extension prototype named `Git Refs Explorer`. Its active product surface is a revision-graph webview that visualizes Git refs and runs compare, checkout, merge, and deletion workflows from a dedicated Activity Bar view.

## Main Files

- `package.json`
  - Extension manifest
  - Contributed commands, menus, view container, and view
  - Activation events and extension dependency on `vscode.git`
- `src/extension.ts`
  - Activation entrypoint
  - Webview provider registration
  - Command handlers
  - Content providers for ref-backed diffs
  - Shared helpers for labels, URI construction, and error handling
- `src/revisionGraphPanel.ts`
  - Active revision graph controller and webview UI
  - Graph-side actions such as compare, log, unified diff, checkout, merge, and delete
- `src/revisionGraphRepository.ts`
  - Git-backed loading and log helpers used by the revision graph
- `src/revisionGraphWebview.ts`
  - HTML/CSS/JS generation for the revision graph webview
- `src/git.ts`
  - Minimal TypeScript interfaces for the subset of the built-in Git API used here
- `README.md`
  - MVP scope, features, limitations, and local development flow

## Current Product Shape

- Activity Bar container: `gitRefs`
- Active view: `gitRefs.revisionGraphView`
- Commands:
  - `gitRefs.refresh`
  - `gitRefs.compareRefs`
  - `gitRefs.compareWithWorktree`
  - `gitRefs.checkout`
  - `gitRefs.merge`
  - `gitRefs.openRevisionGraph`
  - `gitRefs.chooseRevisionGraphRepository`

The current implementation mixes native VS Code UX with a dedicated webview surface:

- `WebviewViewProvider` for graph navigation
- `QuickPick` for reference and file selection
- `showInputBox` for branch naming
- `showWarningMessage` for destructive confirmations
- `vscode.diff` plus `TextDocumentContentProvider` for ref-vs-ref and ref-vs-worktree diffs

## Architectural Constraints

- Prefer the public `vscode.git` API over shelling out to `git`.
- Preserve multi-repository workspace support.
- Handle the zero-repository case cleanly.
- Keep the current MVP lightweight. The webview is already part of the active architecture, but avoid adding a heavier persistent data layer unless the user asks for a more ambitious redesign.

## Known Gaps

- An automated unit test suite exists for the pure data and command helpers.
- The test suite covers pure helpers well, but the webview controller still has limited direct coverage.
- `src/revisionGraphPanel.ts` currently centralizes most logic, so larger changes should consider extracting modules.
- The legacy tree prototype now lives under `src/legacy/` and is kept only as reference/tested fallback code.
- Compare results currently surface through a `QuickPick`, not a persistent results view.
- UX around merge conflicts and detached/tag workflows is intentionally minimal.

## Validation Notes

- Minimum validation: `npm run build`
- For command or UX changes, manually test in an Extension Development Host.
- If changing manifest contributions, verify the command IDs and view IDs still match code registrations exactly.
