# Release 0.0.19 Prioritization

## Intent

Version `0.0.19` should add a focused ref-management workflow: creating and publishing Git tags directly from the Revision Graph.

The release should stay small enough to validate confidently while closing a visible product gap already called out in the README.

## Proposed Focus

- Lightweight local tag creation from graph-selected references and visible commits
  Let users create a local tag from the same graph context menu where they already compare, branch, checkout, merge, and delete refs.

- Local tag push to a selected remote
  Let users publish a local tag from the graph without introducing a broad push workflow.

- Remote tag deletion from a selected remote
  Let users remove an accidentally pushed tag from a remote with an explicit destructive confirmation.

- Tag name validation and duplicate detection
  Catch invalid or already-existing local tag names before running Git commands.

## User Value

- Users can mark release points without leaving the graph.
- Users can publish release tags to a remote with an explicit confirmation.
- Users can remove a pushed tag from a selected remote without deleting the local tag.
- Users can tag a selected branch, existing tag target, remote ref, or visible unreferenced commit.
- Users get faster feedback when a tag name is invalid or already exists locally.
- The workflow rounds out the existing tag story, which already includes tag display, tag filtering, tag checkout via local branch creation, and tag deletion.

## Scope Guardrails

- Keep the first version focused on local tag creation, explicit tag push, and explicit remote tag deletion.
- Use native VS Code prompts and confirmations.
- Preserve existing conflict guards, cancellation behavior, multi-repository support, and refresh behavior.
- Do not introduce general push workflows in this release unless explicitly approved.

## Candidate Follow-Ups

- Annotated tag message support if it fits without making the workflow noisy.
- Optional compare-results polish if tag creation lands with low risk.
- Annotated tag creation as a later release, after lightweight tag workflows are stable.

## Out of Scope by Default

- Version bumping before explicit approval.
- Marketplace publishing before explicit approval.
- Full reference rename flows.
- Broad graph rendering or data-model changes.
