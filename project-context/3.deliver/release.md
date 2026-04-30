# Release Readiness

## Version / Change Set
Current package baseline: `0.0.25`.

Target release: `0.0.25`.

Planned publishable change set:

- Harden large-repository graph loading by bounding persisted layout-cache entries and clearing oversized cache payloads from VS Code workspace state.
- Fall back to a deterministic iterative lane layout when ELK reports `Maximum call stack exceeded`, allowing the graph to render instead of failing the load.

Do not publish without explicit human approval.

Version bump to `0.0.25` has been applied in `package.json` and `package-lock.json`.

Planning references:

- `project-context/2.build/features/0.0.25-large-repository-layout-hardening.md`

## Verification Summary
- Required for meaningful changes: `npm run build`.
- Required for behavior, command, graph, controller, Git workflow, or user-visible changes: `npm test`.
- Recommended for release candidates: manual Extension Development Host smoke test.

Current verification:

- Source hardening for large-repository layout cache persistence and ELK stack-overflow fallback is complete.
- `npm run build` passed.
- `npm test` passed with 210 tests.
- Focused ELK layout cache tests passed with oversized persisted cache rejection.
- Manual Extension Development Host validation against the client large repository is pending.

Release preparation status:

- Source release readiness is complete for the large-repository layout hardening.
- Version bump to `0.0.25` is complete.
- Release notes for `0.0.25` are complete in `CHANGELOG.md`.
- VSIX packaging is not complete for `0.0.25`.
- Marketplace publishing is not complete for `0.0.25`.

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
Post-release monitoring should prioritize large-repository graph load failures, `Maximum call stack exceeded` reports, cache persistence warnings, Marketplace feedback, and regressions reported against graph rendering workflows.

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
