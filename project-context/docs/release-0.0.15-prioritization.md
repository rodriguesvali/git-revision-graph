# 0.0.15 Release Prioritization

## Goal

Start `0.0.15` with a clear working scope that builds on the `0.0.14` trust and workflow improvements without overloading the release.

## Inputs Reviewed

- Current extension surface from `package.json`
- Current product story and known gaps from `README.md`
- Recent delivery focus from `CHANGELOG.md`
- Longer-term architectural targets from `docs/revision-graph-parity-plan.md`

## Current Starting Point

`0.0.14` already improved three important trust-building areas:

- richer graph filtering
- persistent compare results
- fetch from the graph

That means `0.0.15` does not need to prove basic workflow breadth again. The next release can shift toward depth in two areas:

- navigation in denser graphs
- release-oriented ref workflows that still feel missing

## Candidate Focus Areas

| Rank | Feature | User Value | Effort | Why it matters now |
| --- | --- | --- | --- | --- |
| 1 | Real minimap / overview with jump navigation | Very High | Medium / High | The graph is now more filterable, but larger histories still need faster orientation and movement. This is the clearest next-step usability win in the parity plan. |
| 2 | Tag creation from a selected ref | High | Small / Medium | This closes a visible release workflow gap and fits naturally with the graph's existing branch, checkout, merge, and delete actions. |
| 3 | Richer search beyond the loaded graph window | High | High | Search is already useful inside the loaded graph, but users will still hit limits in larger repositories or when looking for older commits. |
| 4 | Conflict-aware guidance before checkout and merge | Medium / High | Medium | The extension already protects the workspace well; better preflight guidance would make those protections feel more supportive and less abrupt. |
| 5 | Publish / push and ref lifecycle workflows | Medium | Medium | Helpful for branch hygiene, but not as foundational as navigation and release tagging. |
| 6 | Full-history graph rendering beyond the bounded window | Medium | High | Valuable long term, but it carries more performance and correctness risk than the navigation and workflow gaps above. |

## Recommended Starting Scope For 0.0.15

1. Add a real graph overview or minimap with a fast way to jump to visible regions.
2. Add tag creation from a selected ref.
3. Reserve space for one smaller UX/stability follow-up discovered during implementation.

## Why This Scope Fits

- It gives `0.0.15` one obvious headline feature for graph usability.
- It closes a practical release-management gap that users already expect from Git tools.
- It leaves enough room to absorb polish work without turning the version into another broad multi-feature sweep.

## Explicit Deferrals

Keep these as follow-up candidates unless implementation for the recommended scope lands early:

- richer search beyond the loaded graph window
- publish / push workflows
- full-history graph rendering

## Suggested Release Narrative

`0.0.15` can position itself as the release that makes the graph easier to navigate and more useful during release preparation:

- better orientation in large histories
- direct tagging from the graph
- continued UX polish around core Git actions
