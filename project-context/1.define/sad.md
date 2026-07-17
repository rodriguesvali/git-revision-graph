# Solution Architecture Document

Status: Active
Last consolidated: 2026-07-13

## Context

`Git Revision Graph` is a VS Code extension with an editor-area revision graph webview and native workbench workflows for Git review and mutation actions. AAMAD is documentation and release governance around this existing system; it is not runtime architecture.

## Active Architecture

- `package.json` defines the published extension surface, contributed commands, Source Control toolbar entry, settings, extension dependency on `vscode.git`, and packaging scripts.
- `src/extension.ts` owns activation, Git API acquisition, command registration, document content providers, and shared presenter/service construction.
- `src/revisionGraphPanel.ts` exposes the revision graph editor panel entrypoints.
- `src/revisionGraph/controller.ts` coordinates the graph webview surface, render state, repository lifecycle integration, webview messages, and graph-side actions.
- `src/revisionGraph/repository/lifecycle.ts` owns repository attachment, repository-set changes, repository state signatures, active-repository transitions, and refresh request enrichment.
- `src/revisionGraph/backend.ts`, `src/revisionGraph/backendServices/*`, `src/revisionGraph/source/graphGit.ts`, and `src/revisionGraph/repository/snapshot.ts` load graph snapshots, revision logs, diffs, commit details, and merge-blocked metadata.
- `src/revisionGraph/projection/*`, `src/revisionGraph/layout/*`, and model/query modules shape commit graph data, projection options, focus modes, layout, and cache behavior.
- `src/revisionGraph/model/*`, `src/revisionGraph/revisionLogTypes.ts`, `src/revisionGraphData.ts`, and `src/revisionGraphTypes.ts` define graph domain types, serializable scene/view-state contracts, and compatibility re-exports across host and webview boundaries.
- `src/revisionGraphWebview.ts` and `src/revisionGraph/webview/script/*` generate and run the browser-side graph UI, including virtualization, minimap, search, selection, context menus, and message handling.
- `src/revisionGraph/messageValidation.ts`, `src/revisionGraph/messageAuthorization.ts`, `src/revisionGraph/messageDispatcher.ts`, and `src/revisionGraph/messageHandler.ts` split webview message parsing, state/current-repository authorization, dispatch, and action handling.
- `src/compareResultsView.ts` and the Show Log presenter provide on-demand editor review panels.
- `src/refActions.ts` contains testable Git workflows.
- `src/workbenchRefActionServices.ts`, `src/workbenchRefActionUi.ts`, `src/workbenchDiffPresenter.ts`, `src/workbenchReferenceManager.ts`, and `src/workbenchCompareResultRestore.ts` adapt those workflows to VS Code UI, diff presentation, reference mutation, ancestry, refresh, and Compare Results restore helpers.
- `src/git.ts` defines the minimal subset of the built-in Git API used by this project.
- `src/hostedGitRemote.ts` owns provider-neutral remote selection, fetch/push identity checks, and
  capability dispatch; `src/hostedGitProviders/*` owns trusted clone-host parsing and browser URL
  construction for GitHub, Azure DevOps, GitLab.com, AWS CodeCommit, and Google Secure Source
  Manager without provider authentication.

## Product Surfaces

- Primary command: `gitRefs.openRevisionGraphEditor`.
- Compatibility command: `gitRefs.openRevisionGraph`.
- Primary graph view type: `gitRefs.revisionGraphEditorPanel`.
- Compare Results view type: `gitRefs.compareResultsView`.
- Show Log view type: `gitRefs.showLogView`.
- Contributed command palette actions include compare refs, compare with worktree, checkout, merge, and open graph.
- The primary Activity Bar graph and Source Control companion graph view are historical and should not be treated as active product surfaces.

## Data Flow

1. VS Code activates the extension through contributed commands.
2. The extension obtains the built-in Git API and reads workspace repositories.
3. The revision graph resolves an active repository or asks the user to choose one.
4. Graph/history data is loaded with the Git API plus targeted `git log`, `git diff`, and `git show` calls where the public API is insufficient.
5. The extension builds graph snapshots, projections, layout, and webview state.
6. The editor webview renders the graph and posts validated action messages back to the extension.
7. Native VS Code UI handles picks, confirmations, diffs, Source Control reveal, notifications, and editor panels.
8. Repository changes and completed mutations refresh or reproject visible state according to the current snapshot and invalidation boundary.

## Flow Governance Phase 1 Architecture

Phase 1 of Flow Governance adds a non-mutating semantic overlay for branch classification, a single Flow Governance toggle, branch-kind badges, and unknown-branch feedback. It does not add branch visibility filters, production trunk highlighting, hidden `sync/*` treatment, PR automation, branch creation forms, governed merge policy, release promotion checks, cleanup actions, provider authentication, or Git mutations other than explicit creation/update of the repository-versioned flow configuration file after confirmation.

### Phase 1 Modules

Phase 1 should use a small `src/revisionGraph/flow/` module set. Later-phase modules must not be introduced until their owning phase enters active scope.

- `flowTypes.ts`: serializable Phase 1 contracts for branch kinds, normalized config, branch metadata, diagnostics, and view-state payloads.
- `flowDefaults.ts`: default branch kinds, main branch names, regex patterns, and default enablement.
- `flowConfig.ts`: repository flow-file loading, VS Code settings fallback, source precedence, validation, normalization, and default file content generation.
- `flowBranchClassifier.ts`: deterministic branch classification from normalized config, including main-branch precedence and `unknown` fallback.
- `flowDiagnostics.ts`: Phase 1 diagnostics only, limited to invalid configuration reporting and unknown-branch metadata.
- `flowDecorations.ts`: mapping from branch metadata to compact view-model decorations consumed by the existing webview.
- `flowState.ts`: host-side Flow Governance enable/disable state transitions.

Phase 1 must not add `flowBranchCreation.ts`, `flowTransitionPolicy.ts`, `flowPromotionChecks.ts`, `flowGithubPullRequests.ts`, `flowCleanupCandidates.ts`, or `flowSyncPlan.ts` unless the focused feature artifact explicitly expands scope with maintainer approval.

### Configuration Boundary

- Repository-versioned `.git-revision-graph-flow.json` is the authoritative source when present and valid.
- Workspace settings and user settings are fallback inputs only. A repository flow file is not deep-merged with settings.
- Configuration is resolved per active repository and must follow repository switching, repository closure, zero-repository state, and multi-root semantics owned by `RevisionGraphRepositoryLifecycle`.
- Invalid repository configuration disables Flow Governance for that repository and reports a recoverable validation result without breaking normal graph loading.
- Phase 1 generated flow files contain only supported Phase 1 fields.
- Future-phase fields may be parsed for preservation/reporting, but they are inert and cannot affect classification, visibility, actions, provider authentication, or Git mutation paths.

Expected Phase 1 settings, if contributed, are:

- `gitRevisionGraph.flowGovernance.enabled`
- `gitRevisionGraph.flowGovernance.configPath`

Any contributed settings, schema files, commands, menus, activation events, README text, and tests must be listed in the focused Phase 1 build artifact before coding starts.

### Data Flow

1. The revision graph resolves the active repository through the existing repository lifecycle.
2. Flow configuration is loaded for that repository from the selected source and normalized against Phase 1 defaults.
3. Graph snapshot loading remains owned by the existing backend and projection pipeline.
4. Branch refs in the ready graph state are classified by host/shared model code using the normalized Flow Governance config.
5. Flow metadata and Phase 1 diagnostics are attached to serializable graph view-state data without changing commit ancestry, ref identity, projection edges, compressed `through` paths, or layout ownership.
6. The existing webview renders the Flow Governance toggle and branch-kind badges from supplied metadata.
7. Webview messages express user intent only: toggle Flow Governance on or off.
8. Host-side message validation and authorization accept only well-formed Flow View messages for the current repository/state and ignore or reject stale or malformed payloads.

Flow metadata is an overlay. It must not be modeled as a Git ref mutation or as a substitute for the existing projection/focus modes.

### Integration Boundaries

- `RevisionGraphController` remains the public owner of the graph webview surface and should orchestrate Flow Governance only by calling focused flow helpers. It must not absorb classification, config validation, or decoration rules inline.
- `RevisionGraphRepositoryLifecycle` remains the only repository lifecycle coordinator. Flow Governance must subscribe through controller/lifecycle integration points and must not add an independent repository tracker.
- `RevisionGraphBackend` and `backendServices/*` remain responsible for Git data loading. Phase 1 Flow Governance must not add Git CLI calls for classification.
- `src/revisionGraph/model/*` and serializable view-state contracts own host/webview type boundaries. Flow metadata types must be JSON-serializable and must not import Git parsing modules into webview shared contracts.
- `messageValidation.ts` remains responsible for payload shape, while `messageAuthorization.ts` remains responsible for state/current-repository authorization. New Flow View messages must be covered in both places.
- `src/revisionGraph/webview/script/*` may render metadata and maintain UI-local presentation state, but it must not infer branch governance from names, evaluate policy, read config, authenticate providers, or perform Git mutations.
- `workbenchRefActionServices` and `refActions` are unchanged in Phase 1 except for regression coverage. Governance-specific branch creation, PR, merge, sync, and cleanup workflows are later-phase concerns.

### View State And Messages

Phase 1 view-state additions should be grouped under a single optional Flow Governance property on the ready graph state, for example:

```ts
type FlowGovernanceViewState = {
  enabled: boolean;
  configSource: 'repository' | 'workspace' | 'user' | 'defaults' | 'invalid' | 'disabled';
  diagnostics: readonly FlowDiagnostic[];
  branchKinds: readonly FlowBranchKind[];
  references: readonly FlowReferenceMetadata[];
};
```

The exact type names are implementation details, but the contract must remain:

- serializable;
- scoped to the current repository;
- absent or disabled when Flow Governance is off;
- deterministic for tests;
- independent from Git mutation services;
- compatible with disabled behavior that preserves the current graph output.

New messages should be limited to Flow View state changes. They must not carry arbitrary regex strings, raw config file contents, provider tokens, or Git operation requests.

### Phase 1 Non-Goals

- No new Activity Bar view, diagnostics panel, or diagnostics editor.
- No PR creation, provider authentication, release promotion validation, transition policy enforcement, equalization assistant, cleanup assistant, or governed branch creation forms.
- No direct governed merge blocking or warning behavior in Phase 1.
- No automatic push, pull, checkout, branch, tag, stash, reset, merge, delete, or remote mutation.
- No unbounded graph loading or full-history claim.
- No runtime dependency addition without explicit approval.

### Phase 1 Verification

Required automated gates:

- `npm run build`
- `npm test`
- `git diff --check`

Focused verification must cover:

- config validation and normalization for defaults, repository file, workspace fallback, user fallback, invalid schema version, invalid regex, inert future fields, and generated default file content;
- branch classification for every Phase 1 branch kind, main precedence, deterministic pattern order, custom patterns, and unknown fallback;
- repository lifecycle compatibility for zero repositories, repository switching, repository close/open, multi-root independence, and refresh after active repository changes;
- message validation and authorization for all new Flow View messages, malformed payloads, stale repository state, loading state, and disabled Flow Governance;
- type-boundary/import-cycle regression across graph Git parsing, graph model, view-state contracts, and webview shared code;
- graph fidelity fixtures proving Flow metadata does not alter ancestry, visible branch/remote/tag/stash anchors, hidden merge continuity, or compressed edge `through` paths;
- webview rendering or shell checks for badges, no control overlap, theme compatibility, and accessible labels/tooltips.

Manual Extension Development Host smoke for Phase 1 must cover graph load, repository switching, Flow Governance on/off, refresh, invalid config, empty repository state, disabled behavior, all branch refs remaining visible, and existing compare/diff/log/context-menu basics.

## Flow Governance 2.0.0 Architecture Direction

Flow Governance 2.0.0 should build on the completed Phase 1 metadata overlay and add operational governance value before release. The target architecture keeps classification, policy, diagnostics, promotion checks, PR handoff, and sync planning in focused flow modules while preserving the existing revision graph controller, repository lifecycle, backend, and native workbench action boundaries.

2.0.0 must not reintroduce branch visibility filters, branch-type visibility checkboxes, hidden `sync/*` treatment, or webview-side branch governance inference. All branch refs included by the current graph projection remain visible. Flow Governance adds classification, diagnostics, readiness results, and guided actions over the graph.

### 2.0.0 Candidate Modules

- `flowTransitionPolicy.ts`: pure governed source/target transition matching and direct-merge policy outcomes.
- `flowPromotionChecks.ts`: release promotion ancestry validation with `ready`, `blocked`, and `inconclusive` results.
- `flowDiagnostics.ts`: expanded governance diagnostics built from host-side classification, transition policy, and readiness results.
- `flowPullRequestContext.ts`: provider-neutral PR title/body/context and recognized hosted-provider
  URL generation without requiring authentication, backed by `hostedGitRemote.ts` and the focused
  provider adapter registry.
- `flowPullRequestPreflight.ts`: provider-aligned remote-source existence and exact-tip verification before PR handoff, with fail-closed publication states.
- `flowSyncPlan.ts`: production-to-release equalization planning, sync branch naming, precondition checks, and no-push handoff metadata.
- `aiTextAssistant.ts`, `aiTextDocumentContext.ts`, `aiTextPromptFitting.ts`, and `aiTextWorkflow.ts`:
  bounded prompt/output policy, allowlisted project-document diff context, per-model token fitting,
  explicit request lifecycle, transient host-owned PR context, cancellation, and stale-response
  rejection for PR/release text.

Provider API PR creation, cleanup candidates, provider authentication, and persistent diagnostics
panels remain outside the initial 2.0.0 architecture unless a focused feature artifact explicitly
expands them.

### 2.0.0 Integration Boundaries

- Transition policy and release readiness must be deterministic host-side logic with unit coverage before webview wiring.
- The webview may display diagnostics and dispatch explicit user intents, but it must not evaluate branch policy, read configuration, call provider APIs, or perform Git operations.
- Release readiness may use targeted Git ancestry checks where the public Git API is insufficient, and must report missing refs or command errors as inconclusive rather than ready or blocked.
- PR handoff should work without provider authentication first by copying PR context or opening recognized compare/PR URLs.
- Optional AI text improvement must start only from a field-level user action. The webview sends bounded
  visible field values, the host may load only allowlisted project-document changes for PR descriptions,
  and then invokes the workbench language-model adapter. Only the matching current form may accept the
  result; PR copy and provider URL handoff consume the validated, reviewed context.
- PR handoff must verify that the selected source exists at the same commit on the handoff remote. Missing or locally-ahead sources may be published/pushed only after explicit confirmation; remote-ahead and divergent sources fail closed, and force push is never offered.
- Equalization may create a local `sync/*` branch and merge production only after explicit confirmation and only when existing clean-worktree/conflict guards pass. It must never push automatically and must never perform the final governed merge into `release/*`.

## Architectural Constraints

- Prefer `vscode.git` for repository state, refs, checkout, merge, pull, push, and file content.
- Keep Git CLI usage targeted to graph/history/textual data or workflows not exposed by the public Git API.
- Keep activation lightweight and command-driven.
- Preserve multi-repository behavior and zero-repository handling.
- Preserve conflict guards before workspace-changing operations.
- Preserve bounded graph loading rather than claiming unbounded full-history coverage.
- Preserve the current split between graph backend, projection/layout, controller orchestration, webview presentation, workbench adapters, and testable ref actions.
- Preserve the extracted repository lifecycle, backend service, message authorization, and graph model/type boundaries introduced in the `1.5.6` architecture baseline.
- Require explicit approval for runtime dependency changes, contribution-surface changes, publishing, or version bumps.

## Current Decisions

- The Source Control-launched editor graph is the single primary graph workspace.
- Compare Results and Show Log remain on-demand editor panels, not persistent Activity Bar views.
- Focus Range and Focus Descendants are mutually exclusive projection modes over the loaded snapshot.
- Descendant focus is based on Git ancestry in the loaded DAG, not visual row, timestamp, or screen position.
- Projection-only refresh is acceptable only when the loaded snapshot remains compatible and mutable refs/HEAD metadata are reapplied before delivery.
- Layout and viewport optimizations must retain complete in-memory scene data for minimap, search, selection, navigation, and context menus while mounting only the visible DOM window.
- Flow Governance Phase 1 is a metadata overlay over the loaded graph. It must not hide branch refs or change Git data, commit ancestry, projection edge semantics, or existing Git workflows.
- Flow Governance 2.0.0 is not releasable as badges alone; it should add PR-required diagnostics, release readiness, PR handoff, and safe equalization guidance before publication.
- AI-assisted PR/release authoring is advisory and transient: deterministic defaults remain available,
  model output never performs Git operations, and closing/changing forms or repositories cancels it.
- Promotion PR handoff from a release or hotfix to the configured production branch must fail closed unless the local production ref exactly matches the current remote production tip and that tip is an ancestor of the source. These guards are rechecked before opening the provider URL so stale local governance state or incompatible promotion sources cannot bypass current production.
- Governed branch creation may offer immediate publication only after the local branch and its metadata are successfully created. Publication requires explicit confirmation, uses a normal Git API push with upstream tracking, and must leave the local branch intact when declined, canceled, unavailable, or failed.
- Release and feature history should be archived once completed; durable conclusions should be promoted into this SAD or the PRD.

## Quality Attributes

- Native VS Code ergonomics and theme compatibility.
- Predictable cancellation and stale-response guards.
- Safe Git mutation UX with confirmations and conflict handling.
- Deterministic tests for pure logic, graph state shaping, message validation, and workflow boundaries.
- Manual Extension Development Host validation for real VS Code/Git integration paths.
- Marketplace readiness tracked separately from implementation completion.

## Security And Privacy

- Do not store tokens, Marketplace credentials, private repository data, or user-specific Git data in project artifacts.
- Treat remote and destructive Git operations as high-friction actions requiring clear confirmation and recoverable failure behavior.
- Keep webview message validation strict and local-resource roots constrained.

## Verification Strategy

- Required after meaningful changes: `npm run build`.
- Required for behavior, command, controller, graph, Git workflow, or webview changes: `npm test`.
- Recommended before release: Extension Development Host smoke testing against a real Git repository, including graph load, repository switching, focus modes, compare, diff, checkout, branch/tag, sync, merge/conflict, delete, reset/stash, Show Log, and Compare Results.
- Packaging and publication commands require explicit maintainer approval.

## Sources

- `package.json`
- `README.md`
- `.codex/skills/vscode-extension-developer/references/project-map.md`
- `project-context/1.define/prd.md`
- `project-context/docs/git-revision-graph-flow-governance-frd.md`
- `project-context/2.build/features/1.5.6-architecture-risk-reduction.md`
- `project-context/docs/product-evolution-roadmap.md`
- `project-context/docs/revision-graph-parity-plan.md`
