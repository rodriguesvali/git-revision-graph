# Git-Aware Version Family Continuity

## Goal

Keep visible version-reference families, such as `origin/v0.10`, `v0.10.48`, and `v0.10.47`, on a stable lane instead of allowing adjacent release cards to alternate left/right between rows.

## Scope

- Detect numeric version families from ref names like `v0.10.48`, `0.10.48`, and `origin/v0.10`.
- Connect visible nodes from the same version family when they are adjacent through projected edges.
- Anchor the family lane by mainline membership first, then by higher-priority refs such as branches/remotes before tags, then by the newest row.
- Preserve mainline lanes and move only non-mainline family members.
- Keep layer barycenter ordering limited to non-boundary structural nodes so referenced cards do not get swapped by local crossing heuristics.
- Move the layout cache namespace to `git-aware-v6` so persisted `git-aware-v5` positions are not reused.

## Acceptance

- Connected visible refs in the same version family render on the same lane.
- `origin/v0.10` and adjacent `v0.10.x` tags share the same lane when connected in the projected graph.
- Different version families can remain on distinct lanes.
- Structural connector centering and descendant-above-parent ordering remain intact.

## Verification

- Passed: `npm run build`
- Passed: `npm test`
