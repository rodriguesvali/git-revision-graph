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

- [x] Bisect Commit follow-up: pin the actual checkout in the graph, render a
  highlighted visual reference, normalize inspection actions to its hash and
  center changes without repeated viewport jumps. Reproduce with bounded Git
  history and scope/focus filters; verify movement and session-end removal.

- [x] Viewport regression: reproduce distant bisect/commit centering without
  native scroll events and explicitly schedule virtual rendering after viewport
  changes settle. Verify queued-frame behavior and a wide/tall Chromium fixture.

- [x] Repeated bisect layouts: use the verified test commit as the graph's HEAD
  anchor, including unchanged hashes and successive updates; retain manual
  scrolling on stable updates. Verify with queued frames and Angular graph data.

- [x] Compact bisect controls: implement the approved Minimize / Expand flow,
  ready-only classification, progress/errors, neutral focus and one-time result
  reveal; verify guarded progression, keyboard navigation and responsive layout.
