# Source Control Integration Viability

## Context
The current product is `Git Revision Graph` version `0.0.30` from `package.json`. It focuses on visualizing Git references and revision topology in a dedicated VS Code Activity Bar container, with compare, checkout, branch, merge, sync, delete, diff, and log workflows around that graph.

The evaluated direction is inspired by Git Graph: make the graph feel more like part of VS Code Source Control and support opening the graph in the editor area as an internal tab.

## Product Question
Can `Git Revision Graph` evolve from a dedicated reference graph surface into a Source Control-adjacent experience without losing its focused product identity?

## Recommendation
Proceed incrementally. The direction is viable if framed as better VS Code workbench placement and discoverability, not as a full replacement for VS Code's built-in Git UI.

Recommended product direction:

1. Add an optional `Graph` view under the built-in Source Control container (`scm`) while keeping the existing Activity Bar container.
2. Add an `Open Git Revision Graph in Editor` command backed by a `WebviewPanel`, reusing the current graph controller/backend where practical.
3. After telemetry-free manual validation and user feedback, decide whether the dedicated Activity Bar container should remain the primary surface or become secondary.

Avoid implementing a custom SCM Provider for now. The product already depends on the built-in `vscode.git` extension and should continue to let VS Code own changes, staging, commits, conflict resolution, and repository state. A custom SCM Provider would increase user confusion and technical risk while duplicating native Git behavior.

## Existing Fit
The current architecture is already close to this direction:

- `package.json` declares the extension under `SCM Providers`.
- The extension depends on `vscode.git`.
- The graph is a `WebviewViewProvider`, which can be contributed to a view container.
- Existing workflows already reveal Source Control for conflict recovery.
- Compare and diff flows already use native VS Code editors.
- Multi-repository selection and empty states are already first-class concerns.

The main gap is placement. The current graph lives in a custom `gitRefs` Activity Bar container rather than inside the built-in Source Control container or editor area.

## Viability By Option

### Option A: Contribute Graph View To Source Control
Feasibility: high.

VS Code supports contributing extension views to existing containers such as Source Control through `contributes.views`. The current `WebviewViewProvider` model maps well to this.

Likely changes:

- Add a second contributed view entry under `contributes.views.scm`.
- Register a second webview view provider or refactor the current provider so one controller instance is not incorrectly shared between two simultaneous webview views.
- Add settings or context controls to avoid clutter if both the dedicated Activity Bar view and Source Control view exist.
- Update README, screenshots, and manual validation paths.

Product value:

- Higher discoverability for users who live in Source Control.
- Lower cognitive distance between graph state and working tree state.
- Better alignment with conflict recovery and commit workflows.

Risks:

- Source Control is already dense; a large graph can overwhelm the side bar.
- Webview sizing in the Source Control side bar may be worse than the dedicated container.
- If both views exist, state synchronization must be exact.

Suggested acceptance criteria:

- The graph appears under Source Control without replacing native Changes, Staged Changes, or branch controls.
- The graph still handles zero-repository and multi-repository workspaces.
- Refresh, fetch, repository selection, compare, diff, checkout, branch, merge, sync, delete, and log flows behave the same from both placements.
- Hiding or moving one view does not break the other.

### Option B: Open Graph In Editor Area
Feasibility: medium-high.

VS Code supports editor-area webviews through `vscode.window.createWebviewPanel`. This is the closest match to Git Graph's internal tab experience.

Likely changes:

- Add a command such as `gitRefs.openRevisionGraphEditor`.
- Create a `WebviewPanel` surface with singleton reveal behavior.
- Extract shared graph webview/controller behavior so the current `WebviewViewProvider` and the new editor panel can reuse the same backend, message handling, HTML shell, and refresh logic.
- Decide whether the editor panel should have independent view state or mirror the side-bar graph state.

Product value:

- Gives the graph enough horizontal space for serious inspection.
- Makes the product feel more like a first-class workbench document.
- Preserves the existing Activity Bar or Source Control view as a compact launcher/status surface.

Risks:

- Current controller is view-oriented and stores one active `WebviewView`; sharing it naively with a `WebviewPanel` would create lifecycle bugs.
- Editor tabs need clearer state restoration behavior after reloads.
- Large graph rendering in an always-open editor may increase memory and refresh pressure.

Suggested acceptance criteria:

- `Open Git Revision Graph` can reveal an existing editor tab instead of creating duplicates.
- The editor tab refreshes on repository state changes and supports the same core actions as the existing graph.
- Closing the editor tab does not dispose or corrupt the side-bar view.
- Webview resource loading remains compatible with remote/devcontainer workspaces.

### Option C: Become A Full Source Control Provider
Feasibility: low for current goals.

VS Code's SCM API is intended for source control providers that own resource groups, changes, input boxes, status, and commands. This product does not need to replace the built-in Git provider.

Product value:

- Low, unless the strategic goal changes from graph visualization to an alternative Git client.

Risks:

- Duplicates native Git behavior.
- Increases Marketplace support burden.
- Could confuse users by presenting a second Git provider for the same repository.
- Would move the product away from the approved lightweight graph-first scope.

Recommendation:

- Do not pursue unless there is a separate approved product strategy to become a full Git client.

## Suggested Roadmap

### Phase 1: Source Control Companion View
Scope:

- Add an optional compact graph view inside the built-in Source Control container.
- Keep the dedicated Activity Bar graph as the stable primary surface.
- Use the Source Control view as discovery and quick navigation.

Validation:

- `npm run build`
- `npm test`
- Extension Development Host smoke test with one repository, multiple repositories, and no repository.
- Manual layout check in left side bar, right side bar, and moved view containers.

### Phase 2: Editor Graph Panel
Scope:

- Add an editor-area `WebviewPanel` command for the full graph.
- Reuse graph rendering and actions, but isolate webview lifecycle from the side-bar view.
- Make the Source Control view or Activity Bar view able to launch the editor graph.

Validation:

- Verify singleton reveal behavior.
- Verify side-bar and editor surfaces can be opened, closed, and refreshed independently.
- Verify compare and diff flows still open native VS Code diff editors.

### Phase 3: Product Surface Decision
Scope:

- Decide based on usage feedback whether the dedicated Activity Bar container remains primary, becomes optional, or is reduced to a launcher.
- Update Marketplace messaging and screenshots around the chosen positioning.

Validation:

- Manual Marketplace readiness review.
- README and changelog update.
- Packaging only after explicit maintainer approval.

## Marketplace Positioning
Recommended positioning:

> A focused Git revision graph that lives naturally beside VS Code Source Control and opens as a full workbench graph when you need more space.

This preserves the product's distinction from Git Graph: the extension remains graph/reference-first, not a broad Git client clone.

## Open Questions
- Should the Source Control placement be enabled by default, or gated by a setting/context while it matures?
- Should the editor graph mirror the same selected repository as the side-bar graph, or maintain independent repository selection?
- Should `Open Git Revision Graph` change behavior to open the editor panel, while a separate command focuses the side-bar view?
- Should the dedicated Activity Bar container remain visible after Source Control integration ships?
- What screenshot and README changes would best explain the two-surface model without making the product look heavier than it is?

## Sources
- `package.json`
- `README.md`
- `src/extension.ts`
- `src/revisionGraphPanel.ts`
- `src/revisionGraph/controller.ts`
- `src/viewLayout.ts`
- `.codex/skills/vscode-extension-developer/references/project-map.md`
- VS Code Extension API documentation for `contributes.views`, `WebviewViewProvider`, and `createWebviewPanel`
