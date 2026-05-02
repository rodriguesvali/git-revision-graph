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
  - `npm test` passed with 223 tests.
  - `npm audit --omit=dev --json` passed with 0 production vulnerabilities.
  - `npm audit --json` reported 2 moderate dev-tooling vulnerabilities through `@vscode/vsce -> @azure/msal-node -> uuid`.
- 2026-05-01 `0.0.27` cache stabilization:
  - `npm run build` passed.
  - `npm test` passed with 225 tests.
  - Added regression coverage for completed snapshot cache reuse in cancelable refreshes and bounded Show Log cached changes.
- 2026-05-02 `0.0.27` graph layout stabilization:
  - `npm run build` passed.
  - `npm test` passed with 228 tests.
  - Added regression coverage that scene layout keys include edge topology to avoid stale node offsets.
- 2026-05-02 `0.0.27` refs-only merge simplification:
  - `npm run build` passed.
  - `npm test` passed with 231 tests.
  - Added regression coverage for refs-only merge-parent line preservation, hidden merge connector removal, git-simplified sync merge hiding, and detailed-mode topology preservation.
- 2026-05-02 `0.0.27` default graph scope:
  - `npm run build` passed.
  - `npm test` passed with 232 tests.
  - Updated graph Git args coverage so the default projection loads `HEAD` for the current branch scope.
  - Added regression coverage requiring a fresh graph snapshot when projection options change.
- 2026-05-02 `0.0.28` graph cache architecture:
  - `npm run build` passed.
  - `npm test` passed with 234 tests.
  - Added regression coverage for ready-state repository overlay application and same-commit ref rename snapshot cache reuse.

## Issues
Record failures, skipped checks, and residual risks.

- Manual Extension Development Host validation is still pending for graph loading, show log, unified diff, compare results, restore, and fetch-with-tags flows.
- Manual graph viewport validation is still pending for zoom-in/zoom-out while scrolled below the top of a large graph.
- Manual cache trace validation is still pending for repeated graph refreshes with `gitRevisionGraph.traceLoading` enabled.
- Manual graph cache overlay validation is still pending for branch rename/create, checkout, fetch, and pull scenarios in a real repository.
- Manual graph layout validation is still pending for the TensorFlow fan-out area before and after fetch/update.
- Manual refs-only merge simplification validation is still pending after merging multiple branches into a local branch.
- Dev-tooling audit remediation was not attempted because dependency changes require explicit approval.

## Verification
Verification is complete only when required automated checks pass or known gaps are explicitly recorded.

## Handoff Notes
Include the feature artifact path, commands run, manual paths covered, and remaining risks.

## Known Gaps
Marketplace install and real-workspace Git behavior may require manual validation outside automated tests.
