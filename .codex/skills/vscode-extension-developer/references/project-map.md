# Project Map

## Overview

This repository is a small VS Code extension prototype named `Git Refs Explorer`. It visualizes Git refs and runs compare, checkout, and merge workflows from a dedicated Activity Bar view.

## Main Files

- `package.json`
  - Extension manifest
  - Contributed commands, menus, view container, and view
  - Activation events and extension dependency on `vscode.git`
- `src/extension.ts`
  - Activation entrypoint
  - Tree data provider
  - Command handlers
  - Content providers for ref-backed diffs
  - Shared helpers for labels, URI construction, and error handling
- `src/git.ts`
  - Minimal TypeScript interfaces for the subset of the built-in Git API used here
- `README.md`
  - MVP scope, features, limitations, and local development flow

## Current Product Shape

- Activity Bar container: `gitRefs`
- Tree view: `gitRefs.refsView`
- Commands:
  - `gitRefs.refresh`
  - `gitRefs.compareRefs`
  - `gitRefs.compareWithWorktree`
  - `gitRefs.checkout`
  - `gitRefs.merge`

The current implementation intentionally reuses native VS Code UX:

- `TreeDataProvider` for navigation
- `QuickPick` for reference and file selection
- `showInputBox` for branch naming
- `showWarningMessage` for destructive confirmations
- `vscode.diff` plus `TextDocumentContentProvider` for ref-vs-ref and ref-vs-worktree diffs

## Architectural Constraints

- Prefer the public `vscode.git` API over shelling out to `git`.
- Preserve multi-repository workspace support.
- Handle the zero-repository case cleanly.
- Keep the current MVP lightweight. Do not introduce a webview or persistent custom data layer unless the user asks for a more ambitious redesign.

## Known Gaps

- No automated test suite exists yet.
- `src/extension.ts` currently centralizes most logic, so larger changes should consider extracting modules.
- Compare results currently surface through a `QuickPick`, not a persistent results view.
- UX around merge conflicts and detached/tag workflows is intentionally minimal.

## Validation Notes

- Minimum validation: `npm run build`
- For command or UX changes, manually test in an Extension Development Host.
- If changing manifest contributions, verify the command IDs and view IDs still match code registrations exactly.
