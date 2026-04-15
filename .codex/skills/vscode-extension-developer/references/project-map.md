# Project Map

## Overview

This repository is a VS Code extension named `GIT Revision Graph`. Its active product surface is a revision-graph webview that visualizes Git refs and runs compare, checkout, branch, sync, merge, deletion, and history workflows from a dedicated Activity Bar view.

## Main Files

- `package.json`
  - Extension manifest
  - Contributed commands, menus, view container, and view
  - Activation events and extension dependency on `vscode.git`
- `src/extension.ts`
  - Activation entrypoint
  - View provider registration
  - Contributed command registration
  - Content providers for ref-backed diffs
- `src/revisionGraphPanel.ts`
  - Thin `WebviewViewProvider` wrapper for the revision graph view
  - Public entrypoints used by activation and command wiring
- `src/compareResultsView.ts`
  - Tree view provider for persistent compare results
  - Compare result file opening and view messaging
- `src/revisionGraph/controller.ts`
  - Active revision graph controller and repository event handling
  - Webview state lifecycle and message routing
  - Graph-side actions such as compare, worktree compare, log, unified diff, checkout, branch, sync, merge, and delete
- `src/refActions.ts`
  - Testable reference workflows for compare, checkout, branch creation, sync, merge, and deletion
- `src/workbenchRefActionServices.ts`
  - Native VS Code UI adapters for ref actions
  - Targeted `git` command helpers for operations not covered by the public Git API
- `src/revisionGraph/backend.ts`
  - Graph snapshot, revision log, unified diff, commit detail, and merge-blocked-target loading
- `src/revisionGraph/source/graphGit.ts`
  - Targeted Git command construction for graph/history data
- `src/revisionGraph/repository/snapshot.ts`
  - Repository-backed snapshot loading and ancestry helpers used by the graph
- `src/revisionGraphWebview.ts`
  - HTML shell generation for the revision graph webview
- `src/revisionGraph/webview/script/*`
  - Browser-side graph rendering, layout, selection, and interactions
- `src/git.ts`
  - Minimal TypeScript interfaces for the subset of the built-in Git API used here
- `README.md`
  - Product scope, features, limitations, and local development flow

## Current Product Shape

- Activity Bar container: `gitRefs`
- Active view: `gitRefs.revisionGraphView`
- Secondary view: `gitRefs.compareResultsView`
- Contributed commands:
  - `gitRefs.refresh`
  - `gitRefs.fetchCurrentRepository`
  - `gitRefs.compareRefs`
  - `gitRefs.compareWithWorktree`
  - `gitRefs.checkout`
  - `gitRefs.merge`
  - `gitRefs.openRevisionGraph`
  - `gitRefs.chooseRevisionGraphRepository`
  - `gitRefs.clearCompareResults`
- Internal commands wired at activation:
  - `gitRefs.openCompareResult`
- Primary graph actions exposed inside the webview:
  - compare selected refs
  - compare selected ref with worktree
  - open unified diff
  - open revision log and commit details
  - checkout a reference
  - create a branch from a reference
  - sync the current tracked `HEAD`
  - merge a reference into the current branch
  - delete local, tag, and supported remote references

The current implementation uses a dedicated webview surface for graph navigation and native VS Code UX for surrounding actions:

- `WebviewViewProvider` for graph navigation
- `QuickPick` for reference and file selection
- `showInputBox` for branch naming
- `showWarningMessage` and `showInformationMessage` for confirmations and feedback
- `vscode.diff` plus `TextDocumentContentProvider` for ref-vs-ref and ref-vs-worktree diffs
- `workbench.view.scm` reveal for conflict resolution flows

## Architectural Constraints

- Prefer the public `vscode.git` API for refs, repository state, checkout, merge, pull, push, and diff-related workflows.
- Preserve the existing targeted `git` command usage for commit-graph and textual history data that the public API does not expose.
- Preserve multi-repository workspace support.
- Handle the zero-repository case cleanly.
- Keep the current product lightweight. The webview is already part of the active architecture, but avoid adding a heavier persistent data layer unless the user asks for a more ambitious redesign.

## Known Gaps

- Automated tests cover pure helpers, repository selection, ref actions, graph state shaping, render coordination, and the persistent webview shell.
- Manual Extension Development Host validation is still needed for end-to-end integration with the real `vscode.git` extension and workbench UX.
- Graph behavior is spread across `src/revisionGraph/controller.ts`, `src/revisionGraph/backend.ts`, `src/revisionGraph/source/graphGit.ts`, and `src/revisionGraph/webview/script/*`, so larger changes should preserve those boundaries unless simplification is part of the task.
- Compare results already persist in a dedicated tree view, but the review workflow is still intentionally lightweight.
- UX around merge conflicts and detached/tag workflows is intentionally minimal.
- The revision graph still renders a bounded recent-commit window rather than the full repository history.

## Validation Notes

- Minimum validation: `npm run build`
- For command, graph, or UX changes, run `npm test`.
- For command or UX changes, manually test in an Extension Development Host.
- If compare flows changed, verify the `Compare Results` view updates and opens diffs correctly.
- If changing manifest contributions, verify the command IDs and view IDs still match code registrations exactly.
