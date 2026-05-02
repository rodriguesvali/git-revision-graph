# Release Readiness

## Version / Change Set
Previous package baseline: `0.0.26`.

Target release: `0.0.27`.

Planned publishable change set:

- Harden targeted Git CLI calls with safer revision argument handling.
- Add timeout and output-budget safeguards to expensive Git command paths.
- Guard compare restore writes/deletes so they remain inside the selected repository.
- Tighten graph, compare-results, and show-log webview message validation with payload size budgets.
- Preserve the current graph viewport when using toolbar zoom actions.
- Improve cache observability and bounded cache behavior for snapshot, layout persistence, and Show Log expanded changes.
- Stabilize graph layout refresh paths so fan-out balancing does not reuse stale browser-side offsets after topology or layout-rule changes.
- Simplify the default refs-only graph after merges by hiding unreferenced merge connectors while preserving merged-branch lines from visible merge commits.
- Start new revision graph sessions in `Current Branch` scope by default. This was later reversed during `0.0.28` development so new sessions start with `All Refs` again.
- Remove the `Show Branchings & Merges` view option during `0.0.28` development after it proved low-value and introduced graph blanking risk in large repositories.
- Record production and dev-tooling audit status for release readiness.

Publication completed after human approval.

Version bump to `0.0.27` has been applied in `package.json` and `package-lock.json`.

Planning references:

- `docs/release-0.0.27-prioritization.md`
- `project-context/2.build/features/0.0.27-stabilization-hardening.md`
- `project-context/2.build/features/0.0.27-cache-stabilization.md`
- `project-context/2.build/features/0.0.27-graph-layout-stabilization.md`
- `project-context/2.build/features/0.0.27-refs-only-merge-simplification.md`

## Verification Summary
- Required for meaningful changes: `npm run build`.
- Required for behavior, command, graph, controller, Git workflow, or user-visible changes: `npm test`.
- Recommended for release candidates: manual Extension Development Host smoke test.

Current verification:

- Source stabilization hardening for Git CLI bounds, revision option terminators, compare restore path guards, and webview message budgets is complete.
- Graph zoom viewport preservation fix is complete.
- Cache stabilization for snapshot trace/reuse, layout persistence deduplication, and Show Log cached-change bounding is complete.
- Graph layout stabilization for topology-aware scene keys and stale-offset invalidation is complete.
- Refs-only merge simplification for default graph readability is complete.
- Default graph scope was changed to `Current Branch` in `0.0.27`; `0.0.28` development has since restored the default to `All Refs`.
- `npm run build` passed.
- `npm test` passed with 232 tests.
- `npm audit --omit=dev --json` passed with 0 production vulnerabilities.
- `npm audit --json` reported 2 moderate dev-tooling vulnerabilities through `@vscode/vsce -> @azure/msal-node -> uuid`; dependency remediation requires explicit approval.
- Manual Extension Development Host validation was recommended before Marketplace publication; post-publication monitoring should watch for real-workspace graph regressions.

Release preparation status:

- Source release readiness is complete for the implemented stabilization hardening, cache stabilization, graph layout stabilization, and refs-only merge simplification slices.
- Version bump to `0.0.27` is complete.
- Release notes for `0.0.27` are complete in `CHANGELOG.md`.
- VSIX packaging is complete for `0.0.27`.
- Marketplace publishing is complete for `0.0.27`.

## Deployment Steps
Release commands available in `package.json`:

- `npm run package:vsix`
- `npm run publish:current`
- `npm run publish:patch`
- `npm run publish:minor`
- `npm run publish:major`

Packaging and publishing for `0.0.27` have been completed.

## Configuration
The extension depends on the built-in `vscode.git` extension and supports VS Code `^1.90.0`.

Runtime dependency audit status for `0.0.27` stabilization is clean. Dev-tooling audit remediation is pending approval.

## Monitoring
Post-release monitoring should prioritize Git command timeout/output-limit reports, option-like ref handling, compare restore failures, ref-backed diff content loading, cache freshness or stale graph reports, layout-offset/fan-out disposition regressions, refs-only merge simplification feedback, Marketplace feedback, and regressions reported against graph/show-log/compare workflows.

## Rollback
Rollback options depend on Marketplace state:

- Publish a patch release that reverts or fixes the regression.
- Direct affected users to install a previous VSIX when available.
- Revert the offending code in Git and prepare a follow-up release.

## Approvals
Human approval is required before:

- Future VSIX release packaging.
- Future Marketplace publishing.
- Any destructive Git or repository history operation.
