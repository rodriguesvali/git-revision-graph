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
- Current package baseline on 2026-05-02: `0.0.27`.
- Current release readiness state: `0.0.27` source readiness, version bump, VSIX packaging, and Marketplace publishing are complete; future packaging and publishing require explicit human approval.
- Candidate next release: `0.0.28`.
- Approved direction from user: define graph cache architecture improvements.
- Recommended anchor: split immutable commit DAG/history data from mutable ref/HEAD overlays so refreshes can reuse loaded history while applying repository metadata changes safely.
- Define artifact: `docs/release-0.0.28-prioritization.md`.
- Candidate feature artifact: `project-context/2.build/features/0.0.28-graph-cache-architecture.md`.

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
