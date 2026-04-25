# Release Readiness

## Version / Change Set
Current package baseline: `0.0.19`.

Target release: `0.0.19`.

Planned publishable change set:

- Tag creation from the Revision Graph context menu for graph-selected references and visible commits.
- Tag push from the Revision Graph context menu for local tags, with remote selection and explicit confirmation.
- Remote tag deletion from the Revision Graph context menu for local tags, with remote selection and explicit destructive confirmation.
- Tag-name validation and duplicate local tag detection before tag creation.

Do not bump versions or publish without explicit human approval.

Version bump to `0.0.19` was explicitly approved and applied to `package.json` and `package-lock.json`.

Planning references:

- `docs/release-0.0.19-prioritization.md`
- `project-context/2.build/features/0.0.19-tag-creation-from-graph.md`

## Verification Summary
- Required for meaningful changes: `npm run build`.
- Required for behavior, command, graph, controller, Git workflow, or user-visible changes: `npm test`.
- Recommended for release candidates: manual Extension Development Host smoke test.

Current verification:

- `npm run build` passed.
- `npm test` passed with 171 tests.
- `npm run package:vsix` passed and generated `git-revision-graph-0.0.19.vsix`.
- Manual Extension Development Host validation for the tag create, push, contextual push/delete toggle, and remote delete flows was completed by the user.

Release preparation status:

- Source release readiness is prepared for `0.0.19`.
- Version bump to `0.0.19` is complete.
- VSIX packaging is complete: `git-revision-graph-0.0.19.vsix`.
- Marketplace publishing remains pending explicit approval.

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
