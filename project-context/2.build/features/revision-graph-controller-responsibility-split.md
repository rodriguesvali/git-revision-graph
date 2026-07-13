# Revision Graph Controller Responsibility Split

## Goal

Reduce the responsibility concentration in `RevisionGraphController` without replacing the established extension architecture.

## Scope

- Extract Flow Governance Pull Request orchestration into a dedicated workflow.
- Move target eligibility, production synchronization checks, source publication, context construction, clipboard, and URL opening out of the controller.
- Keep repository selection, graph rendering, message dispatch, and webview lifecycle in the controller.
- Preserve existing message-handler contracts through delegation.

## Acceptance Criteria

- `RevisionGraphController` no longer imports Pull Request eligibility, publication, GitHub URL, or context helpers.
- The controller delegates its three Flow Pull Request message actions through a narrow workflow host.
- The workflow retains guarded repository mutations and native VS Code UI behavior.
- Controller orchestration and workflow clipboard behavior have direct contract coverage.
- Build and tests pass.

## Architecture Result

The controller shrinks from 1,167 lines to approximately 912 lines. Pull Request behavior is owned by `RevisionGraphFlowPullRequestWorkflow`, while the controller remains the composition root for the revision graph surface.

## Risk

The workflow still coordinates several Flow Governance policies, but those dependencies are now cohesive around one user capability and can evolve independently from graph rendering and repository lifecycle code.
