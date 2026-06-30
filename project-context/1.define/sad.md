# Solution Architecture Document

Status: Active
Last consolidated: 2026-06-30

## Context

`Git Revision Graph` is a VS Code extension with an editor-area revision graph webview and native workbench workflows for Git review and mutation actions. AAMAD is documentation and release governance around this existing system; it is not runtime architecture.

## Active Architecture

- `package.json` defines the published extension surface, contributed commands, Source Control toolbar entry, settings, extension dependency on `vscode.git`, and packaging scripts.
- `src/extension.ts` owns activation, Git API acquisition, command registration, document content providers, and shared presenter/service construction.
- `src/revisionGraphPanel.ts` exposes the revision graph editor panel entrypoints.
- `src/revisionGraph/controller.ts` coordinates repository synchronization, graph state lifecycle, webview messages, and graph-side actions.
- `src/revisionGraph/backend.ts`, `src/revisionGraph/source/graphGit.ts`, and `src/revisionGraph/repository/snapshot.ts` load graph snapshots, revision logs, diffs, commit details, and merge-blocked metadata.
- `src/revisionGraph/projection/*`, `src/revisionGraph/layout/*`, and model/query modules shape commit graph data, projection options, focus modes, layout, and cache behavior.
- `src/revisionGraphWebview.ts` and `src/revisionGraph/webview/script/*` generate and run the browser-side graph UI, including virtualization, minimap, search, selection, context menus, and message handling.
- `src/compareResultsView.ts` and the Show Log presenter provide on-demand editor review panels.
- `src/refActions.ts` contains testable Git workflows.
- `src/workbenchRefActionServices.ts` adapts those workflows to VS Code UI and targeted Git CLI helpers.
- `src/git.ts` defines the minimal subset of the built-in Git API used by this project.

## Product Surfaces

- Primary command: `gitRefs.openRevisionGraphEditor`.
- Compatibility command: `gitRefs.openRevisionGraph`.
- Primary graph view type: `gitRefs.revisionGraphEditorPanel`.
- Compare Results view type: `gitRefs.compareResultsView`.
- Show Log view type: `gitRefs.showLogView`.
- Contributed command palette actions include compare refs, compare with worktree, checkout, merge, and open graph.
- The primary Activity Bar graph and Source Control companion graph view are historical and should not be treated as active product surfaces.

## Data Flow

1. VS Code activates the extension through contributed commands.
2. The extension obtains the built-in Git API and reads workspace repositories.
3. The revision graph resolves an active repository or asks the user to choose one.
4. Graph/history data is loaded with the Git API plus targeted `git log`, `git diff`, and `git show` calls where the public API is insufficient.
5. The extension builds graph snapshots, projections, layout, and webview state.
6. The editor webview renders the graph and posts validated action messages back to the extension.
7. Native VS Code UI handles picks, confirmations, diffs, Source Control reveal, notifications, and editor panels.
8. Repository changes and completed mutations refresh or reproject visible state according to the current snapshot and invalidation boundary.

## Architectural Constraints

- Prefer `vscode.git` for repository state, refs, checkout, merge, pull, push, and file content.
- Keep Git CLI usage targeted to graph/history/textual data or workflows not exposed by the public Git API.
- Keep activation lightweight and command-driven.
- Preserve multi-repository behavior and zero-repository handling.
- Preserve conflict guards before workspace-changing operations.
- Preserve bounded graph loading rather than claiming unbounded full-history coverage.
- Preserve the current split between graph backend, projection/layout, controller orchestration, webview presentation, workbench adapters, and testable ref actions.
- Require explicit approval for runtime dependency changes, contribution-surface changes, publishing, or version bumps.

## Current Decisions

- The Source Control-launched editor graph is the single primary graph workspace.
- Compare Results and Show Log remain on-demand editor panels, not persistent Activity Bar views.
- Focus Range and Focus Descendants are mutually exclusive projection modes over the loaded snapshot.
- Descendant focus is based on Git ancestry in the loaded DAG, not visual row, timestamp, or screen position.
- Projection-only refresh is acceptable only when the loaded snapshot remains compatible and mutable refs/HEAD metadata are reapplied before delivery.
- Layout and viewport optimizations must retain complete in-memory scene data for minimap, search, selection, navigation, and context menus while mounting only the visible DOM window.
- Release and feature history should be archived once completed; durable conclusions should be promoted into this SAD or the PRD.

## Quality Attributes

- Native VS Code ergonomics and theme compatibility.
- Predictable cancellation and stale-response guards.
- Safe Git mutation UX with confirmations and conflict handling.
- Deterministic tests for pure logic, graph state shaping, message validation, and workflow boundaries.
- Manual Extension Development Host validation for real VS Code/Git integration paths.
- Marketplace readiness tracked separately from implementation completion.

## Security And Privacy

- Do not store tokens, Marketplace credentials, private repository data, or user-specific Git data in project artifacts.
- Treat remote and destructive Git operations as high-friction actions requiring clear confirmation and recoverable failure behavior.
- Keep webview message validation strict and local-resource roots constrained.

## Verification Strategy

- Required after meaningful changes: `npm run build`.
- Required for behavior, command, controller, graph, Git workflow, or webview changes: `npm test`.
- Recommended before release: Extension Development Host smoke testing against a real Git repository, including graph load, repository switching, focus modes, compare, diff, checkout, branch/tag, sync, merge/conflict, delete, reset/stash, Show Log, and Compare Results.
- Packaging and publication commands require explicit maintainer approval.

## Sources

- `package.json`
- `README.md`
- `.codex/skills/vscode-extension-developer/references/project-map.md`
- `project-context/1.define/prd.md`
- `project-context/docs/product-evolution-roadmap.md`
- `project-context/docs/revision-graph-parity-plan.md`
