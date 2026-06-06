# Release 0.0.39 Prioritization

## Objective

Version `0.0.39` is opened as a cohesion and architecture hardening cycle after the `0.0.38` load-only refresh simplification.

The release should reduce maintenance risk in the highest-churn areas without changing the Source Control-launched editor graph product surface or broadening the extension runtime architecture.

## Context

- Current package baseline: `0.0.38`.
- Target release: `0.0.39`.
- `0.0.38` intentionally removed incremental graph patch paths and made graph refresh behavior more predictable.
- The next risk is maintainability: graph orchestration, ref workflows, webview runtime scripts, and review-panel presenters have grown around the shipped product surface.
- Automated verification is strong, but several tests assert generated webview script details by regex, so refactors must be staged and behavior-preserving.
- Release completion note: after maintainer approval, `0.0.39` completed Extension Development Host smoke validation, VSIX packaging, generated package review, and Marketplace publication.

## Release Direction

Primary release themes:

- Improve functional cohesion around revision graph orchestration.
- Improve architectural cohesion by splitting broad ports and reducing cross-surface coupling.
- Preserve existing user workflows, command IDs, menu contributions, view types, multi-repository behavior, and Git operation guards.
- Keep changes small enough to verify with focused tests plus the full `npm test` suite.

Recommended first slices:

- Extract graph webview message dispatch from `RevisionGraphController` into a typed action dispatcher while preserving the current message contract.
- Extract graph fetch handling from `RevisionGraphController` so repository fetch UI, Git API/CLI execution, and refresh scheduling have a smaller owner.
- Split `refActions.ts` by workflow family while keeping the public command-facing API stable.
- Separate `RevisionGraphBackend` into narrower graph snapshot, log, diff/detail, and ancestry ports if an implementation slice touches those boundaries.
- Introduce shared webview message builders or action constants before changing any host/webview message names.
- Add focused regression tests before or with each extraction so regex-heavy webview tests do not become the only guard.

## Exclusions

- No further package version bump, VSIX packaging, or Marketplace publication without explicit maintainer approval.
- No new commands, menus, view containers, activation events, or contribution points unless a specific approved slice requires it.
- No change to the Source Control/editor graph product surface.
- No broad rewrite of the revision graph renderer or webview runtime.
- No dependency additions without explicit maintainer approval.
- No removal of targeted Git CLI paths that are still needed for graph/history data.

## Release Narrative

`0.0.39` should read as an internal hardening release that makes future graph and Git workflow work safer.

User-facing behavior should remain intentionally familiar:

- The graph opens from Source Control and the Command Palette as before.
- Compare Results and Show Log remain on-demand editor review panels.
- Git workflows continue to use native VS Code prompts, diffs, confirmations, and Source Control conflict handling.
- Refresh behavior remains the predictable full-load path introduced in `0.0.38`.

## Acceptance Criteria

- `project-context/3.deliver/release.md` records the `0.0.39` readiness state, validation expectations, packaging assumptions, Marketplace impact, monitoring focus, and rollback plan.
- Each implemented slice has a focused feature artifact under `project-context/2.build/features/`.
- Public command IDs, view types, menu contributions, README behavior, and tests remain aligned.
- Behavior-preserving refactors keep existing automated coverage green.
- New boundaries are covered by focused tests where a moved workflow or message route could regress.
- Automated verification includes `npm run build`, `npm test`, and `git diff --check` before release preparation.

## Verification Plan

Automated:

- `npm run build`
- `npm test`
- `git diff --check`

Manual Extension Development Host smoke test:

- Open a Git workspace and launch `View Git Revision Graph` from Source Control.
- Confirm graph load, repository switching, refresh, fetch, scope changes, search, minimap, scroll, zoom, and `Center HEAD`.
- Confirm compare, compare with worktree, unified diff, Show Log, checkout, branch creation, tag creation, sync, pull, push, merge, delete, reset, and conflict guards still work.
- Confirm Compare Results and Show Log open as editor panels and close with the graph panel.
- Repeat key graph actions in a multi-repository workspace and in a zero-repository workspace.

## Risks

- Moving controller responsibilities can introduce stale-state or refresh-order regressions if repository event suppression is not preserved.
- Splitting ref workflows can drift command, graph, and Show Log entrypoints if the public API is not kept stable.
- Backend port extraction can accidentally duplicate Git work or weaken cancellation if the current shared backend semantics are not preserved.
- Webview message hardening can break host/webview compatibility if message names, labels, or payload validation change before both sides are migrated.
- Regex-heavy webview tests can either over-constrain harmless implementation changes or miss runtime behavior that still needs manual smoke validation.

## Marketplace Notes

- Marketplace copy and screenshots do not need to change for an internal cohesion release.
- If the release remains behavior-preserving, release notes should emphasize reliability and maintainability rather than new features.
- Generated VSIX contents were reviewed before `0.0.39` Marketplace publication.
