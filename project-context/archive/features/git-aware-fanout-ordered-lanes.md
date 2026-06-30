# Git-aware Fan-out Ordered Lanes

## Goal

Reduce zig-zag lane changes around visible DAG bifurcations by assigning branch lanes at the fork point before downstream continuity rules run.

## Scope

- Add a lane pass after version-family continuity and before dominant succession continuity.
- Detect visible parents with multiple visible descendants.
- Leave structural parents to the existing structural barycenter pass.
- Keep a non-mainline parent successor on the parent lane, then distribute competing non-mainline descendants around it.
- Distribute multiple non-mainline descendants from a mainline parent around the mainline lane.
- Prefer parent-edge order, existing lane continuity, subtree size, ref priority, row order, lane order, and hash order for stable fan-out choices.
- Prefer the ancestor-side row when dominant succession lane counts tie so the fan-out decision propagates down the successor chain.
- Move the layout cache namespace to `git-aware-v11`. Later merge fan-in ordering moved the active namespace to `git-aware-v12`.

## Acceptance

- A fork with competing non-mainline descendants keeps the primary successor lane stable.
- The lateral descendant starts on a distinct nearby lane and its own successor inherits that lane.
- Later merge fan-in ordering made first-parent merge children preferred when a fan-out parent has competing descendants.
- Existing version-family, dominant succession, row-proximity, structural barycenter, and layer barycenter behavior remains covered.

## Verification

- Passed: `npm run build`
- Passed: `npm test` (310 tests)
- Passed: `git diff --check`
