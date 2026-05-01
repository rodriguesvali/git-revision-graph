# Quality Assurance

## Scope
Build checks, automated tests, focused regression planning, Extension Development Host smoke tests, and release readiness verification.

## Inputs
Use feature artifacts, acceptance criteria, changed files, known risks, and release target.

## Test Plan
- Always run `npm run build` after meaningful changes.
- Run `npm test` for behavior, command, graph, controller, Git workflow, or user-visible changes.
- For release candidates, manually validate affected workflows in an Extension Development Host.
- Include negative/cancel paths for destructive or workspace-changing operations.

## Results
Record command output summaries, not full logs, when verification is performed.

- 2026-05-01 `0.0.27` stabilization hardening:
  - `npm run build` passed.
  - `npm test` passed with 221 tests.
  - `npm audit --omit=dev --json` passed with 0 production vulnerabilities.
  - `npm audit --json` reported 2 moderate dev-tooling vulnerabilities through `@vscode/vsce -> @azure/msal-node -> uuid`.

## Issues
Record failures, skipped checks, and residual risks.

- Manual Extension Development Host validation is still pending for graph loading, show log, unified diff, compare results, restore, and fetch-with-tags flows.
- Dev-tooling audit remediation was not attempted because dependency changes require explicit approval.

## Verification
Verification is complete only when required automated checks pass or known gaps are explicitly recorded.

## Handoff Notes
Include the feature artifact path, commands run, manual paths covered, and remaining risks.

## Known Gaps
Marketplace install and real-workspace Git behavior may require manual validation outside automated tests.
