# Release 1.1.0 Prioritization

## Objective

Version `1.1.0` is opened as the next minor release after the published `1.0.1` release.

The release should stay narrow and preserve the shipped `1.0.1` product surface while the maintainer selects the exact launch items.

## Context

- Current package baseline: `1.0.1`.
- Target release: `1.1.0`.
- `1.0.1` is treated as the latest completed release in the local release-readiness artifact.
- Initial `1.1.0` implementation scope covers focused Show Log compare restoration, dirty-worktree branch/checkout/pull alignment with VS Code Source Control, dirty-worktree graph refresh-loop prevention, graph drag release hardening, and a long-press reload option for clearing the revision graph layout cache.

## Release Direction

Primary direction:

- Keep `1.1.0` as a narrow minor release for focused fixes, regression control, release-readiness cleanup, and small Marketplace-safe functional improvements.
- Preserve native VS Code ergonomics for branch creation, Show Log review workflows, and reload interactions.

Supporting work:

- Keep command IDs, contribution points, view types, multi-repository behavior, conflict guards, webview security boundaries, and native VS Code Git workflow alignment stable.
- Prefer deterministic verification for each selected launch item.
- Update feature artifacts as each approved item is selected and implemented.

## Exclusions

- No broad revision-graph redesign.
- No new command, menu, view, setting, dependency, or contribution point unless separately approved.
- No Marketplace publication, version re-bump, or VSIX packaging without explicit maintainer approval.

## Acceptance Criteria

- `package.json` and `package-lock.json` are bumped to `1.1.0`.
- `project-context/3.deliver/release.md` records the opened `1.1.0` readiness state.
- `CHANGELOG.md` has a `1.1.0` section that does not claim unimplemented fixes.
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
- Confirm graph load, repository switching, scope/filter toggles, refresh, and affected `1.1.0` workflows after launch items are selected.
- Modify a file while the graph is open and confirm ordinary workspace changes do not repeatedly trigger `Loading Revision Graph...`.
- Confirm Compare Results and Show Log behavior if selected work touches review surfaces.
- Hold the graph Reload button for 500 ms, choose `With Empty Cache`, and confirm the graph performs a clean layout-cache rebuild.

## Risks

- The cycle can drift beyond narrow minor-release scope if launch items are not selected explicitly.
- Changelog and Marketplace copy must not claim fixes before implementation and verification land.
- Packaging and publication must remain separate maintainer-approved actions.

## Marketplace Notes

- Frame `1.1.0` around the implemented fixes and small functional improvements.
- Do not imply broad architecture, workflow, or Git provider changes unless they are explicitly implemented and verified.
