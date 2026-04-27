# GIT Revision Graph

GIT Revision Graph is a Visual Studio Code extension for browsing a Git revision graph and running compare, checkout, branch, merge, sync, delete, and diff workflows from a dedicated view.

It is built on top of the public API exposed by the built-in `vscode.git` extension and keeps the experience close to the native VS Code diff and Source Control workflows.

## Install

- From Marketplace: search for `GIT Revision Graph`
- From a package file: install the generated `.vsix` via `Extensions: Install from VSIX...`

## Goals

- Visualize the Git revision graph and its references in a dedicated Activity Bar view
- Group local branches, tags, and remote branches in a way that is easy to scan
- Provide direct actions for compare, checkout, branch, merge, sync, and review workflows
- Reuse VS Code's native Git and diff experience instead of re-implementing Git internals

## Current Features

- Dedicated `GIT Revision Graph` Activity Bar container
- Branch-aware graph view title that shows the current `HEAD` branch directly in the container header
- Toolbar controls for scope (`All Refs`, `Current Branch`, `Local Branches`), compact view options, and in-graph search
- Fetch the active repository directly from the graph toolbar and Command Palette, with optional `Prune` and `Tags` flags per run
- Curved graph connectors with graph centering inside the board for denser repositories
- Compare between two selected references or visible unreferenced commits, including changed files, unified diff, and revision log actions
- Compare a selected reference or unreferenced commit against the current worktree
- On-demand `Compare Results` view that appears when a compare produces results, with an inline filter box plus a file context menu to compare with base, compare with worktree, and restore worktree files to the selected ref
- On-demand `Show Log` view that appears from the graph context menu and renders a compact commit history for a selected ref/commit or an explicit `base..compare` range, with inline changed files for the expanded commit
- Grouped graph context menu actions for any visible commit, including copying the full commit hash from referenced and unreferenced nodes
- Checkout of local and remote branch references
- Guided checkout flow for remote branches by creating a local tracking branch
- Create a new local branch from a local branch, remote branch, tag, or visible unreferenced commit
- Create a local tag from a branch, tag, remote branch, or visible unreferenced commit
- Publish a local branch to a selected Git remote with upstream tracking
- Push a local tag to a selected Git remote from the graph context menu
- Delete a pushed tag from a selected Git remote while keeping the local tag unchanged
- Sync the current tracked `HEAD` branch with its upstream remote branch from the Revision Graph
- Merge a selected reference into the current branch
- Block workspace-changing actions while conflicts remain unresolved, and reveal Source Control to resolve them
- Delete local branches, tags, and remote branches from the Revision Graph, with safe handling for tracked local branches
- Selection highlighting for the primary ancestor and descendant path related to the first selected reference
- Automatic graph reorganization on the initial graph load, plus on-demand reorganize and zoom actions
- Horizontal drag handles plus a board context menu for reorganizing and zooming the graph during a session
- Minimap overview with visible viewport bounds and click/drag navigation for larger graphs
- Client-side search across the loaded graph by branch, tag, hash, subject, and author
- Actionable empty state for choosing a repository when a multi-repository workspace needs an explicit graph target
- Automatic refresh when repository state changes
- Multi-repository workspace support

## Scope

The current scope is intentionally focused and centered on fast reference-based workflows.

Included in the MVP:

- Reference discovery through the built-in Git extension API
- Webview-based graph navigation
- Toolbar and context menu actions inside the Revision Graph
- Command Palette access to refresh, compare, compare-with-worktree, checkout, merge, open graph, and repository selection actions
- File-level diff opening through the native VS Code diff editor
- Unified diff and revision log viewing for selected references
- Local branch creation and reference deletion flows from the Revision Graph
- Revision graph rendering through a dedicated webview panel

Not included yet:

- Advanced merge conflict guidance
- Rich search beyond the current loaded graph scope, plus more advanced ref and revision-range filtering
- Reference rename or general push workflows
- Full-history graph rendering beyond the bounded recent-commit window

## How It Works

The extension depends on the built-in `vscode.git` extension and uses its public API for repository access.

At a high level:

1. The extension gets the Git API through `vscode.git`.
2. It reads repositories from the current workspace.
3. It loads references with `getRefs(...)`.
4. It renders the active repository through a `WebviewViewProvider`.
5. It listens to repository open/close, checkout, and state-change events to keep the view synchronized.
6. It executes workflows such as compare, checkout, branch creation, merge, sync, and deletion by using the Git API where available.

This approach keeps the extension lightweight for reference workflows. The revision graph view uses targeted `git log`, `git diff`, and `git show` calls only where the public `vscode.git` API does not expose enough commit graph or textual history data.

## Project Structure

```text
.
├── .devcontainer/
│   └── devcontainer.json
├── media/
│   └── git-refs.svg
├── src/
│   ├── extension.ts
│   └── git.ts
├── package.json
├── README.md
└── tsconfig.json
```

## Main Files

- `src/extension.ts`
  - extension activation and VS Code wiring
  - webview registration
  - command registration
  - adapters that bridge VS Code UI to the testable command layer

- `src/git.ts`
  - minimal TypeScript interfaces for the Git extension API used by this project

- `src/refCommands.ts`
  - compare, checkout, and merge workflows
  - repository/reference resolution
  - command-side UX messages and refresh behavior

- `src/refPresentation.ts`, `src/changePresentation.ts`
  - pure helpers for labels, sorting, and diff item presentation

- `src/revisionGraphData.ts`, `src/revisionGraphPanel.ts`, `src/revisionGraphRepository.ts`, `src/revisionGraphWebview.ts`
  - commit graph parsing and lane layout
  - revision graph controller, repository helpers, and webview rendering
  - commit selection and compare/checkout actions from the graph

- `test/*.test.ts`
  - automated coverage for labels, compare flows, checkout behavior, merge protections, and empty states

- `package.json`
  - extension metadata
  - contributed view container and revision graph webview
  - commands and context menus

- `docs/revision-graph-parity-plan.md`
  - architectural review distilled into a phased plan for reproducing the TortoiseGit Revision Graph in VS Code
  - target module boundaries, parity goals, and acceptance criteria

## Architecture Plan

The current redesign roadmap lives in [docs/revision-graph-parity-plan.md](docs/revision-graph-parity-plan.md).

That document is the working reference for:

- the architectural gap between the current prototype and TortoiseGit
- the target commit-centric graph model
- the phased migration plan toward functional parity
- acceptance criteria for declaring the graph "faithful enough"

## Development Requirements

To work on the extension locally, you need:

- Visual Studio Code
- Node.js
- npm
- Git

Recommended:

- TypeScript familiarity
- VS Code Extension Development Host workflow

## Local Development

Install dependencies:

```bash
npm install
```

Build the extension:

```bash
npm run build
```

Run the automated test suite:

```bash
npm test
```

Open the project in VS Code and run the extension:

1. Open the repository in VS Code.
2. Press `F5`.
3. A new Extension Development Host window will open.
4. Open a folder that contains a Git repository in that host window.
5. Use the `Graph` view inside the `GIT Revision Graph` Activity Bar container.

## Dev Container

The project includes a development container configuration in `.devcontainer/devcontainer.json`.

Base image:

- `mcr.microsoft.com/devcontainers/typescript-node:1-22-bookworm`

This setup is intended to provide a consistent development environment with Node.js and npm available out of the box.

To use it:

1. Open the project in VS Code.
2. Run `Dev Containers: Reopen in Container`.
3. Wait for the `postCreateCommand` to finish.
4. Build and run the extension as usual.

## Commands

The current extension contributes these Command Palette commands:

- `gitRefs.refresh`
- `gitRefs.fetchCurrentRepository`
- `gitRefs.compareRefs`
- `gitRefs.compareWithWorktree`
- `gitRefs.checkout`
- `gitRefs.merge`
- `gitRefs.openRevisionGraph`
- `gitRefs.chooseRevisionGraphRepository`

Additional actions are available directly inside the Revision Graph context menu:

- Create a new branch from a selected reference
- Create a local tag from a selected reference or visible commit
- Publish a local branch to a selected Git remote
- Push a local tag to a selected Git remote
- Delete a remote tag from a selected Git remote
- Delete a local branch, tag, or remote branch
- Sync the current tracked `HEAD` branch with its upstream
- Show a compact log for a selected target or a selected `base..compare` pair
- Open the unified diff between two selected references

The Activity Bar container also includes two on-demand secondary views:

- `Compare Results`, which appears when a compare produces results and keeps the latest compare session available for multi-file review
- `Show Log`, which appears from the graph context menu and shows a compact log for a selected target or range, with commit expansion inline

## Known Limitations

- Merge conflict resolution is delegated to the standard Source Control experience in VS Code.
- Remote branch deletion uses an explicit confirmation because it affects the remote repository and collaborators.
- Binary files or unusual encodings may not render nicely in content-based diffs.
- The UX for tags and detached HEAD workflows is intentionally minimal in the MVP.
- The revision graph currently renders a bounded set of recent commits instead of the entire repository history.
- Manual verification in the Extension Development Host is still recommended for end-to-end validation against the real `vscode.git` extension.

## Next Steps

Potential improvements after the MVP:

- Add revision-range filtering and saved graph filter combinations
- Avoid full graph reloads for metadata-only local operations such as checkout and branch creation when the loaded commit window is unchanged
- Preserve zoom, scroll, and selection context across lightweight refreshes
- Add refresh profiling and caching for graph load, projection, and layout hot paths
- Improve conflict-awareness before checkout and merge
- Add reference rename flows
- Support richer branch metadata in the UI
- Expand the revision graph with richer revision actions

## Validation Strategy

Use both automated and manual checks when changing command behavior:

1. Run `npm test`.
2. Press `F5` to launch the Extension Development Host.
3. Open:
   - a workspace without a Git repository
   - a workspace with one repository
   - a workspace with multiple repositories
4. Exercise:
   - compare between two references
   - compare a reference with the worktree
   - create a new local branch from a local branch, tag, and remote branch
   - checkout of a local branch and remote branch
   - sync the current tracked `HEAD` branch with its upstream
   - merge of a selected reference into the current branch
   - open `GIT Revision Graph` from the `GIT Revision Graph` title bar
   - Ctrl/Cmd-click two references and compare them
   - Ctrl/Cmd-click two references and open `Show Log` and `Unified Diff`
   - select one reference and compare it with the worktree
   - select one reference and create a branch from it
   - select one reference and create a local tag from it
   - select one tag and push it to a remote
   - select one tag and delete it from a remote
   - delete a local branch, tag, and remote branch from the graph
   - change scope and visibility options from the graph toolbar

The extension continues to rely on the public API of the built-in `vscode.git` extension for repository and ref operations, and uses targeted `git` commands only for graph/history data that the API does not expose.

## License

MIT

## Credits

This extension was inspired by and/or uses concepts from [TortoiseGit](https://tortoisegit.org/).

TortoiseGit is an open-source Git client for Windows.
