# Revision Graph Parity Plan

Status: Active Summary
Last consolidated: 2026-06-30

This is the compact planning reference for improving revision-graph fidelity. The full historical
analysis is archived at `project-context/archive/analysis/revision-graph-parity-plan-history.md`.

## Objective

Move the graph toward a more faithful revision-graph experience while preserving the current
Source Control-launched editor graph product surface.

The target is not a wholesale rewrite in one release. Future work should be delivered as scoped,
verified slices.

## Current Baseline

- The extension already opens a singleton editor graph from Source Control.
- The graph is bounded to a loaded history window.
- The model supports major-operation projection, layout caching, minimap navigation,
  virtualization, Focus Range, and Focus Descendants.
- Refs, visible commits, collapsed paths, Compare Results, Show Log, unified diff, and Git
  workflow actions are integrated with native VS Code UX.

## Durable Principles

- Treat commits as the primary domain object and refs as annotations on commits.
- Keep simplification in projection logic, not in source Git parsing.
- Preserve structural correctness when commits are hidden.
- Keep layout as a dedicated concern with deterministic fallback behavior.
- Keep Git I/O in the extension host and rendering/local interaction in the webview.
- Distinguish topology-changing refreshes from metadata-only updates where correctness can be
  proven.
- Preserve native VS Code workflows for diff, Source Control handoff, confirmations, and document
  opening.

## Candidate Future Slices

- Strengthen commit graph model boundaries and query helpers.
- Add repeatable graph fixtures for branch, merge, tag, remote, stash, and hidden-commit cases.
- Improve projection behavior for hidden commits, focused ranges, and descendant paths.
- Improve branch/merge visual continuity and edge routing.
- Classify refresh causes and safely reuse compatible loaded snapshots.
- Expand layout benchmarks and release-candidate validation for large graphs.

## Non-Goals Without Separate Approval

- Unbounded full-history rendering.
- Replacing the current Source Control/editor graph surface.
- Replacing the Git integration model with a custom SCM provider.
- Adding runtime dependencies or layout engines without explicit maintainer approval.
- Treating the archived TortoiseGit parity analysis as approved release scope.

## Acceptance Criteria For Any Parity Slice

- The active feature artifact states the exact graph behavior being changed.
- Existing graph scopes, focus modes, minimap, search, selection, context menus, and virtualization
  remain correct unless explicitly changed.
- `npm run build` passes.
- `npm test` passes for behavior-affecting changes.
- Manual Extension Development Host validation covers the affected graph and Git workflows.
