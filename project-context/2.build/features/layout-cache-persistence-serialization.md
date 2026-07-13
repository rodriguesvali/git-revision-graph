# Layout Cache Persistence Serialization

Status: Implemented
Target version: `2.0.0`

## Goal

Prevent overlapping projected graph layout-cache writes from completing out of order and leaving
older state in VS Code workspace storage.

## Scope

- Serialize persistence and clear operations through one in-memory promise queue.
- Capture each cache snapshot when persistence is requested.
- Await the final queued snapshot from the extension deactivation hook.
- Preserve the existing debounce, normalization, warning, and disposal behavior.
- Do not change contribution points, settings, dependencies, or user-visible behavior.

## Acceptance Criteria

- A second persistence request does not start its workspace-state update until the first finishes.
- A clear requested during an active persistence runs after that persistence and remains final.
- A failed update does not poison later queued operations.
- Extension deactivation waits for active writes and the latest cache snapshot.
- Existing layout-cache persistence tests and the full build/test suite pass.

## Verification

- Focused regression tests cover ordered writes, write-then-clear behavior, and queue recovery after
  a workspace-state update failure.
- `npm run build`: passed through the full test command on 2026-07-13.
- `npm test`: passed with 676 tests on 2026-07-13.
- `graphify update .`: completed after the implementation.
