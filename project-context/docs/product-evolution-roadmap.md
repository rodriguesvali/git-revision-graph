# Product Evolution Roadmap

Status: Active
Last consolidated: 2026-06-30

This roadmap summarizes durable product directions. It is not a release commitment; each release still needs explicit scope approval and a focused feature artifact.

## Current Foundation

The extension is a Source Control-launched revision graph in an editor panel with native VS Code workflows for compare, diff, checkout, branch, sync, merge, delete, stash, reset, tag, and log actions. Compare Results and Show Log are on-demand editor review panels.

Recent work established:

- editor-area graph as the single primary graph workspace;
- virtualized rendering and minimap navigation for large scenes;
- `d3-dag` layout with worker/cache safeguards;
- Compare Results unified diff and loading feedback;
- modal handling for remote permission and protected-branch failures;
- Focus Range and Focus Descendants projection modes;
- broader robustness around Git command bounds, mutation coordination, and platform tests.

## Evolution Themes

### Graph Fidelity

Improve the graph's faithfulness as a revision graph while preserving the current product surface. The historical parity plan remains useful background, but future slices should be smaller than a full redesign.

Candidate slices:

- clearer commit-centric model boundaries;
- richer ancestry and descendant queries;
- better branch/merge visual continuity;
- projection behavior that preserves structural correctness when hiding commits;
- repeatable graph correctness fixtures.

### Performance And Scale

Keep improving large-repository behavior without unbounded history loading.

Candidate slices:

- classify refreshes as topology-changing or metadata-only;
- reuse compatible snapshots safely across projection changes;
- reduce Git process fan-out where the Git API or one bounded CLI call can answer the same question;
- keep layout and viewport work measurable with deterministic benchmarks;
- continue reducing stale package output and test-platform drift.

### Review Workflow Quality

Make compare, unified diff, Show Log, and file-level inspection faster and clearer.

Candidate slices:

- incremental Show Log updates;
- tighter Compare Results state restoration;
- better failure messages for output limits and unavailable Git data;
- stronger keyboard and accessibility behavior in review panels.

### Git Workflow Safety

Keep graph-triggered mutations predictable and recoverable.

Candidate slices:

- refine destructive confirmations and rollback hints;
- continue conflict and permission guard hardening;
- decide whether fetch/pull/push/sync should remain graph actions long term;
- keep reset, restore, stash, tag, branch, merge, and delete paths aligned with native VS Code expectations.

### Release Readiness

Make future publication easier to audit.

Candidate slices:

- fixed Extension Development Host smoke matrix;
- repeatable clean-profile VSIX installation checklist;
- recorded VSIX filename, checksum, size, and Marketplace publication metadata;
- concise release notes derived from active feature artifacts.

## Historical Reference

`project-context/docs/revision-graph-parity-plan.md` contains the older TortoiseGit parity analysis. Treat it as a source of ideas and constraints, not as active approved scope.
