# Source Control Integration Viability

## Status
Decision implemented for the `0.0.31` release candidate.

The incremental evaluation is complete. Phase 1 proved a Source Control companion view was technically viable, Phase 2 added the editor graph panel, and Phase 3 selected the final product surface for release: launch from Source Control and render the graph in a singleton editor panel. The temporary companion graph and old dedicated graph Activity Bar contribution are not part of the final `0.0.31` release surface.

## Context
The current package baseline is `Git Revision Graph` version `0.0.30` from `package.json`; the target release is `0.0.31`.

The evaluated direction was inspired by Git Graph: make the graph feel more like part of VS Code Source Control and support opening the graph in the editor area as an internal tab.

## Product Question
Can `Git Revision Graph` evolve from a dedicated reference graph surface into a Source Control-adjacent experience without losing its focused product identity?

## Implemented Recommendation
Proceeding incrementally was viable, but the release decision is narrower than keeping every explored surface.

Implemented product direction for `0.0.31`:

1. Use Source Control toolbar access as the primary graph entry point.
2. Open or reveal `Git Revision Graph` in a full-size editor `WebviewPanel`.
3. Keep Compare Results and Show Log as on-demand secondary review views.
4. Remove the dedicated graph Activity Bar contribution and the Source Control companion graph contribution from the shipped surface.

Avoid implementing a custom SCM Provider for now. The product already depends on the built-in `vscode.git` extension and should continue to let VS Code own changes, staging, commits, conflict resolution, and repository state. A custom SCM Provider would increase user confusion and technical risk while duplicating native Git behavior.

## Existing Fit
The current architecture is already close to this direction:

- `package.json` declares the extension under `SCM Providers`.
- The extension depends on `vscode.git`.
- The graph is a `WebviewViewProvider`, which can be contributed to a view container.
- Existing workflows already reveal Source Control for conflict recovery.
- Compare and diff flows already use native VS Code editors.
- Multi-repository selection and empty states are already first-class concerns.

The main gap was placement. The release implementation resolves it by moving graph launch to Source Control and graph work into the editor area.

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

## Roadmap Outcome

### Phase 1: Source Control Companion View
Outcome:

- Implemented as a technical/product spike.
- Superseded by Phase 3 and not shipped as the final `0.0.31` graph surface.
- Kept as historical evidence that the extension can contribute to Source Control when a future compact view is explicitly desired.

Validation performed:

- `npm run build`
- `npm test`

### Phase 2: Editor Graph Panel
Outcome:

- Implemented as the preferred graph workspace.
- Source Control toolbar access opens or reveals a singleton editor graph panel.
- Existing graph rendering and actions are reused through the generalized controller host.

Validation performed:

- `npm run build`
- `npm test`
- `git diff --check`

### Phase 3: Product Surface Decision
Outcome:

- Implemented for the `0.0.31` release candidate.
- Removed duplicate graph side-bar placements.
- Kept on-demand Compare Results and Show Log review containers with explicit labels.
- Updated release documentation and README for the final surface.

Validation required before packaging:

- Manual Marketplace readiness review.
- Extension Development Host smoke validation of Source Control launch, editor panel lifecycle, secondary review views, zero-repository state, and multi-repository selection.
- README and changelog review.
- Packaging only after explicit maintainer approval.

## Marketplace Positioning
Recommended positioning:

> A focused Git revision graph that lives naturally beside VS Code Source Control and opens as a full workbench graph when you need more space.

This preserves the product's distinction from Git Graph: the extension remains graph/reference-first, not a broad Git client clone.

## Open Questions
- Should Marketplace screenshots be refreshed before `0.0.31` publication?
- Should release copy explicitly call out that the old graph Activity Bar entry moved to Source Control/editor usage?
- Should Compare Results and Show Log become editor-panel surfaces in a later release, or remain Activity Bar review containers?

## Sources
- `package.json`
- `README.md`
- `src/extension.ts`
- `src/revisionGraphPanel.ts`
- `src/revisionGraph/controller.ts`
- `src/viewLayout.ts`
- `.codex/skills/vscode-extension-developer/references/project-map.md`
- VS Code Extension API documentation for `contributes.views`, `WebviewViewProvider`, and `createWebviewPanel`
