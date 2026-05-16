# Product Requirements Document

## Goal
Guide future feature and release work for `Git Revision Graph` using AAMAD while preserving the published extension's current product shape.

## Users
- VS Code users managing Git repositories from the editor.
- Maintainers evolving the extension through scoped features and safe releases.
- Contributors or AI agents implementing changes across extension host, Git integration, webview UI, and tests.

## Problem
The extension is already published and feature-rich enough that new work can affect multiple surfaces: VS Code manifest contributions, command registrations, Git operations, webview state, tests, README, packaging, and Marketplace release behavior. Future features need lightweight governance so they ship deliberately without turning every small fix into heavy process.

## Scope
- Use AAMAD for feature definition, implementation planning, verification, and release readiness.
- Maintain `project-context/` as the working context for Define, Build, and Deliver phases.
- Create feature-scoped build artifacts for user-visible functionality.
- Keep release notes, packaging assumptions, and rollback notes current for publishable work.
- Preserve current extension architecture and VS Code-native user experience.

## Non-Goals
- Replacing the existing architecture with a generic AAMAD structure.
- Adding Cursor, Claude, or non-Codex agent configuration.
- Requiring full AAMAD ceremony for tiny internal fixes.
- Publishing, version bumping, or Marketplace deployment without explicit human approval.

## Functional Requirements
- New user-visible features must define scope, non-goals, acceptance criteria, test strategy, and manual validation path.
- Work touching commands, menus, views, activation, or icons must keep `package.json`, implementation, README, and tests aligned.
- Work touching Git mutations must preserve conflict guards, confirmations, repository selection, and cancellation handling.
- Work touching the revision graph webview must preserve theming, empty states, multi-repository behavior, and refresh behavior.
- Work touching cache behavior must preserve repository freshness, cancellation semantics, bounded memory usage, and deterministic graph layout reuse.
- Release-bound work must update `project-context/3.deliver/release.md`.

## Acceptance Criteria
- AAMAD artifacts identify the current baseline from `package.json` and release readiness state from `project-context/3.deliver/release.md`.
- Feature work has a corresponding artifact under `project-context/2.build/features/` or a justified note in the relevant build area file.
- Verification commands are recorded for each meaningful change.
- Release work cannot proceed to publish or version bump without explicit human approval.
- Cache optimization work is traceable through hit/miss or bypass logging and does not introduce stale graph, ref, diff, or show-log data.

## Next Release Define Draft
- Current package baseline on 2026-05-09: `0.0.29`.
- Current release readiness state: `0.0.29` release candidate is packaged; Marketplace publishing remains with the maintainer and future packaging or publishing still requires explicit human approval.
- Candidate next release: `0.0.30`.
- Approved direction from user: prioritize visual correctness after reference deletion by removing the recent local-branch deletion optimization that bypasses a graph reload.
- Recommended anchor: restore full graph rebuilds after successful local branch deletion and after `Sync with...` pulls, so the rendered scene, node sizing, layout keys, refs, selection, and viewport state are rebuilt from repository truth when Git topology may have changed.
- Candidate feature artifact: `project-context/2.build/features/0.0.30-reference-deletion-refresh.md`.
- Additional candidate feature artifact: `project-context/2.build/features/0.0.30-sync-pull-refresh.md`.

## Source Control Companion View Define Draft
- Current package baseline on 2026-05-16: `0.0.30`.
- Candidate direction: Phase 1 of Source Control integration, tracked in `project-context/1.define/source-control-companion-view.md`.
- Product goal: make the revision graph available from the built-in Source Control container while preserving the current dedicated `Git Revision Graph` Activity Bar surface.
- Recommended scope: add a companion `Revision Graph` webview view under `contributes.views.scm`, keep the existing graph view intact, and reuse existing graph workflows.
- Non-goals: custom SCM Provider, editor-tab graph, removal of the dedicated Activity Bar container, Compare Results/Show Log relocation, telemetry, or graph model redesign.
- Success condition: users can inspect and act on revision topology from Source Control without losing the focused graph-first product identity.

## Source Control Editor Panel Phase 2 Draft
- Current package baseline on 2026-05-16: `0.0.30`.
- Candidate direction: Phase 2 of Source Control integration, tracked in `project-context/2.build/features/source-control-editor-panel.md`.
- Product goal: let Source Control users open the revision graph in the editor area as a full-size internal workbench tab.
- Recommended scope: add a `WebviewPanel` graph surface, add a command to open/reveal it, and route the Source Control toolbar button to that command.
- Non-goals: removing existing graph placements, custom SCM Provider work, Compare Results/Show Log relocation, telemetry, or graph model redesign.
- Success condition: users can launch a full-size graph from Source Control while the existing Activity Bar graph and companion view remain stable.

## Source Control Product Surface Phase 3 Draft
- Current package baseline on 2026-05-16: `0.0.30`.
- Candidate direction: Phase 3 of Source Control integration, tracked in `project-context/2.build/features/source-control-product-surface.md`.
- Product decision: do not keep the dedicated Activity Bar graph visible and do not keep the Source Control companion graph view. Keep left Activity Bar review containers only for Compare and Show Logs, labeled as `Git Revision Graph - Compare` and `Git Revision Graph - Show Logs`.
- Recommended scope: keep Source Control toolbar access as the primary entry point, open/reveal the editor graph panel, remove duplicate graph side-bar contributions, preserve on-demand Compare Results and Show Log review views while the graph panel is open, and close those dependent views when the graph panel closes.
- Success condition: users have one clear graph entry point from Source Control and one full-size graph surface in the editor area.

## 0.0.30 Reference Deletion Refresh Candidate Scope
- Replace the local branch deletion direct reference patch with the standard full graph rebuild path used by tag and remote branch deletion.
- Preserve existing confirmation, conflict/error reporting, force-delete fallback, multi-repository behavior, and native VS Code Git API usage.
- Keep lightweight workspace-state overlay patches for merge/reset status changes; this scope targets reference deletion visual integrity, not all overlay refresh behavior.
- Build decision: remove the now-unused `referencePatch` host/controller/state contract because no active workflow needs direct reference patches after restoring full rebuilds for local branch deletion.
- Update focused tests so normal and force local branch deletion expect a full rebuild refresh request.
- Manually validate deleting a local branch that shares a card with a remote tracking ref, deleting a local branch that is the only visible ref on a card, and deleting a hidden/off-snapshot branch.

## 0.0.30 Sync Pull Refresh Candidate Scope
- Keep push-only `Sync with...` on `metadata-patch` because it updates remote/upstream metadata without changing local commit topology.
- Restore `full-rebuild` after pull-only `Sync with...` because pulled commits can move `HEAD` to topology that is not safely represented by a metadata-only patch.
- Keep diverged sync on `full-rebuild`.
- Preserve existing sync guards and user-facing messages.

## 0.0.28 Graph Cache Architecture Candidate Scope
- Define a cacheable immutable graph snapshot that represents commit DAG/history data loaded from `git log`.
- Define mutable overlays for current refs, `HEAD`, upstream/published state, workspace dirtiness, and merge-blocked metadata.
- Preserve repository freshness by invalidating the immutable snapshot only when history/topology inputs change, while allowing overlay-only updates for metadata changes.
- Preserve cancellation semantics by avoiding shared cancelable in-flight Git work unless ownership and abort behavior are explicit.
- Preserve bounded memory usage with cache size, age, repository, projection, and history-limit constraints.
- Keep the existing webview, controller, Git API, and targeted Git CLI architecture; this is an internal cache architecture change, not a new product surface.

## Success Metrics
- Fewer regressions from manifest/command/view drift.
- Clearer release readiness before package or Marketplace steps.
- Faster onboarding for future feature work because decisions and known gaps are recorded.

## Constraints
- Stack remains TypeScript, npm, VS Code extension API, built-in `vscode.git`, targeted Git CLI, and webview UI.
- Primary verification commands are `npm run build` and `npm test`.
- Existing docs and repo conventions outrank generic methodology defaults.

## Risks
- Artifacts can become stale if not updated during feature work.
- Overly broad feature scopes can delay releases.
- Manual Extension Development Host validation remains necessary for some VS Code and Git integration behaviors.

## Sources
- `README.md`
- `package.json`
- `.codex/skills/vscode-extension-developer/SKILL.md`
- `.codex/skills/vscode-extension-developer/references/project-map.md`
- `docs/revision-graph-parity-plan.md`

## Assumptions
- Future releases will continue to prioritize graph and Git workflow parity while preserving a lightweight extension.
- Contributors will use AAMAD artifacts as living working notes, not as formal documents detached from implementation.

## Open Questions
- What exact event taxonomy should distinguish immutable graph invalidation from overlay-only updates in `0.0.28`?
- Should the immutable graph snapshot be keyed by the exact current graph load parameters, or should `0.0.28` introduce a reusable superset snapshot for multiple projection modes?
- What manual validation matrix should be required before each Marketplace publish?
