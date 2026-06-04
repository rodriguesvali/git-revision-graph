# 0.0.14 Release Prioritization

## Goal

Choose the best candidate features for `0.0.14` by ranking them on potential user value first, then recommending a release scope that is ambitious enough to matter without destabilizing the extension.

## Inputs Reviewed

- Current product scope and known limitations from `README.md`
- Recent delivery focus from `CHANGELOG.md`
- Architectural direction from `docs/revision-graph-parity-plan.md`
- Marketplace page for `GIT Revision Graph` on April 14, 2026
  - 8 installs
  - 1 rating
- GitLens Commit Graph feature documentation as a practical market baseline

## Assumptions

- The extension is still early in adoption, so the next release should favor trust-building workflows over niche power-user depth.
- `0.0.14` should feel meaningfully better in daily use, not only more complete on paper.
- A feature can rank high on user value even if it is not the best fit for the immediate release.

## Ranking Criteria

1. How often a user is likely to need the capability in normal Git work.
2. How much the capability reduces context switching out of the graph.
3. How much it improves trust in the graph as a daily driver.
4. How clearly it closes a gap already visible in the docs or in comparable tools.

## Ranked Features By Potential User Value

| Rank | Feature | User Value | Effort | Why it matters |
| --- | --- | --- | --- | --- |
| 1 | Rich graph filtering and hide/show controls | Very High | Medium / High | The graph becomes dramatically more useful when users can reduce clutter by branch, remote, tag, stash, and revision range. This is already a stated gap in the project docs and a first-class concept in both the parity plan and competing graph tools. |
| 2 | Persistent compare results view | Very High | Medium | Compare is already one of the extension's strongest workflows, but the current Quick Pick result list is transient. A persistent result surface would turn a peek workflow into a real review workflow. |
| 3 | Fetch current repository from the graph | High | Small / Medium | A revision graph loses trust quickly when remote refs are stale. The README explicitly calls out fetch as missing, and competing graph tools expose fetch directly in the graph UI. |
| 4 | Context-preserving lightweight refresh | High | Medium | Users repeatedly lose flow when checkout, branch creation, sync, or refresh rebuild the graph and reset local context. Preserving zoom, scroll, and selection makes every existing feature feel better. |
| 5 | Real minimap / overview | High | Medium / High | Large repositories become easier to navigate when users can orient themselves quickly and jump to important areas. This is also a parity target already documented in the repo. |
| 6 | Tag creation from a selected ref | Medium / High | Small / Medium | Tag creation is a common release workflow and is one of the clearest functional gaps versus user expectations for a Git graph tool. |
| 7 | Rich search beyond the loaded graph window | Medium / High | High | The current client-side search is useful, but it is bounded by the loaded graph. Search by file, change, or broader history would increase discovery value, especially in larger repos. |
| 8 | Conflict-aware guidance before checkout and merge | Medium | Medium | This would reduce fear and improve task success for less experienced users, especially when local changes or unresolved conflicts are present. |
| 9 | Ref rename and publish/push workflows | Medium | Medium | Helpful for branch lifecycle management, but less central than filtering, compare, freshness, and navigation. |
| 10 | Full-history graph rendering beyond the bounded window | Medium | High | Valuable for some repositories, but the implementation and performance risk are high. The product can deliver more user value sooner by improving focus, navigation, and trust inside the current bounded model first. |

## Why The Top Three Rank Highest

### 1. Rich graph filtering and hide/show controls

This is the feature with the biggest upside for graph readability.

The current extension already has scope toggles and search, but the docs still call out richer search and filtering as missing. The parity plan also treats filtering as a core part of a faithful revision graph, not an optional extra. In practice, users stop trusting graph tools when dense histories become noisy faster than the tool helps them focus.

### 2. Persistent compare results view

This is the clearest path to deepening an existing strength.

Users can already compare refs, open unified diffs, and review logs. The missing piece is staying in that workflow long enough to review multiple files without re-running the same action loop. A persistent compare surface would create a much better bridge from graph exploration to code review and release validation.

### 3. Fetch current repository from the graph

This is the highest-value quick win.

Even a well-rendered graph feels unreliable if it does not show the latest remote state. Fetch is easy to explain, easy to discover, and directly aligned with how users already think about a graph: "show me the real current branch landscape."

## Recommended Scope For 0.0.14

The best `0.0.14` scope is not simply the top three by value. It should combine one obvious user-facing win with one workflow-quality improvement and one small release-oriented gap closer.

### Recommended for 0.0.14

1. Add `Fetch` for the active repository from the graph toolbar and Command Palette.
2. Preserve graph context across metadata-only refreshes:
   keep zoom, scroll, and selection where possible.
3. Add tag creation from a selected ref.

### Defer to 0.0.15+

1. Persistent compare results view
2. Rich graph filtering and hide/show controls
3. Real minimap / overview

## Why This Scope Is Better For 0.0.14

- `Fetch` closes a visible trust gap with relatively low delivery risk.
- Context-preserving refresh improves every existing workflow immediately, including checkout, branch creation, sync, and manual refresh.
- Tag creation is a release-adjacent workflow that fits the version theme and rounds out the basic ref-management story.

This mix should make `0.0.14` feel more complete in daily use while keeping the heavier graph-surface changes for a follow-up release.

## Suggested Release Narrative

`0.0.14` should position itself as the release that makes the graph more trustworthy and release-friendly:

- fresher graph data
- less disruptive refreshes
- smoother release tagging workflow

That message is easier to communicate than a broad "more features" release and is more realistic for a low-risk iteration after `0.0.13`.

## Sources

- Project README: current features, known limitations, and next steps
- Project changelog: recent stability and graph UX work
- `docs/revision-graph-parity-plan.md`: parity targets for filtering, overview, and navigation
- Marketplace page for `rodriguesvali.git-revision-graph` reviewed on April 14, 2026:
  https://marketplace.visualstudio.com/items?itemName=rodriguesvali.git-revision-graph
- GitLens Commit Graph docs: https://help.gitkraken.com/gitlens/gitlens-features/
