# Release Readiness

## Version / Change Set
Current package baseline: `0.0.26`.

Target release: `0.0.26`.

Planned publishable change set:

- Improve revision graph readability with single-bend edge routing and parent-to-descendant visual edge direction.
- Add dynamic vertical spacing for real fan-out areas while keeping near-linear chains compact.
- Prevent same-row card overlaps in both initial graph layout and client-side `Reorganize`.
- Use the normal cursor on empty graph viewport space while preserving drag cursors for active dragging and card grips.

Do not publish without explicit human approval.

Version bump to `0.0.26` has been applied in `package.json` and `package-lock.json`.

Planning references:

- `project-context/2.build/features/0.0.26-ogdf-inspired-layout-tuning.md`

## Verification Summary
- Required for meaningful changes: `npm run build`.
- Required for behavior, command, graph, controller, Git workflow, or user-visible changes: `npm test`.
- Recommended for release candidates: manual Extension Development Host smoke test.

Current verification:

- Source layout tuning for graph readability, fan-out spacing, overlap prevention, and viewport cursor behavior is complete.
- `npm run build` passed.
- `npm test` passed with 216 tests.
- Manual Extension Development Host validation against Git, Angular, and Linux repositories is recommended before Marketplace publication.

Release preparation status:

- Source release readiness is complete for graph layout readability improvements.
- Version bump to `0.0.26` is complete.
- Release notes for `0.0.26` are complete in `CHANGELOG.md`.
- VSIX packaging is not complete for `0.0.26`.
- Marketplace publishing is not complete for `0.0.26`.

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
Post-release monitoring should prioritize graph readability regressions, card overlap reports, excessive layout spread or compaction, large-repository graph load failures, Marketplace feedback, and regressions reported against graph rendering workflows.

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
