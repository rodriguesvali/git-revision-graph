# Git-aware Layout Cache Ref Metadata

## Goal

Prevent stale Git-aware layout positions when reference metadata changes on the same projected graph topology.

## Scope

- Include `isBoundary` in the projected layout cache identity because Git-aware placement skips boundary nodes in several lane passes.
- Include each visible ref `kind` and `name` in the cache identity because mainline selection, ref priority, and version-family continuity depend on those values.
- Sort refs by kind and name before hashing so equivalent ref sets produce stable cache keys even if their input order changes.
- Preserve existing topology, node-size, and layout strategy namespace hashing.

## Acceptance

- Moving `origin/main` between same-width commits with identical edges produces distinct projected layout cache keys.
- A second layout calculation for that metadata change is a cache miss, avoiding reuse of stale lane positions.
- Existing Git-aware layout behavior remains unchanged for identical graph metadata.

## Verification

- Passed: `npm run build`
- Passed: `npm test` (312 tests)
