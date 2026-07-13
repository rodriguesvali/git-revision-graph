# Revision Graph Controller Async Task Boundary

## Goal

Prevent rejected promises started by synchronous VS Code callbacks from escaping as unhandled rejections.

## Scope

- Add a reusable asynchronous task boundary.
- Preserve the existing webview message boundary API through delegation.
- Route background refreshes started by `RevisionGraphController` through one controller-level error boundary.
- Preserve `AbortError` as expected cancellation.

## Acceptance Criteria

- Repository state, repository set, action-triggered, and initial background refreshes are guarded.
- Unexpected failures clear loading state, update the graph error state, log context, and notify the user.
- Failures while reporting an error are contained.
- Existing webview boundary behavior remains unchanged.
- Build and automated tests pass.

## Risks and Mitigations

- Repeated repository failures could create repeated notifications. Normal render failures remain handled by the render coordinator; the new notification applies only to failures escaping that path.
- Cancellation must remain silent. The shared boundary explicitly ignores `AbortError`.
