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
- Release-bound work must update `project-context/3.deliver/release.md`.

## Acceptance Criteria
- AAMAD artifacts identify the current baseline from `package.json` and release readiness state from `project-context/3.deliver/release.md`.
- Feature work has a corresponding artifact under `project-context/2.build/features/` or a justified note in the relevant build area file.
- Verification commands are recorded for each meaningful change.
- Release work cannot proceed to publish or version bump without explicit human approval.

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
- What is the exact feature list for the next release?
- What manual validation matrix should be required before each Marketplace publish?
