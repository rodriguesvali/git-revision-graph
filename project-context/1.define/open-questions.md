# Open Questions

- Which `0.0.28` cache architecture changes are mandatory: immutable DAG/history snapshots, mutable ref/HEAD overlays, projection superset reuse, or cache metrics?
- Which repository events invalidate immutable graph topology versus only overlay metadata?
- Should immutable graph snapshots be keyed by exact graph load parameters, or should the backend load a reusable superset for multiple projection modes?
- What freshness guarantees should cache tests cover for rapid refreshes, repository switching, interrupted graph loads, checkout, fetch, push-only sync, and pull-only sync?
- What manual Extension Development Host validation matrix should be required before Marketplace publishing?
- Should `0.0.28` remain a patch release if the work improves performance architecture without adding a new visible workflow?
