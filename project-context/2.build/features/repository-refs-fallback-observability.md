# Repository Refs Fallback Observability

## Goal

Keep the revision graph available when `repository.getRefs()` fails while making the degraded data source visible in opt-in load diagnostics.

## Scope

- Represent repository-ref loading as refs plus an explicit source.
- Share the resilient result with snapshot loading and repository overlay generation.
- Trace fallback cause and source through the existing `gitRevisionGraph.traceLoading` output.
- Keep cancellation behavior unchanged.

## Acceptance Criteria

- A non-cancellation `getRefs()` failure falls back to `repository.state.refs` without aborting a full graph load.
- Backend snapshot loading and graph overlay reuse the same fallback refs.
- Trace output identifies `source=state-fallback` and contains the normalized failure reason.
- Successful request-scoped and direct repository sources remain distinguishable.
- Build and tests pass.

## Risk

The state fallback may be stale. It is intentionally retained for availability and is now diagnosable through the existing opt-in trace channel.
