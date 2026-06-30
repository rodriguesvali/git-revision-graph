# Release 1.0.0 Prioritization

## Objective

Version `1.0.0` is opened as a small polish release after the published `0.0.39` hardening cycle.

The release should make the extension feel ready for a stable major version while preserving the existing Source Control-launched editor graph product surface.

## Context

- Current package baseline: `0.0.39`.
- Target release: `1.0.0`.
- `0.0.39` completed maintainability hardening and was published after Extension Development Host smoke validation, VSIX packaging, package review, and Marketplace publication.
- The product is already published and feature-rich. The `1.0.0` cycle should not broaden architecture or promise full revision-graph parity beyond the documented scope.
- The right risk profile for `1.0.0` is small, visible polish plus release-readiness cleanup.

## Release Direction

Primary release themes:

- Polish the shipped graph, Compare Results, and Show Log experience without changing core workflows.
- Tighten user-facing copy, labels, empty states, and documentation where small improvements reduce confusion.
- Confirm package metadata, README, changelog, Marketplace positioning, and validation notes match the stable `1.0.0` promise.
- Keep behavior changes narrow enough to verify with focused tests plus the full `npm test` suite.

Recommended polish candidates:

- Review command titles, panel titles, empty states, confirmation text, and error text for consistency.
- Review README and Marketplace-facing wording so `1.0.0` communicates stable workflow support without implying full-history graph rendering or complete TortoiseGit parity.
- Review icons, toolbar grouping, context menu labels, and panel labels for small consistency fixes.
- Review smoke-test notes from `0.0.39` for any low-risk cosmetic or copy follow-up.
- Add focused tests only when a polish item touches behavior, message contracts, manifest contributions, or workflow state.

## Exclusions

- No new large feature, architecture rewrite, dependency addition, or graph model redesign.
- No new command, menu, view container, activation event, or contribution point unless explicitly approved as a small release-readiness fix.
- No full-history rendering, advanced graph parity, or broad search/filter expansion.
- No Marketplace publication without explicit maintainer approval after packaging and smoke validation.
- No behavior change that weakens multi-repository support, zero-repository handling, conflict guards, or native VS Code Git workflow alignment.

## Release Narrative

`1.0.0` should read as the stable release of the current product surface:

- Open the revision graph from VS Code Source Control.
- Review graph history, references, diffs, compare results, and logs in editor panels.
- Run established Git workflows through native VS Code prompts, confirmations, diffs, and Source Control handoffs.
- Keep documented limitations explicit: advanced conflict guidance, richer search/filtering, reference rename/general push workflows, and full-history graph rendering remain future work.

## Acceptance Criteria

- `package.json` and `package-lock.json` are bumped to `1.0.0`.
- `project-context/3.deliver/release.md` records the opened `1.0.0` readiness state, validation expectations, packaging assumptions, Marketplace impact, monitoring focus, and rollback plan.
- `CHANGELOG.md` includes a `1.0.0` placeholder or final entry before packaging.
- Any selected polish item has a focused feature artifact under `project-context/2.build/features/`.
- Public command IDs, view types, menu contributions, README behavior, and tests remain aligned.
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

- A vague polish cycle can drift into broad feature work. Select changes one by one and keep each item small.
- `1.0.0` copy can overstate maturity if it implies full-history graph rendering, complete conflict guidance, or full TortoiseGit parity.
- Small UI text changes can break tests that assert generated webview markup or message contracts.
- Marketplace expectations rise with `1.0.0`; release notes should emphasize stability of the current scope rather than a new feature wave.

## Marketplace Notes

- Marketplace copy should frame `1.0.0` as a stable release of the Source Control-launched revision graph and established Git workflow surface.
- Screenshots should be reviewed before publication to confirm they show the current editor graph, Compare Results, and Show Log surfaces.
- Review generated VSIX contents before publication and keep internal AAMAD artifacts out of the package.
