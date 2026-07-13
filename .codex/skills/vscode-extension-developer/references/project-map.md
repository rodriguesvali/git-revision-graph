# Project Map

## Overview

This repository is a VS Code extension named `GIT Revision Graph`. Its active product surface is a revision-graph editor webview panel launched from VS Code Source Control. It visualizes Git refs and runs compare, checkout, branch, sync, merge, deletion, and history workflows. Compare Results and Show Log open as on-demand editor webview panels.

## Main Files

- `package.json`
  - Extension manifest
  - Contributed commands and menus
  - Activation events and extension dependency on `vscode.git`
- `src/extension.ts`
  - Activation entrypoint
  - Contributed command registration
  - Content providers for ref-backed diffs
- `src/revisionGraphPanel.ts`
  - Thin `WebviewViewProvider` wrapper for the revision graph view
  - Public entrypoints used by activation and command wiring
- `src/compareResultsView.ts`
  - Singleton editor `WebviewPanel` presenter for persistent compare results
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

- Source Control command: `gitRefs.openRevisionGraphEditor`
- Editor panel view type: `gitRefs.revisionGraphEditorPanel`
- Compare Results editor panel view type: `gitRefs.compareResultsView`
- Show Log editor panel view type: `gitRefs.showLogView`
- Contributed commands:
  - `gitRefs.compareRefs`
  - `gitRefs.compareWithWorktree`
  - `gitRefs.checkout`
  - `gitRefs.merge`
  - `gitRefs.openRevisionGraphEditor`
- Compatibility command wired at activation:
  - `gitRefs.openRevisionGraph`
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

- `WebviewPanel` for graph navigation and on-demand Compare Results / Show Log review surfaces
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
- The automated Extension Host baseline covers activation, real `vscode.git` discovery for zero and
  one repository, and singleton graph-panel launch. Manual Extension Development Host validation is
  still needed for multi-repository, visual, prompt, diff, and mutation workflows.
- Graph behavior is spread across `src/revisionGraph/controller.ts`, `src/revisionGraph/backend.ts`, `src/revisionGraph/source/graphGit.ts`, and `src/revisionGraph/webview/script/*`, so larger changes should preserve those boundaries unless simplification is part of the task.
- Compare results and Show Log persist in dedicated editor panels, but the review workflow is still intentionally lightweight.
- UX around merge conflicts and detached/tag workflows is intentionally minimal.
- The revision graph still renders a bounded recent-commit window rather than the full repository history.

## Validation Notes

- Minimum validation: `npm run build`
- For command, graph, or UX changes, run `npm test`.
- Run `npm run test:e2e` for the isolated activation, Git discovery, and graph-panel baseline.
- For command or UX changes, manually test in an Extension Development Host.
- If compare flows changed, verify the `Compare Results` editor panel updates and opens diffs correctly.
- If changing manifest contributions, verify the command IDs and view IDs still match code registrations exactly.
