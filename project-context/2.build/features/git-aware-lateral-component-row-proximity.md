# Git-aware Lateral Component Row Proximity

## Goal

Move whole lateral branch components closer to their visible fork point so a branch family starts near the bifurcation instead of floating far above it.

## Scope

- Add a post-topological row pass for connected non-mainline components.
- Shift only components with visible refs and at least two visible nodes.
- Use outgoing ancestry edges from the component to visible parents outside the component as fork anchors.
- Apply the largest safe downward shift that keeps every component descendant above every visible parent.
- Move the layout cache namespace to `git-aware-v9`. Later dominant succession continuity moved the active namespace to `git-aware-v10`.

## Acceptance

- A lateral sequence such as `v0.2.1 -> ... -> v0.2.6` starts one row above its visible fork when the fork was pushed downward by other DAG constraints.
- Internal spacing of the branch component is preserved.
- Existing isolated-ref, version-family, linear-path, structural barycenter, and layer barycenter behavior remains covered.

## Verification

- Passed: `npm run build`
- Passed: `npm test` (308 tests)
- Passed: `git diff --check`
