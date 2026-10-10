# Implementation Plan: Guided Bug Bisect 1.7.4

The maintainer approved the feature flow on 2026-10-09, after confirming that
cleanliness applies only to the repository being tested. Implement the approved
specification at `project-context/2.build/features/1.7.4-bug-bisect-spec.md`.
Tasks are recorded in `tasks/todo.md`. No delegation or publication is authorized.

Use native `git bisect --no-checkout` for selection and built-in Git checkout for
worktree changes. Keep an owned, recoverable host session and a reservation in the
shared mutation coordinator, with short operation leases. Render controls inside
the existing graph; Show Log hands off its validated commit and repository.

Order: real-Git engine and guards → session/recovery → graph transport/dialog →
Show Log handoff → integration verification and release documentation.

Risks: external metadata changes require ownership validation; dirty worktrees
must block every checkout; partial failures retain recovery state; skip and
merge-base outcomes must never claim an exact culprit; UI hiding cannot reset Git.
Checkpoints use focused tests first, then build/full tests/quality/platform and
real minimum-version Chromium checks. Keep manual Extension Host gaps explicit.

The approved flow authorizes these implementation steps; no additional product
surface, dependencies, Git history rewriting or Marketplace action is proposed.
