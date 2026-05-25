# Git-Aware Layer Barycenter Ordering

## Goal

Reduce horizontal inversions inside each projected graph row by ordering non-mainline nodes according to the median lane of their visible neighbors.

## Scope

- Preserve row assignment and descendant-above-parent ordering.
- Keep detected mainline commits fixed on their assigned lane.
- Reuse the existing lane slots in each row instead of inventing new columns.
- Only reorder structural, non-boundary nodes without refs; referenced cards are preserved by the version-family continuity rule.
- Only reorder a row when every candidate has a distinct slot, avoiding accidental node collapse.
- Superseded cache namespace note: this landed with `git-aware-v5`, then later layout follow-ups moved the active namespace beyond it.

## Acceptance

- Mainline commits remain anchored.
- Non-mainline nodes in the same row can swap existing slots when their neighbor medians indicate a clearer order.
- Rows with duplicate candidate lanes are left unchanged.
- Existing structural barycenter and row monotonicity behavior remains intact.

## Verification

- Passed: `npm run build`
- Passed: `npm test`
