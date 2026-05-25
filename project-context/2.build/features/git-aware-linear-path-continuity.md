# Git-aware Linear Path Continuity

## Goal

Keep simple non-mainline DAG paths visually stable when commits form a direct linear sequence, even when the visible refs belong to adjacent naming families such as `v1.5.x` and `v1.4.x`.

## Scope

- Add a Git-aware lane pass for non-mainline linear path components.
- Only connect projected edges where the child has exactly one visible parent and the parent has exactly one visible child.
- Skip mainline commits and boundary nodes.
- Preserve merge and fan-out structures for the existing branch component, structural barycenter, and layer barycenter passes.
- Move the layout cache namespace to `git-aware-v7`. Later row-proximity work moved the active namespace to `git-aware-v8`.

## Acceptance

- A simple non-mainline sequence keeps the same lane across adjacent refs.
- Version-family continuity still keeps same-family refs grouped.
- Structural commits and layer barycenter behavior remain covered by existing tests.
- Build and test suite pass.

## Verification

- Passed: `npm run build`
- Passed: `npm test` (305 tests)
- Passed: `git diff --check`
