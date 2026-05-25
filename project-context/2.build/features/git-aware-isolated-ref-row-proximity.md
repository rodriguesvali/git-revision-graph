# Git-aware Isolated Ref Row Proximity

## Goal

Reduce long vertical jumps for isolated lateral refs whose visible ancestor is pushed downward by other DAG constraints.

## Scope

- Add a post-topological row pass for visible ref tips outside the mainline.
- Only move non-boundary refs with no visible descendants.
- Move the ref down to the closest valid row above its nearest visible parent.
- Preserve the invariant that every descendant remains above every visible parent.
- Move the layout cache namespace to `git-aware-v8`. Later lateral-component proximity work moved the active namespace to `git-aware-v9`.

## Acceptance

- An isolated lateral branch tip is rendered immediately above its visible ancestor when possible.
- Refs with multiple visible parents remain above every parent.
- Existing version-family, linear-path, structural barycenter, and layer barycenter behavior remains covered.

## Verification

- Passed: `npm run build`
- Passed: `npm test` (307 tests)
- Passed: `git diff --check`
