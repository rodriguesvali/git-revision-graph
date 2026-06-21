# Solution Architecture Document

## Context
`Git Revision Graph` is a VS Code extension with a revision-graph webview and native workbench workflows for compare, diff, checkout, branch, sync, merge, delete, and log actions. AAMAD is applied as process architecture around this existing system.

## Architecture Overview
Keep the extension architecture intact:

- `package.json` defines the published extension surface.
- `src/extension.ts` wires activation, providers, commands, and content providers.
- Revision graph behavior is split across controller, backend, repository, source, webview shell, and browser-side scripts.
- Reference workflows live in testable action modules and VS Code workbench service adapters.
- `project-context/` tracks product, implementation, QA, and release decisions.

After Source Control integration Phase 3, keep one graph product surface:

- Primary entry point: `View Git Revision Graph` from the built-in Source Control toolbar or Command Palette.
- Primary graph surface: an editor-area `WebviewPanel`.
- Removed graph surfaces: the dedicated Activity Bar graph and the Source Control companion graph view.
- On-demand editor review panels remain available for Compare Results and Show Log while the editor graph panel is open.
- Compare Results and Show Log no longer contribute left-side Activity Bar review containers.
- Shared services remain shared where they are already cross-surface concepts: Git API access, graph backend/cache services, Compare Results presenter, Show Log presenter, text document content providers, and workbench action services.

## Components
- Extension manifest: commands, menus, dependency on `vscode.git`, package metadata.
- Extension host orchestration: activation, command registration, repository and provider wiring.
- Git integration: public `vscode.git` API for repository state and mutations, targeted Git CLI for graph/history data.
- Webview UI: revision graph rendering, interactions, filtering, context menus, compare/log surfaces.
- Cache layers: short-lived graph snapshot cache, persisted bounded projected-layout cache, webview state for scene offsets, and Show Log expanded-change cache.
- Tests: TypeScript build, Node test suite, focused unit/integration-style coverage.
- AAMAD artifacts: Define, Build, Deliver, handoff, and feature-scoped notes.

## Source Control Editor Panel Architecture
Phase 3 uses a single graph placement architecture:

- `package.json`
  - Do not contribute `gitRefs.revisionGraphView`.
  - Do not contribute `gitRefs.sourceControlRevisionGraphView`.
  - Do not contribute Compare Results or Show Log Activity Bar containers.
  - Keep the Source Control title action wired to `gitRefs.openRevisionGraphEditor`.
  - Keep Compare Results and Show Log as on-demand editor panels.
- `src/revisionGraphTypes.ts`
  - Keep the editor panel view type as the graph surface identifier.
  - Keep legacy view IDs only where still needed by compatibility code or tests.
- `src/revisionGraphPanel.ts` and `src/revisionGraph/controller.ts`
  - Keep a singleton editor `WebviewPanel` that reveals the existing panel when invoked again.
  - Reuse the existing graph controller, webview shell, backend, and message contract.
  - Notify dependent review panels when the editor graph panel is disposed.
- `src/extension.ts`
  - Construct Compare Results and Show Log panel presenters.
  - Register `gitRefs.openRevisionGraphEditor` and keep `gitRefs.openRevisionGraph` as a compatibility alias to the editor panel.
  - Do not register graph `WebviewViewProvider` instances for removed side-bar graph placements.
  - Wire graph-panel disposal to dispose Compare Results and Show Log without reopening the graph.
- `src/viewLayout.ts`
  - Keep the removed side-bar graph hidden.
  - Preserve the legacy visibility context reset without owning secondary review focus.

The architectural intent is to keep one graph workspace while preserving existing review workflows. Git data loading and action execution remain shared extension capabilities.

## Data Flow
1. VS Code activates the extension and loads the built-in Git API.
2. The extension reads workspace repositories and refs.
3. Graph/history data is loaded through Git API and targeted Git CLI calls where needed.
4. The extension shapes state for the webview and listens for repository changes.
5. User actions flow from webview or Command Palette to extension host handlers.
6. Native VS Code UI and Git operations complete workflows, then refresh visible state.

With the editor graph panel:

1. The Source Control toolbar command opens or reveals the singleton editor panel.
2. The graph controller reconciles its current repository against the shared `vscode.git` repository list.
3. Repository events can trigger refresh preparation in the resolved editor graph.
4. Compare, diff, checkout, branch, sync, merge, delete, and log actions still flow through the existing shared workbench action services.
5. Compare Results and Show Log remain single shared editor review panels while the graph panel is open.
6. Closing the graph panel hides Compare Results and Show Log without triggering the editor graph open command.

## Interfaces
- VS Code extension API.
- VS Code `contributes.menus` contribution points for Source Control toolbar access.
- VS Code `WebviewPanel` for the editor graph, Compare Results, and Show Log.
- Built-in `vscode.git` extension API.
- Targeted `git` CLI calls for log, diff, show, and graph/history data.
- Webview post-message contracts between extension host and browser-side graph scripts.
- npm scripts for build, test, package, and publish.

## Quality Attributes
- Preserve native VS Code ergonomics and theme compatibility.
- Keep activation lightweight and avoid blocking repository event handlers.
- Preserve multi-repository behavior and empty-state handling.
- Guard workspace-changing operations during unresolved conflicts.
- Keep release steps explicit and reversible where possible.

## Security and Privacy
- Do not store secrets in artifacts.
- Do not publish tokens, Marketplace credentials, repository-private data, or user Git data in docs.
- Treat Git operations as local workspace actions requiring careful confirmations for destructive flows.

## Decisions
- AAMAD is process scaffolding, not runtime architecture.
- Feature work should be scoped by release impact and tracked in `project-context/2.build/features/`.
- Release deployment remains human-approved.
- Built-in `vscode.git` remains preferred for repository state and mutations; Git CLI remains acceptable for graph/history data not exposed by the API.
- The `1.2.0` cycle is performance-focused and must preserve the current Source Control-launched singleton editor graph architecture.
- `1.2.0` optimization work should begin with observable boundaries: extension activation, package composition, Git snapshot/ref loading, projection/layout construction, host-to-webview payloads, virtual viewport frames, and Show Log rendering.
- Projection-only reuse is acceptable only when the cached snapshot is a valid superset for the requested options and mutable refs/HEAD are reapplied before state delivery.
- Ref-loading reuse should be scoped to one coherent graph-load request; it must not introduce cross-request stale repository metadata.
- Viewport optimization should retain the complete in-memory graph model for minimap, navigation, selection, and layout while indexing visible candidates so scroll frames do not repeatedly scan and rebuild unrelated full-graph structures.
- Bundling is a candidate packaging optimization, not an approved dependency change. It requires explicit maintainer approval and must preserve the layout worker as a separately loadable runtime entrypoint.
- The `0.0.32` Define draft should start as a post-Source-Control stabilization and graph-parity groundwork release. The release should protect the `0.0.31` Source Control/editor graph product surface before taking on one bounded graph foundation slice.
- The `0.0.27` Define draft should prioritize stabilization: Git CLI argument safety, bounded Git command execution, compare restore path guards, webview message budgets, and dependency audit posture.
- Cache optimization for `0.0.27` should start with observability and bounded low-risk changes. Reusing completed snapshots for cancelable refreshes is acceptable only if cancellation does not terminate shared Git work needed by another consumer.
- The `0.0.28` Define draft should evaluate separating immutable commit DAG/history caching from mutable ref and HEAD overlay state as the next cache architecture improvement.
- The `0.0.30` Define draft should remove the local branch deletion reference-removal overlay because visual correctness outranks avoiding a reload for destructive ref mutations.
- Reference deletion refresh behavior should be conservative: local branch, tag, and remote branch deletion should converge on a full graph rebuild unless a future design proves scene/layout correctness with deterministic validation.
- Build decision for `0.0.30`: remove the unused direct reference-patch post-message/controller/state contract after local branch deletion returns to full graph rebuilds.
- The `0.0.30` sync refresh path should keep push-only sync optimized with metadata patches, but use full graph rebuilds after any pull because `HEAD` and visible topology may advance beyond the current snapshot.
- Source Control integration should begin as an additive companion view under the built-in `scm` container, not as a custom SCM Provider and not as a replacement for the existing Activity Bar graph.
- Phase 1 of Source Control integration should preserve the current graph controller/backend/webview boundaries unless a targeted lifecycle refactor is required to support multiple simultaneous graph view instances safely.
- Phase 1 should use separate graph provider/controller instances per placement and should parameterize placement IDs instead of sharing one controller across multiple webviews.
- The Source Control companion view should default to `collapsed` in the manifest to reduce Source Control clutter on first install/update.
- The primary `gitRefs.revisionGraphView` remains the target for the existing `gitRefs.openRevisionGraph` command in Phase 1.
- Compare Results and Show Log remain shared on-demand secondary views in the existing `gitRefs` container for Phase 1; origin-aware focus restoration can be revisited after the companion view is stable.
- Phase 2 adds an editor-area `WebviewPanel` graph surface as a third placement. The panel uses its own graph controller instance, reuses the existing graph webview shell and shared backend/action services, and is opened or revealed through a dedicated command instead of replacing the primary Activity Bar graph command.
- The Source Control toolbar entry should launch the editor panel in Phase 2, while the Phase 1 companion view remains available as a collapsible Source Control view for users who want an embedded side-bar graph.
- Phase 3 product surface decision removes the dedicated Activity Bar graph and Source Control companion graph contributions. Source Control toolbar access becomes the primary entry point, and the editor `WebviewPanel` becomes the single graph surface.
- `0.0.37` redesigns Compare Results and Show Log as editor-area panels and removes their Activity Bar review containers.
- Compare Results and Show Log should close with the editor graph panel after graph-panel close.
- The `0.0.31` release candidate should document the final Source Control/editor graph product surface and should not present the superseded companion graph as a shipped feature.
- The `0.0.37` Define cycle should prioritize stabilization of the `0.0.36` `d3-dag`, worker-thread layout, virtualized rendering, and stale render guard architecture before accepting a broader graph-parity slice.
- The `0.0.37` cycle should keep the Source Control-launched singleton editor graph while moving on-demand Compare Results/Show Log review surfaces into editor panels.

## Risks
- Manifest and command registrations can drift without explicit checks.
- Webview state bugs can be hard to catch through automated tests alone.
- Release packaging can ship stale README or contribution metadata if Deliver checks are skipped.
- Removing startup activation without preserving required compatibility initialization could leave legacy context state stale; validate command activation and fresh-profile behavior.
- Reusing snapshots or refs across the wrong invalidation boundary could display stale topology, refs, or `HEAD`.
- Spatial indexing and incremental DOM updates can improve frame cost while introducing offscreen selection, minimap, focus, or accessibility regressions.
- Bundling can break worker path resolution or omit runtime dependencies if package validation is not explicit.
- Cache changes can introduce stale graph, ref, diff, or log data if invalidation does not respect repository state changes, worktree-sensitive operations, and cancellation boundaries.
- Optimistic reference patches can compromise visual integrity after deletion by leaving stale scene geometry, empty cards, or preserved viewport/selection context that no longer matches repository truth.
- Pull-based sync metadata patches can preserve stale layout context when newly pulled commits change topology, even when a fallback exists for unresolved `HEAD` cases.
- Shared Compare Results and Show Log now live in the editor area with the graph; their singleton panel lifecycle still needs manual UX validation.
- Legacy side-bar graph command IDs can cause drift if future code assumes `gitRefs.revisionGraphView` still exists in the manifest.

## Verification Strategy
- Required after meaningful changes: `npm run build`.
- Required for behavior, command, graph, controller, or workflow changes: `npm test`.
- Recommended before release: install generated VSIX in an Extension Development Host or clean VS Code profile and exercise graph loading, repository switching, compare, diff, checkout, branch, sync, merge, delete, and log flows as applicable.

For Source Control product surface Phase 3, add manual validation for:

- Source Control toolbar opens the editor graph panel.
- Repeated toolbar clicks reveal the same editor panel.
- No dedicated primary graph Activity Bar entry appears on a fresh workspace, and no Compare Results or Show Log review Activity Bar entries are contributed.
- No Source Control companion graph view appears below Changes.
- Refresh, fetch, repository selection, compare, diff, checkout, branch creation, sync, merge, delete, Show Log, and Compare Results still work from the editor graph.
- Closing Compare Results or Show Log closes only that editor review panel.
- Closing the editor graph panel closes Compare Results and Show Log and does not reopen the graph.
- Zero-repository and multi-repository workspaces behave consistently.

## Sources
- `package.json`
- `README.md`
- `project-context/1.define/source-control-companion-view.md`
- `project-context/1.define/source-control-integration-viability.md`
- `project-context/2.build/features/source-control-editor-panel.md`
- `project-context/2.build/features/source-control-product-surface.md`
- `project-context/docs/release-0.0.31-prioritization.md`
- `.codex/skills/vscode-extension-developer/references/project-map.md`
- `project-context/docs/revision-graph-parity-plan.md`
- VS Code Extension API documentation for `contributes.views`, `contributes.menus`, `WebviewViewProvider`, and editor `WebviewPanel` usage.

## Assumptions
- Current package baseline is read from `package.json`; release readiness state is tracked in `project-context/3.deliver/release.md`.
- New features will continue to use the existing extension host plus webview architecture unless explicitly approved otherwise.

## Open Questions
- Should `0.0.37` stay patch-sized and regression-driven, or reserve room for one low-risk graph-parity improvement after smoke validation?
- Which large repository, fixture, or synthetic graph should become the repeatable manual benchmark for worker-layout and virtualization validation?
- Do worker-layout fallbacks need more explicit output-channel diagnostics before publication?
- Which `0.0.32` graph foundation slice should be implemented first: graph fixtures, model boundary types, refresh intent instrumentation, or a narrow metadata-only patch path?
- Decided on 2026-06-04: Compare Results and Show Log move to on-demand editor panels for `0.0.37`.
- Which graph parity gaps should be prioritized after the current release baseline?
- Should release validation include a fixed sample repository fixture for manual testing?
- Should Git argument hardening normalize all known refs to full ref names before command execution?
- Which Git CLI paths should receive hard timeouts versus output caps only?
- Should stabilization validation include a fixture repository with option-like tag/ref names?
- Which repository events should invalidate immutable DAG/history data versus only rebuilding overlays?
- Can projection changes reuse a larger immutable graph snapshot without stale refs or incorrect branch-scope results?
- Which cache paths need manual validation with rapid refresh, repository switching, interrupted graph loads, checkout, fetch, push-only sync, and pull-only sync?
