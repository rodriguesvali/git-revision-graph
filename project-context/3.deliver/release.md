# Release Readiness

## Version / Change Set
Current package baseline: `0.0.17`.

Next publishable change set:

- Revision graph refresh efficiency: reuse clean snapshots for projection rebuilds and metadata-only repository events, with fallback to full rebuild when the graph snapshot is stale.
- Activity Bar icon sizing: scale the contributed SVG artwork by about 30% for stronger visual weight.
- Test command reliability: keep `npm test` aligned with the flat compiled test layout.

Do not bump versions or publish without explicit human approval.

## Verification Summary
- Required for meaningful changes: `npm run build`.
- Required for behavior, command, graph, controller, Git workflow, or user-visible changes: `npm test`.
- Recommended for release candidates: manual Extension Development Host smoke test.

Current verification:

- `npm run build` passed.
- `npm test` passed with 147 tests.

Manual Extension Development Host validation remains pending.

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
