# Source Control Product Surface

## Status
Build implementation complete on 2026-05-16 for Phase 3 of Source Control integration.

Target release: `0.0.31`.

Source baseline for release review: `c2bd300edcadf0207e6f6cf472c939a33ed164b5`.

## Product Decisions

- Do not keep the dedicated Activity Bar graph visible.
- Do not keep the Source Control companion graph view.
- Keep Source Control as the main entry point.
- Keep `View Git Revision Graph` as the primary command and have it open or reveal the editor graph panel.
- Keep Compare Results and Show Log as on-demand secondary review views while the editor graph panel is open.
- Keep left Activity Bar review containers, labeled `Git Revision Graph - Compare` and `Git Revision Graph - Show Logs`.
- Close Compare Results and Show Log when the editor graph panel is closed.
- Keep the Compare Results file action text as `Compare`; when the Compare Results state is `ref <-> ref`, also offer `Compare with Worktree`; when the state is already a worktree comparison, omit the redundant `Compare with Worktree` action.
- When the last secondary review view is closed, restore the Source Control Activity Bar context instead of allowing the workbench to fall back to Explorer.
- Let users hide or show the graph minimap from the webview `View` options, preserving the preference with the rest of the webview UI state.

## Scope

In scope:

- Remove the primary `Graph` view contribution from the custom Activity Bar container.
- Remove the Source Control companion graph view contribution.
- Remove companion-specific Source Control graph commands and title actions.
- Keep Activity Bar review containers with titles that name their remaining review purpose.
- Keep Source Control toolbar access wired to `gitRefs.openRevisionGraphEditor`.
- Keep `gitRefs.openRevisionGraph` registered as a compatibility alias for the editor panel.
- Bind Compare Results and Show Log visibility to the editor graph panel lifecycle.
- Polish Compare Results file actions so the primary diff action is unambiguous, ref-to-ref compare results still allow a file worktree comparison, and worktree-originated compare results do not repeat the same worktree action.
- Restore Source Control after user-initiated Compare Results or Show Log close.
- Add a `Show Minimap` checkbox to the graph `View` options menu and persist the choice across webview state updates.
- Update README, product context, and manifest tests.

Out of scope:

- Replacing Compare Results or Show Log with editor panels.
- Marketplace packaging or publishing.
- Version bumping.

## Acceptance Criteria

- No `gitRefs.revisionGraphView` graph view is contributed.
- No `gitRefs.sourceControlRevisionGraphView` companion view is contributed.
- The compare Activity Bar container title is `Git Revision Graph - Compare`.
- The show-log Activity Bar container title is `Git Revision Graph - Show Logs`.
- Source Control toolbar still opens the editor graph.
- Closing Compare Results or Show Log returns to the editor graph command.
- Closing the editor graph panel hides Compare Results and Show Log without reopening the graph.
- Compare Results file context menus show `Compare` as the primary action, show `Compare with Worktree` for ref-to-ref results, and omit `Compare with Worktree` when the result set already compares a reference with the worktree.
- Closing the last secondary review view activates Source Control rather than Explorer.
- The graph `View` options menu includes `Show Minimap`.
- Unchecking `Show Minimap` hides the minimap and disables its zoom controls without resetting graph layout.
- Rechecking `Show Minimap` renders the minimap again with the current graph state.
- The minimap preference persists through webview layout-state saves.
- `npm run build` passes.
- `npm test` passes.
- `git diff --check` passes.

## Verification

- `npm run build` passed.
- `npm test` passed with 273 tests.
- `git diff --check` passed.

## Remaining Handoffs

- QA Engineer: manually validate that the Activity Bar review buttons use the `Git Revision Graph - Compare` and `Git Revision Graph - Show Logs` tooltips, the Source Control companion graph no longer appears below Changes, and the Source Control toolbar still opens the editor graph.
- Deliver/DevOps: update release readiness after manual validation, before packaging or publishing.

## Release-Note Impact

User-visible release note candidate:

> Git Revision Graph now opens from Source Control into a full editor panel, while Compare Results and Show Logs remain as on-demand review views with clearer lifecycle behavior.

Documentation impact:

- `README.md` should describe Source Control launch and editor graph usage.
- `CHANGELOG.md` should list Source Control/editor graph positioning, removed duplicate graph side-bar surfaces, review-view lifecycle, double-click diff polish, and the minimap toggle.
- `project-context/3.deliver/release.md` should record manual validation and packaging gates before publication.
