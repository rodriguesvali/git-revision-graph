# Solution Architecture Document

## Context
`GIT Revision Graph` is a VS Code extension with a revision-graph webview and native workbench workflows for compare, diff, checkout, branch, sync, merge, delete, and log actions. AAMAD is applied as process architecture around this existing system.

## Architecture Overview
Keep the extension architecture intact:

- `package.json` defines the published extension surface.
- `src/extension.ts` wires activation, providers, commands, and content providers.
- Revision graph behavior is split across controller, backend, repository, source, webview shell, and browser-side scripts.
- Reference workflows live in testable action modules and VS Code workbench service adapters.
- `project-context/` tracks product, implementation, QA, and release decisions.

## Components
- Extension manifest: commands, menus, views, container, dependency on `vscode.git`, package metadata.
- Extension host orchestration: activation, command registration, repository and provider wiring.
- Git integration: public `vscode.git` API for repository state and mutations, targeted Git CLI for graph/history data.
- Webview UI: revision graph rendering, interactions, filtering, context menus, compare/log surfaces.
- Tests: TypeScript build, Node test suite, focused unit/integration-style coverage.
- AAMAD artifacts: Define, Build, Deliver, handoff, and feature-scoped notes.

## Data Flow
1. VS Code activates the extension and loads the built-in Git API.
2. The extension reads workspace repositories and refs.
3. Graph/history data is loaded through Git API and targeted Git CLI calls where needed.
4. The extension shapes state for the webview and listens for repository changes.
5. User actions flow from webview or Command Palette to extension host handlers.
6. Native VS Code UI and Git operations complete workflows, then refresh visible state.

## Interfaces
- VS Code extension API.
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

## Risks
- Manifest and command registrations can drift without explicit checks.
- Webview state bugs can be hard to catch through automated tests alone.
- Release packaging can ship stale README or contribution metadata if Deliver checks are skipped.

## Verification Strategy
- Required after meaningful changes: `npm run build`.
- Required for behavior, command, graph, controller, or workflow changes: `npm test`.
- Recommended before release: install generated VSIX in an Extension Development Host or clean VS Code profile and exercise graph loading, repository switching, compare, diff, checkout, branch, sync, merge, delete, and log flows as applicable.

## Sources
- `package.json`
- `README.md`
- `.codex/skills/vscode-extension-developer/references/project-map.md`
- `docs/revision-graph-parity-plan.md`

## Assumptions
- Current package baseline is read from `package.json`; release readiness state is tracked in `project-context/3.deliver/release.md`.
- New features will continue to use the existing extension host plus webview architecture unless explicitly approved otherwise.

## Open Questions
- Which graph parity gaps should be prioritized after the current release baseline?
- Should release validation include a fixed sample repository fixture for manual testing?
