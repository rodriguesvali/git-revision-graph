# Source Control Companion View Define

## Status
Draft for Phase 1.

## Product Goal
Make `Git Revision Graph` feel naturally available from VS Code Source Control while preserving the current dedicated graph experience as the stable primary surface.

## Problem
Users who already work from the Source Control activity often need to inspect branch/reference topology before committing, syncing, merging, deleting, or reviewing changes. Today the graph is available through its own Activity Bar container, which keeps the product focused but requires users to leave the native Source Control context.

The product opportunity is to make the graph discoverable beside native Git changes without replacing VS Code's built-in Git provider or turning the extension into a broader Git client.

## Users
- VS Code users who primarily navigate Git state through the built-in Source Control view.
- Existing `Git Revision Graph` users who want a faster path from working tree state to revision topology.
- Maintainers who need a low-risk first step toward deeper workbench integration.

## Scope
Phase 1 adds a Source Control companion placement for the existing graph.

In scope:

- Contribute a `Revision Graph` webview view under the built-in Source Control container (`scm`).
- Keep the existing `Git Revision Graph` Activity Bar container and `Graph` view unchanged as the primary stable surface.
- Reuse the existing graph rendering, repository selection, refresh, fetch, compare, checkout, branch, sync, merge, delete, diff, and log workflows.
- Keep the companion view compact and compatible with Source Control side-bar constraints.
- Keep multi-repository and zero-repository behavior aligned with the existing graph.
- Keep Source Control integration additive: native Changes, Staged Changes, commit input, and Git actions remain owned by `vscode.git`.
- Update README/product docs to explain that the graph can be used from the dedicated Activity Bar view or from Source Control.

Out of scope:

- Opening the graph in an editor tab. That remains Phase 2.
- Creating a custom SCM Provider.
- Moving Compare Results or Show Log into Source Control.
- Removing or hiding the existing Activity Bar container.
- Redesigning the graph layout, graph model, cache strategy, or Git workflows.
- Adding telemetry.

## Product Decisions
- The Source Control placement should be a companion entry point, not a replacement for the existing Activity Bar view.
- The first implementation should favor low-risk reuse of the current graph behavior over a new compact graph variant.
- If VS Code supports a collapsed default for the contributed view in this placement, use it to avoid cluttering Source Control for existing users.
- The companion view should use product naming that is clear in Source Control, such as `Revision Graph`, while the extension remains branded `Git Revision Graph`.
- Any lifecycle refactor required to support multiple view instances must preserve the existing dedicated view behavior first.

## Functional Requirements
- The Source Control view contribution appears under the built-in `scm` container.
- The companion view renders the graph for the selected repository using the same data and action model as the existing graph.
- Opening the companion view does not require users to manually open the dedicated `Git Revision Graph` Activity Bar container first.
- The existing command `gitRefs.openRevisionGraph` continues to focus the current primary graph surface unless an implementation decision explicitly introduces a separate Source Control focus command.
- Repository selection works in single-repository, multi-repository, and no-repository workspaces.
- Refresh and fetch actions work from the companion view.
- Graph context menu actions continue to route through native VS Code prompts, confirmations, diffs, and Source Control reveal behavior.
- Closing, hiding, or moving the companion view does not break the dedicated graph view.

## Non-Functional Requirements
- Preserve activation safety and avoid heavy work at startup.
- Preserve theme compatibility and current webview CSP posture.
- Avoid duplicate in-flight refreshes where one visible surface can invalidate or cancel the other incorrectly.
- Keep memory and event listener ownership explicit when more than one graph surface is possible.
- Maintain compatibility with remote/devcontainer workspaces.

## Acceptance Criteria
- `package.json` contributes a graph view to the built-in Source Control container and keeps the existing `gitRefs` container contribution intact.
- Extension activation registers the provider or providers needed for both graph placements without command/view ID drift.
- In a repository workspace, the Source Control companion graph can load, refresh, fetch, select repository, and run the existing graph actions.
- In a multi-repository workspace, the companion graph prompts or preserves repository selection consistently with the dedicated graph.
- In a workspace without repositories, the companion graph shows an actionable empty state consistent with the dedicated graph.
- Opening both the dedicated graph and Source Control companion view does not corrupt selection, refresh state, repository state, or webview lifecycle.
- `Compare Results` and `Show Log` continue to appear only as their current on-demand views and are not duplicated into Source Control in Phase 1.
- README and project context are updated to describe the new placement and validation path.
- `npm run build` passes.
- `npm test` passes.

## Manual Validation
- Launch Extension Development Host.
- Open a single Git repository and expand Source Control.
- Open the Source Control `Revision Graph` companion view and confirm the graph loads.
- Use refresh, fetch, repository selection, search/filter/scope controls, and context menu actions from the companion view.
- Open the existing Activity Bar graph and confirm it still behaves as before.
- Open both graph placements and switch between them while refreshing and changing branches.
- Validate zero-repository behavior.
- Validate multi-repository selection and repository switching.
- Move the Source Control view to another container or side bar location if supported, then reload VS Code and confirm the view remains stable.

## Risks
- A single controller instance may not safely own multiple simultaneous webview views.
- Source Control side-bar width may make the graph feel cramped.
- Duplicate graph surfaces can create confusing state if they do not clearly share or isolate repository selection.
- View contribution defaults may make Source Control feel cluttered.
- Existing view-layout helpers for Graph, Compare Results, and Show Log assume the dedicated `gitRefs` view container and may need guardrails.

## Recommended Build Approach
Start with a technical spike before broad implementation:

1. Confirm the exact manifest shape for contributing a `webview` view under `contributes.views.scm`.
2. Decide whether Phase 1 should register two independent `RevisionGraphViewProvider` instances or introduce a shared service plus per-view controller.
3. Preserve the dedicated graph as the reference behavior.
4. Add focused tests around provider registration intent, visibility/context decisions, and lifecycle helpers where practical.

## Open Questions
- Should the Source Control companion view be visible by default or collapsed by default?
- Should the companion view share the exact selected repository with the dedicated graph, or keep independent selection per placement?
- Should there be a dedicated command to focus the Source Control companion graph?
- Should the Source Control companion view expose the same title actions as the dedicated graph on day one?
- How should Compare Results and Show Log focus restoration behave if the action originated from the Source Control companion view?
- Should the Marketplace screenshots show both placements in the same release, or keep the release note text-only until Phase 2?

## Sources
- `package.json`
- `README.md`
- `project-context/1.define/source-control-integration-viability.md`
- `.codex/skills/vscode-extension-developer/SKILL.md`
- `.codex/skills/vscode-extension-developer/references/project-map.md`
