# Open Questions

Status: Active
Last consolidated: 2026-06-30

Use this file only for unresolved decisions that still affect future product, architecture, or release work. Historical decisions belong in `project-context/archive/`.

## Product Direction

- Should pull, push, sync, and fetch actions remain graph actions long term, or should some move back toward the built-in VS Code Source Control experience to reduce workflow overlap?
- Which graph parity gap should lead the next larger product cycle: commit-centric rendering, richer filtering, saved graph focus states, layout stability, or full-history/windowing work?
- Should Git Flow or other branching workflow profiles become a `2.0.0` preset, and can that be done without depending on an external Git Flow CLI?

## Architecture And Performance

- What repository fixture should become the repeatable manual benchmark for graph correctness, layout stability, virtualization, minimap navigation, and Show Log behavior?
- Which repository events should invalidate immutable DAG/history data versus only rebuilding mutable ref, `HEAD`, worktree, or overlay state?
- Which projection modes can safely reuse a larger loaded snapshot without stale refs or incorrect branch-scope results?
- Is a bundler still worth evaluating after source-map and package-output cleanup, and how would it preserve the worker runtime entrypoint?

## Release Governance

- What exact Extension Development Host smoke matrix is mandatory before the next release candidate is considered ready?
- What Marketplace metadata should be captured for future completed releases: VSIX filename, checksum, size, publication timestamp, and installed-version confirmation?
- Should the project keep a fixed clean-profile installation checklist for every Marketplace release?
