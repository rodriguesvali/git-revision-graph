# Release 0.0.16 Prioritization

## Intent

Version `0.0.16` should build on the recent graph interaction work and focus on making the revision graph feel more predictable, readable, and efficient during day-to-day use.

## Proposed Focus Areas

- Graph interaction polish
  Refine selection behavior, compare flows, and context actions so commit-to-commit and ref-to-commit workflows stay intuitive.

- Visual clarity
  Continue reducing clutter in the graph, especially around selection states, badges, and dense card layouts.

- Daily-driver UX
  Prioritize small workflow wins that reduce friction when reviewing history, comparing revisions, and branching from interesting commits.

## Candidate Themes

- Selection and compare discoverability for both references and unlabeled commits
- Better visual separation between passive graph context and active user selection
- Additional graph-side shortcuts that avoid bouncing out to other workbench surfaces

## Out of Scope by Default

- Large architectural changes to move the graph into a different VS Code host surface
- Full-history rendering redesigns
- Heavy merge-conflict guidance or broad SCM workflow expansion unless directly needed by graph interaction work
