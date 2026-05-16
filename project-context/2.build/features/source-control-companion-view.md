# Source Control Companion View Build Plan

## Goal
Implement Phase 1 of Source Control integration by adding a `Revision Graph` companion webview under VS Code's built-in Source Control container while preserving the existing `Git Revision Graph` Activity Bar view as the primary stable surface.

## References
- Define: `project-context/1.define/source-control-companion-view.md`
- SAD: `project-context/1.define/sad.md`
- Viability analysis: `project-context/1.define/source-control-integration-viability.md`
- Baseline package version: `0.0.30`

## Execution Strategy
Proceed in small, reversible slices:

1. Add the Source Control view contribution and constants.
2. Refactor graph view/controller placement IDs without changing behavior.
3. Register a second graph provider/controller for the Source Control companion view.
4. Wire title actions and docs.
5. Validate both graph placements together.

The primary safety rule is that the existing `gitRefs.revisionGraphView` behavior remains the reference behavior throughout the work.

## Task Plan

### 1. Manifest And ID Surface
Owner: Integration Engineer

Touched files:

- `package.json`
- `src/revisionGraphTypes.ts`

Tasks:

- Add a new constant, tentatively `SOURCE_CONTROL_REVISION_GRAPH_VIEW_ID = 'gitRefs.sourceControlRevisionGraphView'`.
- Add `contributes.views.scm` with a `Revision Graph` webview contribution.
- Set the companion view `visibility` to `collapsed`.
- Keep `contributes.views.gitRefs` unchanged.
- Add `view/title` entries for refresh, fetch current repository, and choose graph repository with `when` clauses for both graph view IDs.

Acceptance:

- Manifest keeps existing view IDs stable.
- New view ID appears only where the companion view needs it.
- No command renames.

### 2. Placement-Aware Graph Provider
Owner: Integration Engineer

Touched files:

- `src/revisionGraphPanel.ts`
- `src/revisionGraph/controller.ts`
- `src/extension.ts`
- Focused tests if existing controller/provider tests cover open/focus behavior.

Tasks:

- Introduce graph placement metadata, for example `{ viewId, role }`.
- Pass placement metadata from `RevisionGraphViewProvider` to `RevisionGraphController`.
- Replace hardcoded `REVISION_GRAPH_VIEW_ID` usage inside controller focus/open paths with the placement view ID.
- Preserve the default primary placement so existing construction and tests stay simple where possible.
- Register two `RevisionGraphViewProvider` instances in `extension.ts`:
  - primary provider for `gitRefs.revisionGraphView`
  - Source Control companion provider for `gitRefs.sourceControlRevisionGraphView`
- Keep `gitRefs.openRevisionGraph` focused on the primary provider for Phase 1.

Acceptance:

- Each view placement has its own controller instance and webview lifecycle.
- Closing one graph view does not dispose the other provider/controller.
- Existing primary graph behavior remains unchanged.

### 3. Shared Services And Refresh Safety
Owner: Integration Engineer

Touched files:

- `src/extension.ts`
- `src/revisionGraph/controller.ts`
- Existing refresh/render tests if available.

Tasks:

- Share the existing Git API, backend, Compare Results provider, and Show Log provider across both graph providers.
- Confirm render cancellation remains per controller.
- Confirm repository reconciliation remains per placement and does not globally overwrite another graph surface.
- Verify fetch/refresh commands target the provider that owns the visible title action. If the same command ID is reused for both views, document and test the intended target behavior; otherwise add view-specific command wrappers only if necessary.

Acceptance:

- Refreshing the companion view does not cancel an active primary graph render.
- Refreshing the primary view does not cancel an active companion graph render.
- Compare Results and Show Log continue to function from graph-originated actions.

### 4. Documentation And Product Surface
Owner: Product Manager / Integration Engineer

Touched files:

- `README.md`
- `project-context/1.define/source-control-companion-view.md` if decisions change
- `project-context/3.deliver/release.md` when this becomes release-bound

Tasks:

- Update README feature list and local development instructions to mention the Source Control companion graph.
- Describe the two surfaces clearly:
  - dedicated Activity Bar `Git Revision Graph`
  - collapsed Source Control `Revision Graph` companion view
- Note that Compare Results and Show Log still appear in the dedicated `Git Revision Graph` container in Phase 1.

Acceptance:

- README does not imply the extension is a full Git provider.
- Documentation preserves the graph-first positioning.

### 5. Automated Verification
Owner: QA Engineer / Integration Engineer

Commands:

- `npm run build`
- `npm test`

Test focus:

- Manifest/view ID alignment where the current test suite supports it.
- Controller/provider construction with custom placement metadata.
- Existing graph, compare, Show Log, and ref action tests remain green.

Acceptance:

- Build passes.
- Test suite passes.
- Any new test documents the placement-aware behavior rather than duplicating full graph UI tests.

### 6. Manual Validation
Owner: QA Engineer

Run in Extension Development Host:

- Open a single Git repository.
- Expand Source Control and confirm `Revision Graph` appears collapsed on fresh layout when VS Code honors the manifest.
- Open the Source Control companion graph and confirm it loads.
- Use refresh, fetch, repository selection, scope/filter/search controls, and context menu actions from the companion graph.
- Open the dedicated Activity Bar graph and confirm existing behavior still works.
- Open both graph placements and switch branches, refresh both, and confirm no stale/canceled state crosses between them.
- Trigger Compare Results and Show Log from the companion graph and confirm the current Phase 1 behavior is understandable.
- Validate no-repository workspace behavior.
- Validate multi-repository repository selection.
- Move or hide the companion view if supported, reload, and confirm stability.

Acceptance:

- No lifecycle breakage between graph placements.
- No regression in the primary Activity Bar graph.
- Phase 1 secondary-view behavior is documented if Compare Results or Show Log focus moves users to the dedicated container.

## Sequencing And Handoffs

Recommended persona order:

1. Integration Engineer owns Tasks 1-3.
2. Frontend Engineer reviews the companion view in the narrow Source Control side bar and makes only necessary CSS/responsive adjustments.
3. Product Manager updates user-facing docs after implementation behavior is confirmed.
4. QA Engineer runs automated and manual validation.
5. DevOps/Deliver updates release readiness only after build/test and manual smoke validation.

## Blockers And Decision Points

- If `visibility: collapsed` is not honored in `scm`, decide whether to keep the companion visible by default or gate it with a context/setting.
- If reused command IDs in `view/title` always target the primary provider, add companion-specific wrappers or placement-aware command dispatch.
- If narrow Source Control layout makes the graph materially unusable, keep Phase 1 as a launcher/compact companion only and defer full-size graph use to Phase 2 editor panel.
- If Compare Results/Show Log focus restoration feels confusing, document the Phase 1 limitation and create a Phase 1.1 follow-up for origin-aware focus restoration.

## Non-Goals
- No custom SCM Provider.
- No editor-tab graph.
- No removal of the existing Activity Bar container.
- No relocation of Compare Results or Show Log into Source Control.
- No graph model, cache architecture, or Git workflow redesign.
- No version bump or publishing without explicit maintainer approval.

## Release-Note Impact
User-visible release note candidate:

> Adds a collapsed `Revision Graph` companion view to VS Code Source Control, while keeping the dedicated `Git Revision Graph` Activity Bar view as the primary graph workspace.

## Definition Of Done
- Source Control companion graph is implemented and registered.
- Existing primary graph remains stable.
- README and feature context are updated.
- `npm run build` passes.
- `npm test` passes.
- Manual Extension Development Host smoke validation is recorded in `project-context/3.deliver/release.md` before packaging.

## Integration Handoff
Status: Integration Engineer implementation complete for Tasks 1-3, with the README update from Task 4 included because the new Source Control placement is user-visible.

Implemented:

- Added `gitRefs.sourceControlRevisionGraphView` as a collapsed `Revision Graph` webview under `contributes.views.scm`.
- Added a dedicated command to focus the internal Source Control companion view directly. Phase 2 now hides that command from the Command Palette because `View Git Revision Graph` opens the editor panel.
- Initially added `View Git Revision Graph` to the Source Control title toolbar through `menus.scm/title`; Phase 2 now routes that toolbar entry to the editor panel command.
- Initially added the same command to the native Source Control view title through `menus.view/title` with `view == scm`; Phase 2 now routes that visible Source Control header entry to the editor panel command.
- Added light and dark command icon variants based on the Activity Bar icon shape so the Source Control toolbar button remains visible in both themes.
- Added Source Control companion title commands for refresh, fetch, and repository selection so title actions target the companion provider instead of the primary graph provider.
- Kept those companion-specific title commands hidden from the Command Palette to avoid duplicating the global graph commands.
- Added `SOURCE_CONTROL_REVISION_GRAPH_VIEW_ID`.
- Parameterized `RevisionGraphController` and `RevisionGraphViewProvider` with a placement view ID.
- Registered a second `RevisionGraphViewProvider` instance for the Source Control companion graph.
- Kept `gitRefs.openRevisionGraph` focused on the primary `gitRefs.revisionGraphView` surface.
- Updated package manifest tests to lock the companion view, title actions, and icon path.
- Updated README to mention the Source Control companion placement.

Verification completed:

- `npm run build` passed.
- `npm test` passed with 270 tests.

Remaining handoffs:

- Frontend Engineer: inspect the graph in the narrower Source Control side bar and adjust only if concrete layout problems appear.
- QA Engineer: run Extension Development Host validation for the new `scm` view placement, both graph placements open together, no-repository, and multi-repository behavior.
- Deliver/DevOps: record manual validation results and release readiness before any packaging.
