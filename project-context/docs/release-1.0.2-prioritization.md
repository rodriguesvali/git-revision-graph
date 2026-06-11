# Release 1.0.2 Prioritization

## Objective

Version `1.0.2` is opened as the next patch release after the published `1.0.1` release.

The release should stay narrow and preserve the shipped `1.0.1` product surface while the maintainer selects the exact launch items.

## Context

- Current package baseline: `1.0.1`.
- Target release: `1.0.2`.
- `1.0.1` is treated as the latest completed release in the local release-readiness artifact.
- Initial `1.0.2` implementation scope covers focused Show Log compare restoration and dirty-worktree branch, checkout, and pull alignment with VS Code Source Control.

## Release Direction

Primary direction:

- Keep `1.0.2` as a patch release for focused fixes, regression control, release-readiness cleanup, or small Marketplace-safe polish.
- Preserve native VS Code ergonomics for branch creation and Show Log review workflows.

Supporting work:

- Keep command IDs, contribution points, view types, multi-repository behavior, conflict guards, webview security boundaries, and native VS Code Git workflow alignment stable.
- Prefer deterministic verification for each selected launch item.
- Update feature artifacts as each approved item is selected and implemented.

## Exclusions

- No broad revision-graph redesign.
- No new command, menu, view, setting, dependency, or contribution point unless separately approved.
- No Marketplace publication, version re-bump, or VSIX packaging without explicit maintainer approval.

## Acceptance Criteria

- `package.json` and `package-lock.json` are bumped to `1.0.2`.
- `project-context/3.deliver/release.md` records the opened `1.0.2` readiness state.
- `CHANGELOG.md` has a `1.0.2` section that does not claim unimplemented fixes.
- Selected launch items have focused build artifacts under `project-context/2.build/features/`.
- Automated verification includes `npm run build`, `npm test` when behavior changes, and `git diff --check` before release preparation.

## Verification Plan

Opening verification:

- `git diff --check`
- `npm run build`

Release-candidate verification:

- `npm run build`
- `npm test`
- `git diff --check`

Manual Extension Development Host smoke test:

- Open a Git workspace and launch `View Git Revision Graph` from Source Control.
- Confirm graph load, repository switching, scope/filter toggles, refresh, and affected `1.0.2` workflows after launch items are selected.
- Confirm Compare Results and Show Log behavior if selected work touches review surfaces.

## Risks

- The cycle can drift beyond patch-release scope if launch items are not selected explicitly.
- Changelog and Marketplace copy must not claim fixes before implementation and verification land.
- Packaging and publication must remain separate maintainer-approved actions.

## Marketplace Notes

- Frame `1.0.2` around the implemented patch content once scope is selected.
- Do not imply broad architecture, workflow, or Git provider changes unless they are explicitly implemented and verified.
