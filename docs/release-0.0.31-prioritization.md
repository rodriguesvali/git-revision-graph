# Release 0.0.31 Prioritization

## Objective

Version `0.0.31` should ship the Source Control product surface decision as a focused workbench integration release.

The release is based on implementation work after baseline `c2bd300edcadf0207e6f6cf472c939a33ed164b5` and should position `Git Revision Graph` as a graph that is launched from VS Code Source Control and used in the editor area, with secondary review views appearing only when needed.

## Context

- Current package baseline: `0.0.30`.
- Target release: `0.0.31`.
- Product surface before the release: the extension still carried a dedicated graph-oriented Activity Bar history and temporary Source Control integration planning artifacts.
- Product surface for the release: Source Control toolbar entry plus singleton editor graph panel.
- Review surfaces remain: Compare Results and Show Logs stay as on-demand Activity Bar review containers.

## Recommended Scope

Ship the implemented Phase 3 product surface:

- Use `View Git Revision Graph` from Source Control as the primary graph entry point.
- Open or reveal one full-size editor graph panel.
- Remove duplicate side-bar graph surfaces from the manifest.
- Keep Compare Results and Show Log as dependent review views while the editor graph panel is open.
- Close dependent review views when the graph panel closes.
- Restore Source Control focus after closing the last secondary review view.
- Include Compare Results and Show Log double-click diff polish.
- Include the persisted `Show Minimap` graph view option.
- Include manifest/test/documentation alignment for the new product surface.

## Exclusions

- Custom SCM Provider behavior.
- Restoring a dedicated primary graph Activity Bar view.
- Shipping the temporary Source Control companion graph view.
- Replacing Compare Results or Show Log with editor panels.
- Graph model, cache architecture, or Git workflow redesign.
- Dependency changes.
- Version bump, VSIX packaging, or Marketplace publication without explicit maintainer approval.

## Release Narrative

`0.0.31` makes Git Revision Graph feel native to the Source Control workflow:

- Start from Source Control.
- Inspect the graph in a full editor panel.
- Review compare results and logs only when those workflows are active.
- Keep the workbench tidy by removing duplicate graph side-bar placements.

## Acceptance Criteria

- `package.json` contributes `gitRefs.openRevisionGraphEditor` to the Source Control toolbar.
- `package.json` no longer contributes `gitRefs.revisionGraphView` or `gitRefs.sourceControlRevisionGraphView`.
- Compare Results and Show Logs Activity Bar containers use release-ready labels.
- The editor graph panel opens once and subsequent commands reveal it.
- Closing the editor graph panel closes Compare Results and Show Log.
- Compare Results and Show Log file rows support double-click diff opening.
- The minimap visibility preference persists through graph state saves.
- README, CHANGELOG, AAMAD Define/Build/Deliver artifacts, and release readiness notes describe the final product surface.
- `npm run build`, `npm test`, and `git diff --check` pass before packaging.

## Verification Plan

Automated:

- `npm run build`
- `npm test`
- `git diff --check`

Manual Extension Development Host smoke test:

- Open a one-repository workspace.
- Launch the graph from the Source Control toolbar.
- Re-run the command and confirm singleton reveal behavior.
- Exercise refresh, fetch, repository selection, search, scope, compare, Show Log, unified diff, checkout, branch, tag, sync, merge, delete, reset, and conflict recovery.
- Confirm no graph side-bar view is contributed under the old Activity Bar container or Source Control.
- Confirm secondary review views appear only on demand, close with the graph panel, and return focus to Source Control when closed by the user.
- Validate zero-repository and multi-repository workspaces.

## Risks

- Existing users may initially look for the old graph Activity Bar entry.
- VS Code view focus restoration can vary by user layout and moved views.
- Secondary review views still live outside the editor panel, so lifecycle and focus behavior need real workbench validation.
- The minimap toggle is browser-side state and needs manual theme/layout validation.

## Marketplace Notes

- Marketplace copy should emphasize Source Control launch and editor-area graph usage.
- Screenshots should show the Source Control toolbar entry and the editor graph panel, plus on-demand Compare Results or Show Logs if updated.
- Publish only after the maintainer approves the version bump, VSIX packaging, and Marketplace command.
