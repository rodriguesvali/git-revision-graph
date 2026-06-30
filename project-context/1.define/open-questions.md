# Open Questions

## 2.0.0

- Decided on 2026-06-29: defer graph-driven branching workflow profiles, with Git Flow as a
  possible preset rather than a mandatory external CLI dependency, to the `2.0.0` product cycle.
- Open: should pull, push, sync, and fetch actions be removed from the graph to reduce overlap
  with the built-in VS Code Source Control experience? No product change is approved yet.

## 1.5.0

- Decided on 2026-06-27: all `1.4.0` Deliver gates are complete, including Extension Development Host smoke validation, VSIX packaging, clean-profile installation, and Marketplace publication; the `1.5.0` release cycle may open.
- Decided on 2026-06-27: use a per-repository mutation coordinator that rejects overlapping mutations rather than queueing stale work.
- Decided on 2026-06-27: use a hybrid restore strategy with targeted `git restore` for tracked content, direct removal only when the source revision has no path, and symlink-aware ancestor validation before every write or removal.
- Decided on 2026-06-27: use `gitExec` profiles of 15 seconds/1 MiB for short metadata reads, 60 seconds/4 MiB for local mutations, and 120 seconds/4 MiB for remote-capable CLI operations; retain reviewed specialized history/document/binary limits and enforce a 60 second/4 MiB fallback so no call is unbounded.
- Decided on 2026-06-27: permit synchronous d3-dag fallback only when the projection has at most 200 nodes and at most 300 edges; above either limit, use a deterministic `O(V+E)` fallback and never repeat d3-dag in the extension host.
- Decided on 2026-06-27: use a shared synthetic Git fixture covering spaces, Unicode, option-like names, renames, binary and empty files, and `U+001E/U+001F` commit text; add Linux/macOS symlink and executable-bit cases, Windows junction/symlink and path cases, and a shared Node process-tree/output-flood helper.
- Decided on 2026-06-27: add a verification-only GitHub Actions matrix for Ubuntu, Windows, and macOS on Node.js 20, running clean install, build, tests, diff validation, production audit, and platform fixtures without automatic packaging or publication.
- Decided on 2026-06-27: approve development-only dependency and lockfile updates that remediate audit findings without runtime dependency changes; do not use `npm audit fix --force`, and require separate approval for any major upgrade.
- Decided on 2026-06-27: use a deterministic generated benchmark with a fixed seed and manifest; CI uses 1,200 commits, 120 branches/refs, 40 merges, and 30 tags, while release-candidate validation uses 12,000 commits, 600 branches/refs, 200 merges, and 200 tags.
- Decided on 2026-06-27: freeze the complete `1.5.0` robustness scope recorded in `project-context/docs/release-1.5.0-prioritization.md` and authorize Build. Packaging, clean-profile installation, and Marketplace publication remain separate Deliver approvals.

## 1.4.0

- Decided on 2026-06-26: the first `1.4.0` feature slice is a `Unified Diff` action in the `Compare Results` editor panel for ref-to-ref comparisons.
- Decided on 2026-06-26: extend the action to ref-to-worktree Compare Results and include untracked files alongside staged and unstaged changes.
- Decided on 2026-06-27: freeze the `1.4.0` release scope to the implemented Compare Results unified diff slice; defer all other candidate areas to a later release.
- Decided on 2026-06-27: treat `1.4.0` as a focused review-surface improvement release rather than broad graph, Git workflow, or release-hygiene expansion.
- Decided on 2026-06-27: require the release-candidate Extension Development Host smoke matrix recorded in `project-context/3.deliver/release.md` before VSIX packaging approval.
- Approved by the maintainer on 2026-06-27: the implemented Compare Results unified diff capabilities after baseline `78a80ab427894f2dab5e0636e929c5f9d56f5b08`, through candidate `876eecd3b0e986f9a4c843ac6b88d1009b9d83dc`, are approved for inclusion in `1.4.0`. This approval covers ref-to-ref and ref-to-worktree unified diff, staged/unstaged/untracked worktree output, and the pre-generation refresh and stale-response guards. Manual validation, VSIX packaging, and Marketplace publication remain separate maintainer actions.

## 1.2.0

- Which branch-heavy or synthetic repository will be the repeatable performance benchmark for graph loading, scrolling, minimap navigation, and Show Log pagination?
- Should the first implementation slice remove startup activation and stale package artifacts before deeper runtime optimization?
- Is adding a bundler such as esbuild approved after a no-dependency package-cleanup slice establishes the baseline?
- Which projection options can safely reuse the same immutable Git snapshot, and which options must change the `git log` query?
- Should merge-blocked target analysis use one aggregated Git query, bounded concurrency, or graph-only answers when references fall outside the loaded window?
- What regression budget is acceptable for webview payload size, graph-load duration, and scroll-frame work before a `1.2.0` release candidate is rejected?

## 1.1.0

- Decided on 2026-06-11: promote the active cycle from `1.0.2` to `1.1.0` because the scope now includes small compatible functional improvements in addition to fixes.
- Which final focused fixes and small functional improvements should define the closed `1.1.0` release scope?
- Which manual Extension Development Host smoke paths are mandatory once `1.1.0` launch items are selected?

## 0.0.37

- Decided on 2026-06-04: `0.0.37` will not be stabilization-only. The cycle may include small visual and functional product improvements selected one by one from maintainer review, with each item scoped individually.
- Which branch-heavy or merge-heavy repository should become the standard manual benchmark for `0.0.37` large-graph validation?
- Should worker-layout fallback or cancellation paths emit clearer output-channel diagnostics before the next package candidate?
- Which `0.0.36` manual smoke findings, if any, should be promoted into focused `0.0.37` feature artifacts?

## 0.0.32

- Should `0.0.32` be primarily a stabilization release, or include one small visible graph-parity improvement?
- Which first foundation slice has the best risk/reward: graph fixtures, model boundary types, refresh instrumentation, or one metadata-only patch path?
- Should release copy explicitly explain that the old primary graph Activity Bar entry was replaced by Source Control launch?
- Decided on 2026-06-04: Compare Results and Show Logs should move from Activity Bar review views to editor-area panels for `0.0.37`.
- What repository fixture should become the standard manual smoke sample for graph correctness?

## Previous Release Follow-Up

- What exact manual Extension Development Host smoke matrix is mandatory before packaging `0.0.31`?
- Should Marketplace screenshots be refreshed before `0.0.31` publication to show the Source Control toolbar entry and editor graph panel?
- Should release copy explicitly call out removal of the old graph Activity Bar entry for existing users?
- Decided on 2026-06-04: Compare Results and Show Logs move into editor panels for `0.0.37`.
- Which graph parity gap should be prioritized after the Source Control/editor graph surface ships?
- Which future cache architecture changes remain mandatory: immutable DAG/history snapshots, mutable ref/HEAD overlays, projection superset reuse, or cache metrics?
