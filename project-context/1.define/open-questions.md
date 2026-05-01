# Open Questions

- Which hardening items are mandatory for `0.0.27`: Git argument safety, output/time bounds, compare restore path guards, webview message budgets, dependency audit refresh?
- What output limits and timeouts should be used for unified diff, commit details, show log, fetch with tags, and restore `git show`?
- Should dev-tooling audit fixes be included if production dependencies are already clean?
- Should stabilization validation include a fixture repository with option-like tag/ref names?
- What manual Extension Development Host validation matrix should be required before Marketplace publishing?
- Which cache improvements should be included in `0.0.27`: instrumentation only, completed snapshot reuse for cancelable refreshes, layout-cache persistence deduplication, Show Log cache bounding, or remote-tag TTL caching?
- Should graph snapshot caching be split into immutable DAG/history data and mutable ref/HEAD overlay data in a later release?
- What freshness guarantees should cache tests cover for rapid refreshes, repository switching, and interrupted graph loads?
