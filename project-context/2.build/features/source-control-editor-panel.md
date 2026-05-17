# Source Control Editor Panel

## Status
Build implementation complete on 2026-05-16 for Phase 2 of Source Control integration and included in the `0.0.31` release candidate.

Phase 3 product surface cleanup is tracked separately in `project-context/2.build/features/source-control-product-surface.md` and supersedes the Phase 2 assumption that the Activity Bar graph and Source Control companion graph remain visible.

## Goal
Open `Git Revision Graph` in the VS Code editor area from Source Control, similar to extensions that provide a full-size internal workbench tab.

## Scope
In scope:

- Add an editor-area `WebviewPanel` surface for the revision graph.
- Add a command to open or reveal that editor panel.
- Point the Source Control toolbar entry at the editor panel command so users get a full-size graph from Source Control.
- Reuse the existing graph shell, backend, Git actions, repository selection, refresh, fetch, compare, checkout, branch, sync, merge, delete, diff, and log flows.
- Keep one editor graph panel open at a time and reveal it when invoked again.
- Preserve graph actions, data loading, repository selection, refresh/fetch, compare, checkout, branch, sync, merge, delete, diff, and log behavior while changing the graph placement.
- Update package manifest, README, and tests.

Out of scope:

- Replacing Compare Results or Show Log with editor panels.
- Custom SCM Provider integration.
- Graph model, layout, cache, or Git workflow redesign.
- Version bumping, packaging, or publishing.

## Acceptance Criteria

- Source Control toolbar command opens `Git Revision Graph` in the editor area.
- Re-invoking the command reveals the existing editor graph panel instead of creating duplicates.
- The editor graph renders and supports the same graph actions as the existing view.
- Closing the editor graph disposes its controller view attachment without leaving stale dependent review views.
- Existing `gitRefs.openRevisionGraph` behavior remains available as a compatibility alias for opening or revealing the editor graph.
- Tests lock the editor panel command, command title/icon, and Source Control toolbar wiring.
- `npm run build` and `npm test` pass.

## Implementation Notes

- Use `vscode.window.createWebviewPanel` with `enableScripts: true` and `retainContextWhenHidden: true`.
- Generalize `RevisionGraphController` from `WebviewView` ownership to a small internal host abstraction that can wrap both `WebviewView` and `WebviewPanel`.
- Keep one `RevisionGraphController` instance per graph surface.
- Use the existing `renderRevisionGraphShellHtml()` and webview message contract.

## Implementation Progress

- Added `gitRefs.openRevisionGraphEditor`.
- Added a singleton editor graph panel backed by `vscode.window.createWebviewPanel`.
- Routed Source Control toolbar entries to the editor graph command.
- Kept `gitRefs.openRevisionGraph` as a compatibility alias; Phase 3 removed the companion-view command surface from the shipped manifest.
- Generalized `RevisionGraphController` to attach to either `WebviewView` or `WebviewPanel`.
- Updated README and manifest tests for the editor graph entry point.

## Verification

- `npm run build` passed.
- `npm test` passed with 270 tests.
- `git diff --check` passed.

## Remaining Handoffs

- QA Engineer: manually validate the editor panel path in an Extension Development Host, including repeated toolbar clicks, close/reopen, no-repository, multi-repository behavior, and dependent review view cleanup.
- Deliver/DevOps: record manual validation and release readiness before packaging or publishing.

## Manual Validation

- Launch Extension Development Host with `F5`.
- Open Source Control in a Git workspace.
- Click `View Git Revision Graph` in the Source Control toolbar and confirm an editor tab opens.
- Click the command again and confirm it reveals the same tab.
- Use refresh, fetch, repository selection, search, scope/filter controls, and graph context menu actions from the editor tab.
- Confirm no dedicated Activity Bar `Graph` view or Source Control `Revision Graph` companion view is contributed in the final `0.0.31` product surface.
- Confirm Compare Results and Show Log still open as on-demand review views and close with the editor graph panel.
- Validate no-repository and multi-repository behavior.
