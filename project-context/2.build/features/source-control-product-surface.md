# Source Control Product Surface

## Status
Build implementation complete on 2026-05-16 for Phase 3 of Source Control integration.

## Product Decisions

- Do not keep the dedicated Activity Bar graph visible.
- Do not keep a dedicated left Activity Bar button for the review views.
- Do not keep the Source Control companion graph view.
- Keep Source Control as the main entry point.
- Keep `View Git Revision Graph` as the primary command and have it open or reveal the editor graph panel.
- Keep Compare Results and Show Log as on-demand secondary review views in the workbench Panel while the editor graph panel is open.
- Close Compare Results and Show Log when the editor graph panel is closed.

## Scope

In scope:

- Remove the primary `Graph` view contribution from the custom Activity Bar container.
- Move the `gitRefs` review container out of the Activity Bar and into the workbench Panel.
- Remove the Source Control companion graph view contribution.
- Remove companion-specific Source Control graph commands and title actions.
- Keep Source Control toolbar access wired to `gitRefs.openRevisionGraphEditor`.
- Keep `gitRefs.openRevisionGraph` registered as a compatibility alias for the editor panel.
- Bind Compare Results and Show Log visibility to the editor graph panel lifecycle.
- Update README, product context, and manifest tests.

Out of scope:

- Replacing Compare Results or Show Log with editor panels.
- Marketplace packaging or publishing.
- Version bumping.

## Acceptance Criteria

- No `gitRefs.revisionGraphView` graph view is contributed.
- No `gitRefs.sourceControlRevisionGraphView` companion view is contributed.
- No `gitRefs` Activity Bar container is contributed.
- The `gitRefs` review container is contributed to the workbench Panel.
- Source Control toolbar still opens the editor graph.
- Closing Compare Results or Show Log returns to the editor graph command.
- Closing the editor graph panel hides Compare Results and Show Log without reopening the graph.
- `npm run build` passes.
- `npm test` passes.
- `git diff --check` passes.

## Verification

- `npm run build` passed.
- `npm test` passed with 272 tests.
- `git diff --check` passed.

## Remaining Handoffs

- QA Engineer: manually validate that the Activity Bar graph/review button no longer appears, the Source Control companion graph no longer appears below Changes, and the Source Control toolbar still opens the editor graph.
- Deliver/DevOps: update release readiness after manual validation, before packaging or publishing.
