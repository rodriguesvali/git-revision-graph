# Git-aware Dominant Succession Continuity

## Goal

Keep the principal DAG succession on a stable lane: a descendant should continue above its visible ancestor unless that ancestor has multiple visible descendants that need horizontal distribution.

## Scope

- Replace the strictly linear continuity lane pass with a dominant succession pass.
- For each visible child, choose at most one eligible visible parent as the dominant predecessor.
- Treat a parent as eligible only when it has exactly one visible child.
- Prefer first-parent edge order, then existing lane continuity, row proximity, ref priority, and stable hash order.
- Preserve mainline lane ownership while allowing non-mainline nodes to follow a mainline-anchored succession component.
- Move the layout cache namespace to `git-aware-v10`. Later fan-out ordering moved the active namespace to `git-aware-v11`.

## Acceptance

- Simple linear non-mainline chains remain on stable lanes.
- A merge child can continue on its dominant parent lane even when it has another visible parent.
- Parents with multiple visible descendants do not pull every descendant into the same lane.
- Later fan-out ordering made tie-breaking prefer the ancestor-side row when lane counts are equal, so explicit fan-out lane decisions propagate to simple successor chains.
- Existing version-family, row-proximity, structural barycenter, and layer barycenter behavior remains covered.

## Verification

- Passed: `npm run build`
- Passed: `npm test` (309 tests)
- Passed: `git diff --check`
