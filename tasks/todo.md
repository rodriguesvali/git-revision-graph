# Guided Bug Bisect — implementation checkpoints

- [x] Native bisect engine: bounded CLI, clean/in-progress guards, first-bad,
  skip and merge-base outcomes. Verify against disposable Git repositories.
- [x] Coordinator/session: exclude conflicting mutations, pin endpoints,
  undo/retry, restore attached/detached HEAD, persist and validate ownership.
  Verify clean/stale/error/reload and independent repository cases.
- [x] Graph transport: typed validation/authorization, controller injection,
  menu entry and resumable dialog with deliberate answer controls.
  Verify malformed/stale messages and browser focus/pending/hide behavior.
- [x] Show Log handoff: single-commit action uses the visible repository and
  host-known commit. Verify routing and retain existing menu/filter behavior.
- [x] Final integration: build, full tests, quality, platform, Chromium checks,
  graph update, docs and recorded manual smoke steps.

Focused manual Extension Host smoke remains a release-readiness follow-up,
recorded in the feature artifact. It has not been reported as completed.
