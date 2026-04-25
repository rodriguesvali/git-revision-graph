# Release Readiness

## Version / Change Set
Current package baseline: `0.0.19`.

Target release: `0.0.20`.

Planned publishable change set:

- Correct tag push from the Revision Graph so the selected tag is pushed through the VS Code Git repository API with a fully qualified tag refspec, avoiding the direct non-interactive CLI push that can fail to prompt for GitHub credentials.

Do not bump versions or publish without explicit human approval.

Version bump to `0.0.20` has not been applied yet.

Planning references:

- `project-context/2.build/features/0.0.20-tag-push-vscode-api.md`

## Verification Summary
- Required for meaningful changes: `npm run build`.
- Required for behavior, command, graph, controller, Git workflow, or user-visible changes: `npm test`.
- Recommended for release candidates: manual Extension Development Host smoke test.

Current verification:

- `npm run build` passed.
- `npm test` passed with 174 tests.
- Pending for `0.0.20`: manual Extension Development Host validation of `Push Tag to Remote`.

Release preparation status:

- Source release readiness is prepared for `0.0.20`.
- Version bump to `0.0.20` is not complete.
- VSIX packaging is not complete for `0.0.20`.
- Marketplace publishing is not complete for `0.0.20`.

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
