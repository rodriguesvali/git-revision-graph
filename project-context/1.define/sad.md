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
- On-demand secondary review views remain available for Compare Results and Show Log while the editor graph panel is open.
- The remaining Activity Bar review containers are explicitly labeled `Git Revision Graph - Compare` and `Git Revision Graph - Show Logs` so they read as review surfaces, not the primary graph entry point.
- Shared services remain shared where they are already cross-surface concepts: Git API access, graph backend/cache services, Compare Results presenter, Show Log presenter, text document content providers, and workbench action services.

## Components
- Extension manifest: commands, menus, views, container, dependency on `vscode.git`, package metadata.
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
  - Keep Activity Bar containers only for on-demand review views.
  - Label the compare container `Git Revision Graph - Compare`.
  - Label the show-log container `Git Revision Graph - Show Logs`.
  - Keep the Source Control title action wired to `gitRefs.openRevisionGraphEditor`.
  - Keep Compare Results and Show Log as on-demand secondary views.
- `src/revisionGraphTypes.ts`
  - Keep the editor panel view type as the graph surface identifier.
  - Keep legacy view IDs only where still needed by compatibility code or tests.
- `src/revisionGraphPanel.ts` and `src/revisionGraph/controller.ts`
  - Keep a singleton editor `WebviewPanel` that reveals the existing panel when invoked again.
  - Reuse the existing graph controller, webview shell, backend, and message contract.
  - Notify dependent review views when the editor graph panel is disposed.
- `src/extension.ts`
  - Register Compare Results and Show Log view providers.
  - Register `gitRefs.openRevisionGraphEditor` and keep `gitRefs.openRevisionGraph` as a compatibility alias to the editor panel.
  - Do not register graph `WebviewViewProvider` instances for removed side-bar graph placements.
  - Wire graph-panel disposal to hide Compare Results and Show Log without reopening the graph.
- `src/viewLayout.ts`
  - Keep the removed side-bar graph hidden.
  - Return focus to `gitRefs.openRevisionGraphEditor` after the last secondary view closes.
  - Allow secondary views to detach when their owning graph panel closes.

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
5. Compare Results and Show Log remain single shared secondary review surfaces while the graph panel is open.
6. Closing the graph panel hides Compare Results and Show Log without triggering the editor graph open command.

## Interfaces
- VS Code extension API.
- VS Code `contributes.menus` contribution points for Source Control toolbar access.
- VS Code `WebviewPanel` for the editor graph.
- VS Code `WebviewViewProvider` for remaining secondary review views.
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
- Review containers can remain in the Activity Bar, but their titles must identify the active review use case: `Git Revision Graph - Compare` and `Git Revision Graph - Show Logs`.
- Compare Results and Show Log remain on-demand secondary review views until they are intentionally redesigned, but they should return focus to the editor graph command after user-initiated secondary close and should close with the editor graph panel after graph-panel close.
- The `0.0.31` release candidate should document the final Source Control/editor graph product surface and should not present the superseded companion graph as a shipped feature.

## Risks
- Manifest and command registrations can drift without explicit checks.
- Webview state bugs can be hard to catch through automated tests alone.
- Release packaging can ship stale README or contribution metadata if Deliver checks are skipped.
- Cache changes can introduce stale graph, ref, diff, or log data if invalidation does not respect repository state changes, worktree-sensitive operations, and cancellation boundaries.
- Optimistic reference patches can compromise visual integrity after deletion by leaving stale scene geometry, empty cards, or preserved viewport/selection context that no longer matches repository truth.
- Pull-based sync metadata patches can preserve stale layout context when newly pulled commits change topology, even when a fallback exists for unresolved `HEAD` cases.
- Shared Compare Results and Show Log remain review surfaces while the graph itself lives in the editor area; their lifecycle is owned by the graph panel and this split needs manual UX validation.
- Legacy side-bar graph command IDs can cause drift if future code assumes `gitRefs.revisionGraphView` still exists in the manifest.

## Verification Strategy
- Required after meaningful changes: `npm run build`.
- Required for behavior, command, graph, controller, or workflow changes: `npm test`.
- Recommended before release: install generated VSIX in an Extension Development Host or clean VS Code profile and exercise graph loading, repository switching, compare, diff, checkout, branch, sync, merge, delete, and log flows as applicable.

For Source Control product surface Phase 3, add manual validation for:

- Source Control toolbar opens the editor graph panel.
- Repeated toolbar clicks reveal the same editor panel.
- No dedicated primary graph Activity Bar entry appears on a fresh workspace; review Activity Bar entries are labeled `Git Revision Graph - Compare` and `Git Revision Graph - Show Logs`.
- No Source Control companion graph view appears below Changes.
- Refresh, fetch, repository selection, compare, diff, checkout, branch creation, sync, merge, delete, Show Log, and Compare Results still work from the editor graph.
- Closing Compare Results or Show Log returns to the editor graph entry point.
- Closing the editor graph panel hides Compare Results and Show Log and does not reopen the graph.
- Zero-repository and multi-repository workspaces behave consistently.

## Sources
- `package.json`
- `README.md`
- `project-context/1.define/source-control-companion-view.md`
- `project-context/1.define/source-control-integration-viability.md`
- `project-context/2.build/features/source-control-editor-panel.md`
- `project-context/2.build/features/source-control-product-surface.md`
- `docs/release-0.0.31-prioritization.md`
- `.codex/skills/vscode-extension-developer/references/project-map.md`
- `docs/revision-graph-parity-plan.md`
- VS Code Extension API documentation for `contributes.views`, `contributes.menus`, `WebviewViewProvider`, and editor `WebviewPanel` usage.

## Assumptions
- Current package baseline is read from `package.json`; release readiness state is tracked in `project-context/3.deliver/release.md`.
- New features will continue to use the existing extension host plus webview architecture unless explicitly approved otherwise.

## Open Questions
- Which graph parity gaps should be prioritized after the current release baseline?
- Should release validation include a fixed sample repository fixture for manual testing?
- Should Git argument hardening normalize all known refs to full ref names before command execution?
- Which Git CLI paths should receive hard timeouts versus output caps only?
- Should stabilization validation include a fixture repository with option-like tag/ref names?
- Which repository events should invalidate immutable DAG/history data versus only rebuilding overlays?
- Can projection changes reuse a larger immutable graph snapshot without stale refs or incorrect branch-scope results?
- Which cache paths need manual validation with rapid refresh, repository switching, interrupted graph loads, checkout, fetch, push-only sync, and pull-only sync?
