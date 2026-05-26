# Git-aware Merge Fan-in Ordering

## Goal

Reduce lane zig-zags around visible merge convergence points by keeping a merge child on its dominant visible parent lane.

## Scope

- Add a merge fan-in lane pass after fan-out ordering and before dominant succession continuity.
- Detect visible non-mainline children with multiple visible parents.
- Choose the dominant non-mainline parent by Git parent order, then existing lane continuity, ref priority, row proximity, and stable hash order.
- Keep first-parent merge children preferred during fan-out ordering so a competing sibling branch does not steal the parent lane.
- Preserve mainline lane ownership by not moving non-mainline merge children onto mainline parent lanes.
- Move the layout cache namespace to `git-aware-v12`.

## Acceptance

- A merge child with competing visible siblings stays on the first-parent lane.
- The merge child's simple successor chain inherits the merge lane.
- Competing sibling descendants remain on a distinct nearby lane.
- Existing fan-out, dominant succession, version-family, row-proximity, structural barycenter, and layer barycenter behavior remains covered.

## Verification

- Passed: `npm run build`
- Passed: `npm test` (311 tests)
- Passed: `git diff --check`
