# Source Control Product Surface

## Status
Build implementation complete on 2026-05-16 for Phase 3 of Source Control integration.

## Product Decisions

- Do not keep the dedicated Activity Bar graph visible.
- Do not keep the Source Control companion graph view.
- Keep Source Control as the main entry point.
- Keep `View Git Revision Graph` as the primary command and have it open or reveal the editor graph panel.
- Keep Compare Results and Show Log as on-demand secondary review views until they are deliberately redesigned.

## Scope

In scope:

- Remove the primary `Graph` view contribution from the custom Activity Bar container.
- Remove the Source Control companion graph view contribution.
- Remove companion-specific Source Control graph commands and title actions.
- Keep Source Control toolbar access wired to `gitRefs.openRevisionGraphEditor`.
- Keep `gitRefs.openRevisionGraph` registered as a compatibility alias for the editor panel.
- Update README, product context, and manifest tests.

Out of scope:

- Replacing Compare Results or Show Log with editor panels.
- Marketplace packaging or publishing.
- Version bumping.

## Acceptance Criteria

- No `gitRefs.revisionGraphView` graph view is contributed.
- No `gitRefs.sourceControlRevisionGraphView` companion view is contributed.
- Source Control toolbar still opens the editor graph.
- Closing Compare Results or Show Log returns to the editor graph command.
- `npm run build` passes.
- `npm test` passes.
- `git diff --check` passes.

## Verification

- `npm run build` passed through `npm test`.
- `npm test` passed with 270 tests.
- `git diff --check` passed.

## Remaining Handoffs

- QA Engineer: manually validate that the Activity Bar graph no longer appears, the Source Control companion graph no longer appears below Changes, and the Source Control toolbar still opens the editor graph.
- Deliver/DevOps: update release readiness after manual validation, before packaging or publishing.
