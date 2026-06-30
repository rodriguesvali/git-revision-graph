# Release 1.5.5 Prioritization

## Release Status

Status: Release completed by maintainer confirmation on 2026-06-30. Package metadata reports
`1.5.5` after explicit maintainer approval. `Focus Descendants` is implemented, automated
verification is complete, and manual Extension Development Host validation, scope closure, VSIX
packaging, and Marketplace publication were confirmed complete by the maintainer.

## Objective

Deliver a focused graph-navigation improvement for branch-heavy repositories by letting users
temporarily project the loaded graph from one selected ancestor to all loaded descendants.

## Context

- Published package baseline: `1.5.4`, confirmed by the maintainer in the `1.5.5` opening.
- Target patch: `1.5.5`.
- Focus Range already supports an ordered two-revision `base..compare` projection.
- Indexed virtualization limits visible DOM work but the complete projected scene still
  participates in projection, layout, minimap, navigation, and search.
- The active Source Control-launched editor graph product surface remains unchanged.

## Priority 0: Focus Descendants

- Add a one-revision context action that focuses the loaded graph on the selected anchor and all
  commits that contain it in their ancestry.
- Exclude older and unrelated lines by graph reachability rather than visual position.
- Preserve major-operations projection and collapsed intermediate paths.
- Reuse the loaded snapshot and projection-only refresh path where compatible.
- Expose and clear the active anchor through accessible graph UI.
- Keep Focus Range and Focus Descendants mutually exclusive in the first implementation.

Implementation reference:

- `project-context/2.build/features/1.5.5-focus-descendants.md`

## Deferred Beyond Initial Scope

- Combining multiple focus modes or intersecting them with main graph scopes.
- First-parent-only descendant variants.
- Unbounded or on-demand descendant history loading.
- New commands, contribution points, settings, dependencies, or product surfaces.
- Renderer, layout engine, virtualization, or minimap replacement.
- Any additional `1.5.5` feature without explicit maintainer scope approval.

## Acceptance Criteria

- The feature follows Git ancestry semantics and never filters by row, date, or screen position.
- Anchor, descendant references, and structurally required paths remain correct and navigable.
- Unrelated history is excluded and ordinary projection is restored when focus is cleared.
- Existing visibility toggles, search, selection, minimap, zoom, context menus, persisted state,
  multi-repository handling, and virtualized rendering remain correct.
- Automated verification passes with `npm run build`, `npm test`, and `git diff --check`.
- Extension Development Host validation covers branch-heavy, merge-heavy, scope-change, retained
  panel, and repository-switching scenarios before scope closure.

## Release Gates

- Define and initial scope approval: complete.
- Package version bump to `1.5.5`: complete after maintainer approval.
- Feature implementation and automated verification: complete locally.
- Manual Extension Development Host validation: complete by maintainer confirmation on 2026-06-30.
- README and Marketplace-facing changelog copy: complete for the current candidate.
- Scope closure: complete by maintainer confirmation on 2026-06-30.
- VSIX packaging and Marketplace publication: complete by maintainer confirmation on 2026-06-30.

## Opening Verification

- `npm run build` passed on 2026-06-30.
- `npm test` passed with 514 tests on 2026-06-30.
- `git diff --check` passed on 2026-06-30.
- Package and root lockfile metadata both report `1.5.5`.

## Implementation Verification

- `npm run build` passed on 2026-06-30.
- `npm test` passed with 522 tests on 2026-06-30.
- Focused webview verification passed with 29 tests on 2026-06-30.
- Manual Extension Development Host validation was confirmed complete by the maintainer on
  2026-06-30.
- `git diff --check` passed on 2026-06-30 after release-documentation synchronization.

## Rollback

Remove the descendant projection option, message/UI wiring, and focused tests while preserving
the published `1.5.4` Focus Range behavior. No migration or persistent data conversion should be
required.
