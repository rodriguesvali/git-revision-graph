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

For Source Control integration Phase 1, add a second workbench placement for the revision graph instead of replacing the current surface:

- Existing primary view: `gitRefs.revisionGraphView` in the custom `gitRefs` Activity Bar container.
- New companion view: a `webview` view contributed under the built-in `scm` Source Control container.
- The companion view is additive and initially collapsed to avoid crowding Source Control.
- Both placements use the same graph product capability, but each visible webview owns its own lifecycle, repository selection, render coordinator, and webview message subscriptions.
- Shared services remain shared where they are already cross-surface concepts: Git API access, graph backend/cache services, Compare Results presenter, Show Log presenter, text document content providers, and workbench action services.

## Components
- Extension manifest: commands, menus, views, container, dependency on `vscode.git`, package metadata.
- Extension host orchestration: activation, command registration, repository and provider wiring.
- Git integration: public `vscode.git` API for repository state and mutations, targeted Git CLI for graph/history data.
- Webview UI: revision graph rendering, interactions, filtering, context menus, compare/log surfaces.
- Cache layers: short-lived graph snapshot cache, persisted bounded projected-layout cache, webview state for scene offsets, and Show Log expanded-change cache.
- Tests: TypeScript build, Node test suite, focused unit/integration-style coverage.
- AAMAD artifacts: Define, Build, Deliver, handoff, and feature-scoped notes.

## Source Control Companion Architecture
Phase 1 should use a dual-placement architecture:

- `package.json`
  - Keep `contributes.views.gitRefs` unchanged for the primary graph, Compare Results, and Show Log.
  - Add `contributes.views.scm` with a new webview view ID for the Source Control companion graph, for example `gitRefs.sourceControlRevisionGraphView`.
  - Set the Source Control companion `visibility` to `collapsed` unless validation proves VS Code ignores or degrades that setting for this container.
  - Mirror only graph-specific title actions that make sense inside Source Control: refresh, fetch current repository, and choose graph repository.
- `src/revisionGraphTypes.ts`
  - Add a separate view ID constant for the Source Control companion graph.
  - Keep the current primary graph view ID stable for existing commands, tests, screenshots, and user muscle memory.
- `src/revisionGraphPanel.ts` and `src/revisionGraph/controller.ts`
  - Parameterize graph placement metadata instead of hardcoding `REVISION_GRAPH_VIEW_ID` in the controller.
  - Keep one controller instance per graph placement. Do not attach two live `WebviewView` instances to the same controller.
  - Preserve per-placement webview state, current repository selection, pending render cancellation, and message subscriptions.
- `src/extension.ts`
  - Register one `RevisionGraphViewProvider` for the primary view and a second provider for the Source Control companion view.
  - Pass the same `git` API, backend, Compare Results provider, and Show Log provider to both graph providers where the underlying service is safe to share.
  - Keep existing commands focused on the primary graph unless a dedicated Source Control focus command is intentionally added.
- `src/viewLayout.ts`
  - Keep Compare Results and Show Log visibility management scoped to the existing `gitRefs` container in Phase 1.
  - Do not attempt to move secondary views into Source Control in this phase.

The architectural intent is to share domain services, not webview ownership. A graph placement is a UI session with its own lifecycle; Git data loading and action execution remain shared extension capabilities.

## Data Flow
1. VS Code activates the extension and loads the built-in Git API.
2. The extension reads workspace repositories and refs.
3. Graph/history data is loaded through Git API and targeted Git CLI calls where needed.
4. The extension shapes state for the webview and listens for repository changes.
5. User actions flow from webview or Command Palette to extension host handlers.
6. Native VS Code UI and Git operations complete workflows, then refresh visible state.

With two graph placements:

1. VS Code resolves each graph view independently when that view becomes visible.
2. Each graph controller reconciles its own current repository against the shared `vscode.git` repository list.
3. Repository events can trigger refresh preparation in each resolved graph placement.
4. Compare, diff, checkout, branch, sync, merge, delete, and log actions still flow through the existing shared workbench action services.
5. Compare Results and Show Log remain single shared secondary surfaces in the dedicated `gitRefs` container.

## Interfaces
- VS Code extension API.
- VS Code `contributes.views` contribution point for both custom containers and the built-in `scm` container.
- VS Code `WebviewViewProvider` registration, one registration per graph view ID.
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

## Risks
- Manifest and command registrations can drift without explicit checks.
- Webview state bugs can be hard to catch through automated tests alone.
- Release packaging can ship stale README or contribution metadata if Deliver checks are skipped.
- Cache changes can introduce stale graph, ref, diff, or log data if invalidation does not respect repository state changes, worktree-sensitive operations, and cancellation boundaries.
- Optimistic reference patches can compromise visual integrity after deletion by leaving stale scene geometry, empty cards, or preserved viewport/selection context that no longer matches repository truth.
- Pull-based sync metadata patches can preserve stale layout context when newly pulled commits change topology, even when a fallback exists for unresolved `HEAD` cases.
- Sharing one graph controller across the existing Activity Bar graph and a new Source Control companion view can create lifecycle, refresh cancellation, and repository-selection bugs if not refactored deliberately.
- A Source Control companion view can crowd the built-in Git UI if it is visible by default or mirrors the full graph without respecting side-bar constraints.
- Independent graph controllers can duplicate refresh work when both graph placements are visible; implementation should avoid global cancellation side effects and rely on existing bounded graph command safeguards.
- Shared Compare Results and Show Log presenters can surprise users if an action starts in Source Control but the secondary result appears in the custom `gitRefs` container; this is acceptable for Phase 1 only if documented and manually validated.
- Hardcoded primary graph view IDs in controller, layout, tests, or menus can cause the companion view to focus the wrong surface or fail title actions.

## Verification Strategy
- Required after meaningful changes: `npm run build`.
- Required for behavior, command, graph, controller, or workflow changes: `npm test`.
- Recommended before release: install generated VSIX in an Extension Development Host or clean VS Code profile and exercise graph loading, repository switching, compare, diff, checkout, branch, sync, merge, delete, and log flows as applicable.

For Source Control companion Phase 1, add manual validation for:

- Source Control companion view contribution appears under `scm` and starts collapsed on a fresh workspace when VS Code honors the manifest setting.
- Primary Activity Bar graph still opens through `gitRefs.openRevisionGraph`.
- Both graph placements can be opened simultaneously without losing repository selection, pending refresh state, or webview event handling.
- Refresh, fetch, repository selection, compare, diff, checkout, branch creation, sync, merge, delete, Show Log, and Compare Results still work when started from the companion view.
- Zero-repository and multi-repository workspaces behave consistently across both placements.
- Moving or hiding the Source Control companion view does not break the primary graph.

## Sources
- `package.json`
- `README.md`
- `project-context/1.define/source-control-companion-view.md`
- `project-context/1.define/source-control-integration-viability.md`
- `.codex/skills/vscode-extension-developer/references/project-map.md`
- `docs/revision-graph-parity-plan.md`
- VS Code Extension API documentation for `contributes.views` and `WebviewViewProvider`.

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
- Should the Source Control companion view share repository selection with the dedicated graph or maintain independent per-placement selection?
- Should Compare Results and Show Log focus restoration return to the originating graph placement once multiple graph placements exist?
