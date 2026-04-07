# Git Refs Explorer

Git Refs Explorer is a Visual Studio Code extension prototype for browsing Git references and running common reference-based workflows from a dedicated view.

The current implementation focuses on a practical MVP built on top of the public API exposed by the built-in `vscode.git` extension.

## Goals

- Visualize the Git reference tree in a dedicated Activity Bar view
- Group local branches, tags, and remote branches in a way that is easy to scan
- Provide direct actions for compare, checkout, and merge workflows
- Reuse VS Code's native Git and diff experience instead of re-implementing Git internals

## Current Features

- Dedicated `Git Refs` Activity Bar container
- `References` tree view for:
  - local branches
  - tags
  - remote branches grouped by remote
- Compare between two references
- Compare a reference against the current worktree
- Checkout for branches, tags, and commits
- Guided checkout flow for remote branches by creating a local tracking branch
- Merge a selected reference into the current branch
- Automatic refresh when repository state changes
- Multi-repository workspace support

## MVP Scope

The current scope is intentionally small and centered on validating the extension architecture.

Included in the MVP:

- Reference discovery through the built-in Git extension API
- Tree-based navigation
- Context menu actions
- Command Palette access to the same actions
- File-level diff opening through the native VS Code diff editor

Not included yet:

- A persistent compare results view
- Advanced merge conflict guidance
- Rich filtering and search in the reference tree
- Reference creation, deletion, rename, fetch, or push flows
- Branch graph visualization

## How It Works

The extension depends on the built-in `vscode.git` extension and uses its public API for repository access.

At a high level:

1. The extension gets the Git API through `vscode.git`.
2. It reads repositories from the current workspace.
3. It loads references with `getRefs(...)`.
4. It renders those references through a `TreeDataProvider`.
5. It executes workflows such as compare, checkout, and merge by calling the Git API directly.

This approach keeps the extension lightweight and reduces the need to shell out to `git` for core operations.

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
  - extension activation
  - tree view registration
  - command registration
  - compare, checkout, and merge workflows
  - custom content providers for opening ref-based diffs

- `src/git.ts`
  - minimal TypeScript interfaces for the Git extension API used by this project

- `package.json`
  - extension metadata
  - contributed view container and tree view
  - commands and context menus

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

Open the project in VS Code and run the extension:

1. Open the repository in VS Code.
2. Press `F5`.
3. A new Extension Development Host window will open.
4. Open a folder that contains a Git repository in that host window.
5. Use the `Git Refs` view from the Activity Bar.

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

The current extension contributes these commands:

- `gitRefs.refresh`
- `gitRefs.compareRefs`
- `gitRefs.compareWithWorktree`
- `gitRefs.checkout`
- `gitRefs.merge`

These commands are available from the tree view context menu and can also be triggered through the Command Palette.

## Known Limitations

- Compare results are presented through a Quick Pick of changed files rather than a dedicated persistent results panel.
- Merge conflict resolution is delegated to the standard Source Control experience in VS Code.
- Binary files or unusual encodings may not render nicely in content-based diffs.
- The UX for tags and detached HEAD workflows is intentionally minimal in the MVP.
- The project currently has no automated test suite.

## Next Steps

Potential improvements after the MVP:

- Add a persistent compare results view
- Add search and filtering in the references tree
- Improve conflict-awareness before checkout and merge
- Add branch creation and tag creation flows
- Add tests for tree rendering and command behavior
- Support richer branch metadata in the UI

## License

MIT
