# Center on HEAD availability

## Define

When filtering excludes HEAD, disable Center on HEAD instead of offering an action
that centers unrelated graph bounds. Availability follows projected graph nodes,
not mounted DOM elements or reference metadata alone. Preserve busy-state disabling
and the generic initial-framing fallback. No protocol, Git, dependency or manifest changes.

## Build

- `centerHeadToolbarUi.ts`: disable absent HEAD and explain via tooltip.
- `interactions.ts`: pass availability from the existing HEAD anchor lookup.
- `revisionGraphWebview.test.ts`: cover filtered nodes with retained/removed HEAD
  metadata, restoration, loading, and absence of mounted DOM nodes.
- README documents the behavior.

## Deliver

Verified on 2026-09-22: `npm test` passed all 930 tests (including build);
`npm run quality:check` and `git diff --check` passed. `graphify update .`
completed after code changes. Manual Extension Development Host
smoke remains pending: apply a focus/scope excluding HEAD, inspect the disabled button
and tooltip, clear the filter, then center on HEAD after panning away.
Rollback: revert the toolbar condition and tooltip together with their tests.
Initially implemented against 1.7.1; assigned to the 1.7.2 development cycle on
2026-09-22 at the maintainer's request. Package metadata is now 1.7.2.
No packaging or publication.
