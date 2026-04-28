# Release Readiness

## Version / Change Set
Current package baseline: `0.0.22`.

Target release: `0.0.23`.

Planned publishable change set:

- Allow remote branch checkout to overwrite an existing non-current local branch after explicit confirmation, then check it out with upstream tracking.
- Reduce direct Git CLI usage for remote-touching operations by moving remote branch deletion, remote tag deletion, remote-name discovery, and graph fetch without tag fetching to the public `vscode.git` API.
- Preserve minimap proportions for small repositories by fitting compact graphs inside the overview instead of stretching them.
- Harden webview message validation, branch-name validation, CSP nonce generation, and documented security-audit follow-up before publishing.

Do not publish without explicit human approval.

Version bump to `0.0.23` has not been applied.

Planning references:

- `project-context/2.build/features/0.0.23-remote-checkout-overwrite.md`
- `project-context/2.build/features/0.0.23-security-hardening.md`

## Verification Summary
- Required for meaningful changes: `npm run build`.
- Required for behavior, command, graph, controller, Git workflow, or user-visible changes: `npm test`.
- Recommended for release candidates: manual Extension Development Host smoke test.

Current verification:

- Source implementation for the planned `0.0.23` remote checkout overwrite, remote-operation API migration, and minimap scaling improvements is complete.
- Source implementation for the planned `0.0.23` security hardening is complete.
- Publication notes for `0.0.23` were added to `CHANGELOG.md`.
- `npm run build` passed.
- `npm test` passed with 201 tests.
- `npm audit --audit-level=low` reported 4 moderate dev-tool dependency vulnerabilities through `@vscode/vsce -> @azure/identity -> @azure/msal-node -> uuid`; remediation requires an explicit dependency-change decision and was not applied in this hardening pass.
- Manual Extension Development Host validation for the `0.0.23` remote checkout overwrite, remote-operation, small-repository minimap, and security-hardening flows is not complete.

Release preparation status:

- Source release readiness is complete for the planned `0.0.23` checkout, remote-operation API migration, and minimap scaling improvements.
- Source release readiness is complete for the planned `0.0.23` security hardening, except for the documented dev-tool dependency audit decision.
- Version bump to `0.0.23` is not complete.
- Release notes for `0.0.23` are complete.
- VSIX packaging is not complete for `0.0.23`.
- Marketplace publishing is not complete for `0.0.23`.

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
