# Orchestration Contract Tests

## Goal

Cover the extension-host orchestration layer that was previously exercised only through helper and workflow tests.

## Scope

- Exercise `CompareResultsViewProvider` panel reuse, disposal, recreation, and repository-close handling.
- Exercise `ShowLogViewProvider` with the same lifecycle contract around asynchronous log loading.
- Exercise `RevisionGraphController` empty-state presentation and Git subscription disposal.
- Use a narrow VS Code mock rather than exposing production internals for testing.

## Acceptance Criteria

- Repeated provider requests reuse an active panel.
- Disposed panels are recreated on the next request.
- Closing the owning repository disposes dependent panels.
- The revision graph controller posts an empty-state update with no repositories.
- Controller disposal releases Git repository event subscriptions.
- Build and tests pass.

## Risk

The mock intentionally covers only APIs reached by these contracts. Changes that introduce new extension-host dependencies will make the contract test fail until the harness is updated, providing an explicit signal of increased orchestration coupling.
