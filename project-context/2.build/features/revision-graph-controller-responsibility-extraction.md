# Revision Graph Controller Responsibility Extraction

Status: Implemented
Target version: `2.0.0`

## Goal

Keep `RevisionGraphController` focused on webview lifecycle, repository coordination, rendering, and
composition by moving feature-specific application workflows behind explicit collaborators.

## Scope

- Move Flow Governance settings, option persistence, branch creation, equalization, and Pull Request
  handoff orchestration into `RevisionGraphFlowGovernanceWorkflow`.
- Move remote-tag request snapshots and stale-response protection into
  `RevisionGraphRemoteTagStatePublisher`.
- Keep existing lower-level Flow Governance and remote-tag workflows unchanged.
- Preserve the message-handler host contract through controller delegation.

## Acceptance Criteria

- The controller no longer owns Flow Governance persistence or mutation methods.
- The controller no longer implements remote-tag response currency checks.
- Flow Governance continues using the shared repository mutation coordinator.
- Remote-tag responses remain scoped to both repository and state identity.
- No commands, messages, settings, contribution points, dependencies, or user-visible behavior change.

## Verification

- Focused remote-tag publisher tests cover current and stale responses.
- Existing Flow Governance, message-handler, controller, and remote-tag workflow tests remain green.
- `npm run build`: passed through the full test command on 2026-07-13.
- `npm test`: passed with 679 tests on 2026-07-13.
- `git diff --check`: passed on 2026-07-13.
- `graphify update .`: completed on 2026-07-13.
