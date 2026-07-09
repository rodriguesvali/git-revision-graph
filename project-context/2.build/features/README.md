# Feature Build Artifacts

Status: Active
Last consolidated: 2026-07-09

Use this directory only for active or next-release feature work.

Completed feature artifacts are archived in `project-context/archive/features/`. Do not treat an archived feature artifact as current scope unless it is explicitly reopened and copied or moved back here.

## Current Active Features

- `flow-governance-2.0.0.md`: operational Flow Governance release scope.

## Published Baseline Retained For Integration

- `1.5.9-reference-tooltips.md`: published cosmetic tooltip scope now integrated into the active
  Flow Governance 2.0.0 development line.

## Required Shape

Each active feature artifact should include:

- Status
- Goal
- User workflow
- Scope
- Non-goals
- Touched surfaces
- Acceptance criteria
- Risks
- Test plan
- Manual validation
- Release-note impact
- Handoff notes

## Lifecycle

- Draft the feature here when it is approved for active definition or build work.
- Keep it concise and link to durable docs instead of duplicating them.
- When the feature is complete, promote durable product or architecture decisions into `project-context/1.define/prd.md` or `project-context/1.define/sad.md`.
- Move the completed artifact to `project-context/archive/features/`.
- Update `project-context/3.deliver/release.md` when the feature is release-bound.
