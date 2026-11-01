# System Review — 2026-11-01

Scope: risk-based review of Show Log, the new all-branches anchor, selected Git
mutation safeguards and existing automated verification. This is not an
exhaustive audit of every extension capability. No runtime change was made.

## Findings

1. **P1 — Show Log loses reference identity (corrected).** A branch and tag with the same
   short name can refer to different commits. The reference target carries the
   short name into the Show Log message without its kind; Git can resolve the
   tag even when the user selected the branch. A real temporary Git fixture
   reproduced the wrong commit in both toggle modes. Carry an authorized exact
   ref kind or an authorized immutable commit identity through the workflow.
   Implemented and verified in [the feature record](features/1.7.7-show-log-reference-identity.md).
2. **P2 — All-branches anchor offset can become stale inside one load (corrected).** The
   offset comes from `rev-list`, then a separate `git log --all` reads current
   refs. A test wrapper updated another branch after the first command; the
   returned page began at the new descendant instead of the selected tag.
   Pin a consistent ref snapshot or detect changes and retry.
   Implemented and verified in [the feature record](features/1.7.7-show-log-anchor-snapshot.md).
3. **P2 — Paging a moving reference duplicates or omits commits.** Loading a
   page, adding a commit, then loading the next page by numeric skip returned the
   same commit twice in a real Git fixture. The provider appends the duplicate.
   Pin the history or invalidate and reload when its snapshot changes.
4. **P2 — Filtered history misrepresents ancestry.** Filtering three linear
   commits down to the first and third allocates the third to a new lane while
   the first lane remains open, suggesting unrelated histories. Real Git and
   the lane builder reproduced this. Project the topology through hidden
   commits or explicitly represent disconnected/unknown filtered edges.

## Verification

- `npm test`: 1,233 passed, zero failures, cancellations or skips, including
  production and webview builds.
- `npm run quality:check`: passed, 333 files and 2,976 functions.
- The four scenarios were reproduced using temporary, disposable Git
  repositories and the compiled backend, without writing to user repositories.
- Jev 1.14 verified three bounded statements against supplied summaries; two
  had low confidence and required review. Findings and priorities above rest on
  source inspection and deterministic reproductions, not the model's verdict.
- Native Extension Host/UI and non-Linux platform smoke were not run in this
  review. No corrections, release packaging or publication were performed.
