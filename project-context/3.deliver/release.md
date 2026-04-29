# Release Readiness

## Version / Change Set
Current package baseline: `0.0.24`.

Target release: `0.0.24`.

Planned publishable change set:

- Improve revision graph organization by preserving ELK layered `y` placement and compacting it into webview rows instead of forcing each visible commit into a unique `git log` row.

Do not publish without explicit human approval.

Version bump to `0.0.24` has been applied in `package.json` and `package-lock.json`.

Planning references:

- `project-context/2.build/features/0.0.24-graph-layout-layering.md`

## Verification Summary
- Required for meaningful changes: `npm run build`.
- Required for behavior, command, graph, controller, Git workflow, or user-visible changes: `npm test`.
- Recommended for release candidates: manual Extension Development Host smoke test.

Current verification:

- Source implementation for the planned `0.0.24` graph layout layering improvement is complete.
- `npm run build` passed.
- `npm test` passed with 202 tests.
- Manual Extension Development Host validation against the screenshot repository is not complete.

Release preparation status:

- Source release readiness is complete for the planned `0.0.24` graph layout layering improvement.
- Version bump to `0.0.24` is complete.
- Release notes for `0.0.24` are not complete.
- VSIX packaging is not complete for `0.0.24`.
- Marketplace publishing is not complete for `0.0.24`.

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

- VSIX release packaging.
- Marketplace publishing.
- Any destructive Git or repository history operation.
