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

## 1.2.0 Release Define
- Current package baseline before opening on 2026-06-21: `1.1.0`.
- Target release: `1.2.0`.
- Product goal: improve perceived and measured performance without changing the established Source Control/editor graph product surface or weakening Git workflow correctness.
- Primary users: users opening VS Code workspaces where the extension should stay dormant until needed, and users browsing branch-heavy or large repositories where graph refresh, scrolling, and Show Log interaction can become expensive.
- Recommended scope:
  - remove unnecessary startup activation after validating that contributed commands provide sufficient implicit activation;
  - make build/package output deterministic, exclude stale compiled artifacts and source maps, and evaluate bundling behind a separate dependency-change approval;
  - separate projection-only refresh work from Git snapshot reloads where snapshot correctness can be proven;
  - reuse repository refs within one graph load and reduce per-reference Git process fan-out;
  - reduce full-graph work in virtualized viewport frames;
  - evaluate incremental or virtualized Show Log updates.
- Baseline evidence from the opening analysis:
  - the packaged VSIX contained 718 files and was approximately 1.3 MB;
  - `out/` contained 10 compiled JavaScript files without matching current TypeScript sources;
  - the VSIX contained 132 source-map files;
  - full graph state construction can request repository refs in both snapshot loading and overlay construction;
  - virtualized graph scroll frames still scan all graph nodes and edges and rebuild topology-derived maps;
  - Show Log state changes resend and rebuild the complete loaded commit list.
- Non-goals: changing command IDs, adding new product surfaces, replacing `vscode.git`, rendering unbounded full history, weakening cancellation or conflict guards, publishing, or adding a bundler dependency without separate maintainer approval.
- Success condition: selected slices demonstrate lower activation, package, graph-load, or render cost through deterministic measurements while preserving all existing automated tests and required Extension Development Host workflows.
- Planning reference: `project-context/docs/release-1.2.0-prioritization.md`.

## 0.0.37 Release Define
- Current package baseline on 2026-06-04: `0.0.36`.
- Target release: `0.0.37`.
- Product goal: deliver small visual and functional product improvements from maintainer review while preserving the `0.0.36` graph layout, virtualized rendering, worker-thread layout, and stale render coordination changes.
- Recommended scope: review and select improvements item by item; move Compare Results and Show Log into editor-area panels; collect `0.0.36` VSIX/manual smoke findings; fix regressions in virtualized node/edge visibility, minimap/scroll/zoom synchronization, worker fallback, cancellation, stale refresh handling, and large-repository responsiveness; add focused regression coverage for any confirmed issue.
- Non-goals: changing the Source Control/editor graph product surface, adding new commands or view containers, replacing the renderer, expanding full-history graph scope, dependency changes, publishing, or version bumping without approval.
- Success condition: users get focused visual or functional polish, including central editor review panels, without destabilizing the post-`0.0.36` graph experience on branch-heavy and merge-heavy repositories, and maintainers have a clear go/no-go path for packaging `0.0.37`.
- Planning reference: `project-context/docs/release-0.0.37-prioritization.md`.

## 0.0.32 Release Define
- Current package baseline on 2026-05-21: `0.0.31`.
- Target release: `0.0.32`.
- Product goal: consolidate the new Source Control/editor graph product surface and choose one bounded graph-parity groundwork slice for implementation or deeper design.
- Recommended scope: treat the `0.0.31` Source Control/editor graph workflows as the regression baseline; patch discovered lifecycle, focus, or review-view issues; update user-facing docs/copy if needed; and select one low-risk foundation slice such as graph fixtures, `CommitGraph` / `ProjectedGraph` boundaries, refresh intent instrumentation, or a proven metadata-only refresh path.
- Non-goals: broad graph renderer replacement, moving Compare Results or Show Log into editor panels without a separate decision, making revision selection the primary interaction model in one release, broad cache architecture replacement, dependency changes, publishing, or version bumping without approval.
- Success condition: users can trust the Source Control launch and editor graph workflow, and maintainers have measured groundwork for the next graph-parity step without destabilizing the published extension.
- Planning reference: `project-context/docs/release-0.0.32-prioritization.md`.

## 0.0.31 Release Define
- Current package baseline on 2026-05-17: `0.0.30`.
- Source baseline for this release review: `c2bd300edcadf0207e6f6cf472c939a33ed164b5`.
- Target release: `0.0.31`.
- Current release readiness state: documentation is prepared for `0.0.31`; manual Extension Development Host validation, version bump, VSIX packaging, and Marketplace publishing remain pending maintainer approval.
- Product goal: make Source Control the primary launch point for the graph and use a full-size editor panel as the single graph workspace.
- Recommended scope: ship the Source Control toolbar entry, singleton editor graph panel, removed side-bar graph contributions, on-demand Compare Results and Show Log review containers, review-view lifecycle cleanup, double-click diff polish, and persisted `Show Minimap` option.
- Non-goals: custom SCM Provider behavior, restoring the old graph Activity Bar view, shipping the temporary Source Control companion graph view, redesigning Compare Results or Show Log as editor panels, dependency changes, publishing, or version bumping without approval.
- Success condition: users can open the graph from Source Control, work in one editor graph surface, and use Compare Results or Show Logs only when those review workflows are active.

## Source Control Integration Decision Record
- Phase 1 proved the companion view approach but it is superseded for the release because a narrow side-bar graph creates duplicate product surface and weaker graph ergonomics.
- Phase 2 added the editor `WebviewPanel` and Source Control toolbar command.
- Phase 3 is the release decision for `0.0.31`: remove the dedicated graph Activity Bar contribution and the Source Control companion graph contribution; keep only on-demand Activity Bar review containers labeled `Git Revision Graph - Compare` and `Git Revision Graph - Show Logs`.
- Planning references:
  - `project-context/1.define/source-control-integration-viability.md`
  - `project-context/1.define/source-control-companion-view.md`
  - `project-context/2.build/features/source-control-companion-view.md`
  - `project-context/2.build/features/source-control-editor-panel.md`
  - `project-context/2.build/features/source-control-product-surface.md`
  - `project-context/docs/release-0.0.31-prioritization.md`

## Recent 0.0.30 Completed Scope
- Restored full graph rebuilds after local branch deletion and pull-based sync to prioritize visual correctness when Git topology changes.
- Added Show Log text filtering, reference badges, commit comparison, and commit-to-worktree comparison through Compare Results.
- Coordinated graph, Show Log, and Compare Results view focus for the previous Activity Bar graph surface.
- `0.0.30` remains the current package baseline until the maintainer approves a `0.0.31` version bump.

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
- `project-context/docs/revision-graph-parity-plan.md`

## Assumptions
- Future releases will continue to prioritize graph and Git workflow parity while preserving a lightweight extension.
- Contributors will use AAMAD artifacts as living working notes, not as formal documents detached from implementation.

## Open Questions
- Which repository should be the standard manual benchmark for `0.0.37` large-graph validation?
- Should `0.0.37` improve worker fallback diagnostics even if no packaged-worker failure is reproduced?
- Should `0.0.32` be primarily a stabilization release, or include one small visible graph-parity improvement?
- Which graph-parity foundation slice should lead `0.0.32`: fixture coverage, model boundary types, refresh intent instrumentation, or one metadata-only patch path?
- What repository fixture should become the standard manual smoke sample for graph correctness?
- What manual Extension Development Host smoke matrix is mandatory before `0.0.31` packaging?
- Should Marketplace screenshots be refreshed for the Source Control toolbar and editor graph panel before publication?
- Decided on 2026-06-04: Compare Results and Show Log move to on-demand editor panels for `0.0.37`.
- Which graph parity gap should be prioritized after the Source Control surface change ships?
