# Release 0.0.32 Prioritization

## Objective

Version `0.0.32` should start as a post-`0.0.31` stabilization and graph-parity groundwork release.

The release should protect the new Source Control/editor graph product surface while choosing one bounded technical slice that moves the graph toward better revision parity without redesigning the extension in one step.

## Context

- Current package baseline: `0.0.31`.
- Target release: `0.0.32`.
- Product surface baseline: `View Git Revision Graph` from VS Code Source Control opens or reveals a singleton editor graph panel.
- Secondary review surfaces: Compare Results and Show Logs remain on-demand Activity Bar review containers.
- Long-term product direction: keep VS Code-native Git workflows while improving revision graph parity, correctness, and refresh efficiency.

## Recommended Scope

Prioritize a conservative release with two tracks:

1. Stabilize the `0.0.31` Source Control/editor graph surface.
2. Implement or prepare one small graph-parity foundation slice with deterministic verification.

Candidate stabilization work:

- Restore editor-panel equivalents for graph actions that became unavailable when the primary graph moved from a `WebviewView` to an editor `WebviewPanel`.
- Convert the final `0.0.31` manual smoke matrix into the baseline `0.0.32` regression checklist.
- Verify Source Control toolbar discoverability, singleton editor reveal behavior, secondary review lifecycle, focus restoration, and zero/multi-repository behavior.
- Patch any regressions found in Compare Results, Show Log, editor-panel lifecycle, or Source Control entry point behavior.
- Refresh README or Marketplace-oriented copy if users need clearer guidance after removal of the old primary graph Activity Bar entry.

Candidate graph-parity foundation work:

- Add representative graph fixtures and golden tests for full DAG behavior before changing rendering semantics.
- Introduce or refine `CommitGraph` / `ProjectedGraph` type boundaries behind the current UI.
- Add refresh intent instrumentation that distinguishes full rebuild, projection rebuild, metadata patch, and overlay patch paths.
- Measure graph load, projection/layout, serialization, and webview update costs for current hot paths.
- Choose one low-risk metadata-only refresh improvement only if tests can prove the visible graph remains correct.

## Exclusions

- Moving Compare Results or Show Log into editor panels without a separate Define/architecture decision.
- Replacing the graph renderer, projection model, or layout pipeline wholesale.
- Making commit-selection the primary user interaction model in this release unless it is explicitly scoped as a separate feature.
- Broad cache architecture replacement.
- Dependency changes unless the selected slice proves they are necessary and the maintainer approves.
- Version bump, VSIX packaging, or Marketplace publication without explicit maintainer approval.

## Release Narrative

`0.0.32` should make the new Source Control-based graph placement feel settled and trustworthy, then start the next graph-parity chapter with measured groundwork instead of a risky large refactor.

The user-facing message should be:

- The graph now lives naturally from Source Control.
- Compare Results and Show Logs remain available when their workflows are active.
- The next improvements focus on reliability, graph correctness, and faster refresh behavior.

## Acceptance Criteria

- `0.0.31` Source Control/editor graph workflows have a documented regression checklist for `0.0.32`.
- Any user-visible fixes keep `package.json`, command registrations, README, tests, and AAMAD artifacts aligned.
- The selected graph-parity groundwork slice has a feature artifact under `project-context/2.build/features/`.
- Automated verification includes `npm run build`.
- Automated verification includes `npm test` for behavior, controller, graph, webview, or workflow changes.
- Manual Extension Development Host validation covers Source Control launch, singleton reveal, secondary review views, zero-repository state, and multi-repository switching before packaging.
- Release readiness notes document packaging assumptions, Marketplace impact, monitoring focus, and rollback plan.

## Verification Plan

Automated:

- `npm run build`
- `npm test` when behavior or graph logic changes
- `git diff --check`

Manual Extension Development Host smoke test:

- Open a Git workspace and launch `View Git Revision Graph` from Source Control.
- Re-run the command and confirm the existing editor graph panel is revealed.
- Exercise refresh, fetch, repository selection, scope changes, search, compare, worktree compare, unified diff, Show Log, checkout, branch creation, tag creation, sync, merge, delete, reset, and conflict recovery.
- Confirm Compare Results and Show Log appear only on demand and close consistently with the editor graph panel.
- Confirm zero-repository and multi-repository workspaces still behave cleanly.
- If graph-parity groundwork changes rendering or refresh decisions, validate a merge-heavy repository and a repository with tags/remotes.

## Risks

- Recent product-surface changes may still have undiscovered workbench lifecycle edge cases.
- Starting graph-parity refactoring too broadly could destabilize a release that should first consolidate the new UX baseline.
- Refresh optimization can introduce stale graph, ref, or worktree state if partial updates are not proven safe.
- Marketplace copy or screenshots may lag behind the removed primary Activity Bar graph entry.

## Open Product Questions

- Should `0.0.32` be primarily a stabilization release, or should it include a small visible graph-parity improvement?
- Which first foundation slice has the best risk/reward: graph fixtures, model boundary types, refresh instrumentation, or one metadata-only patch path?
- Should release copy explicitly explain that the old primary Activity Bar graph entry was replaced by Source Control launch?
- Should Compare Results and Show Log stay as Activity Bar review views for another release?
- What repository fixture should become the standard manual smoke sample for graph correctness?

## Marketplace Notes

- Do not publish until the maintainer approves the final change set, version bump, VSIX packaging, and Marketplace command.
- If user-facing behavior changes, update README and Marketplace copy before packaging.
- If screenshots are refreshed, show the Source Control toolbar entry, editor graph panel, and on-demand review views.
