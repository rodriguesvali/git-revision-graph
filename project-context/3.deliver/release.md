# Release Readiness

## Version / Change Set
Current package baseline: `0.0.21`.

Target release: `0.0.22`.

Planned publishable change set:

- Refine graph UX with grouped graph context menus, compact view options, minimap navigation, copy-hash feedback, and actionable repository empty states.

Do not bump versions or publish without explicit human approval.

Version bump to `0.0.22` has not been approved or applied.

Planning references:

- `docs/release-0.0.22-prioritization.md`
- `project-context/2.build/features/0.0.22-ux-polish.md`

## Verification Summary
- Required for meaningful changes: `npm run build`.
- Required for behavior, command, graph, controller, Git workflow, or user-visible changes: `npm test`.
- Recommended for release candidates: manual Extension Development Host smoke test.

Current verification:

- Source implementation for the planned `0.0.22` UX polish is complete.
- `npm run build` passed.
- `npm test` passed with 186 tests.
- Manual Extension Development Host validation for the `0.0.22` UX polish is not complete.

Release preparation status:

- Source release readiness is complete for the planned `0.0.22` UX polish.
- Version bump to `0.0.22` is not complete.
- VSIX packaging is not complete for `0.0.22`.
- Marketplace publishing is not complete for `0.0.22`.

## Deployment Steps
Release commands available in `package.json`:

- `npm run package:vsix`
- `npm run publish:current`
- `npm run publish:patch`
- `npm run publish:minor`
- `npm run publish:major`

Only run packaging or publish commands when explicitly requested.

## Configuration
The extension depends on the built-in `vscode.git` extension and supports VS Code `^1.90.0`.

## Monitoring
Post-release monitoring should use Marketplace feedback, GitHub issues, and regressions reported against compare, checkout, branch, merge, sync, delete, diff, log, and graph rendering workflows.

## Rollback
Rollback options depend on Marketplace state:

- Publish a patch release that reverts or fixes the regression.
- Direct affected users to install a previous VSIX when available.
- Revert the offending code in Git and prepare a follow-up release.

## Approvals
Human approval is required before:

- Version bumps.
- VSIX release packaging.
- Marketplace publishing.
- Any destructive Git or repository history operation.
