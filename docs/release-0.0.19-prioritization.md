# Release 0.0.19 Prioritization

## Intent

Version `0.0.19` should add a focused ref-management workflow: creating Git tags directly from the Revision Graph.

The release should stay small enough to validate confidently while closing a visible product gap already called out in the README.

## Proposed Focus

- Tag creation from graph-selected references and visible commits
  Let users create a tag from the same graph context menu where they already compare, branch, checkout, merge, and delete refs.

## User Value

- Users can mark release points without leaving the graph.
- Users can tag a selected branch, existing tag target, remote ref, or visible unreferenced commit.
- The workflow rounds out the existing tag story, which already includes tag display, tag filtering, tag checkout via local branch creation, and tag deletion.

## Scope Guardrails

- Keep the first version focused on local tag creation.
- Use native VS Code prompts and confirmations.
- Preserve existing conflict guards, cancellation behavior, multi-repository support, and refresh behavior.
- Do not introduce general push, tag publish, or remote tag deletion workflows in this release unless explicitly approved.

## Candidate Follow-Ups

- Annotated tag message support if it fits without making the workflow noisy.
- Optional compare-results polish if tag creation lands with low risk.
- Push tag to remote as a later release, after local tag creation is stable.

## Out of Scope by Default

- Version bumping before explicit approval.
- Marketplace publishing before explicit approval.
- Full reference rename flows.
- Broad graph rendering or data-model changes.
