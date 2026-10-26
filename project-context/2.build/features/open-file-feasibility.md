# Open File — Feasibility and Placement

Status: Historical discovery input; implementation tracked in 1.7.6-open-file.md
Date: 2026-10-26
Baseline: package 1.7.5; VS Code ^1.100.0; @types/vscode 1.100.0

Follow-up: on 2026-10-26 the maintainer requested opening 1.7.6 and preparing
build artifacts. The [versioned build plan](1.7.6-open-file.md) records that next
step and the addition/deletion rules discussed afterward. Statements below about
unassigned release scope describe the original analysis checkpoint.

## Goal and User Workflow

Let a reviewer move from a changed-file list into a single file editor to read
the complete file or edit its current worktree version. Keep the existing native
diff workflow available with its current double-click behavior.

The request authorizes feasibility analysis. The placements and semantics below
are recommendations, not accepted product or release requirements.

## Verified Current Behavior

- `src/compareResultsWebview.ts` has a per-file menu with Open Diff, conditional
  Revert and Compare with Worktree, and clipboard actions. Multiple selection
  currently offers clipboard actions only. Double-click dispatches the diff action.
- `src/compareResults/itemActions.ts` opens reference-to-reference or
  reference-to-worktree diffs. `CompareResultItem` already carries the repository,
  change, left/right refs or worktree comparison ref.
- `src/showLogWebview.ts` offers Compare, Compare with Worktree, Revert to this
  and clipboard actions on expanded file changes. Its internal `openFile` message
  calls `openShowLogFileChange`, which opens a first-parent-to-commit diff;
  the name does not mean single-file opening today. A new action must remain
  distinct from that existing behavior.
- `src/workbenchDiffPresenter.ts` already constructs revision URIs with repository,
  ref and path. Its URI builders are private and would need a shared owner before
  reuse by a file-opening presenter.
- `src/refContentProvider.ts` registers the `git-ext-ref` textual content provider;
  `src/refContentLoader.ts` checks the repository is open, validates path containment
  and reads Git content with bounded output (24 MiB) and time (15 seconds).
- `src/changePresentation.ts` separates original and renamed paths. Selecting a
  revision requires the path for that side, not always `getTargetUri`.
- Commit Details and Unified Diff currently open generated textual diff documents
  (`src/revisionGraph/repository/log.ts`), rather than structured file lists.
- Compare entrypoints can retain named refs (`src/refActions/compare.ts`); the
  historical action must not assume every input is an immutable commit hash.

Graphify located candidate modules; the findings above were checked in current
source and existing action tests. The graph contains some stale `src/test/` paths;
the relevant current tests are under `test/`.

## Recommended Placement and Scope

| Surface | Action and meaning | Priority |
| --- | --- | --- |
| Compare Results: ref vs worktree | Open File opens the current worktree file; Open File at <ref> opens the reference version read-only | First |
| Compare Results: ref vs ref | Open File opens the current worktree path when available; Open Source File at <ref> and Open Target File at <ref> select explicit historical sides | First, historical actions as a second slice |
| Show Log: expanded changed files | Open File opens the current worktree path; Open File at <commit> opens the historical file read-only | First, historical action as a second slice |
| Native file diff editor | Consider a later editor-title shortcut only if native navigation leaves a demonstrated gap | Later |
| Graph branch/commit menu | A future Open File at Revision would require a file picker and revision-tree loading; no file is selected at this surface | Defer |
| Unified Diff / Commit Details | Would require path-aware navigation from generated text | Defer |

Use each file's existing context menu, including keyboard access. Keep Open Diff
and Compare behavior unchanged. A tooltip can clarify that Open File means the
current worktree, which can differ from both compared revisions. Do not silently
open historical content when the worktree file is absent. Historical actions must
identify the revision and read-only meaning; final wording remains a product choice.

## Feasibility and Owning Boundaries

The existing architecture supports both variants without a runtime dependency,
new view, global command or higher VS Code minimum. This is a feasibility conclusion
from source and API declarations, not a tested implementation.

- Worktree slice: small to medium change across both panels. Resolve the current
  item on the host and open its authoritative URI using native editor APIs. Preserve
  an existing dirty document and never restore, check out, create or overwrite a
  missing file as a side effect of opening it. Prefer native `vscode.open` dispatch
  where appropriate for local images, notebooks and custom editors.
- Historical slice: medium change. Reuse a shared revision-URI builder and the
  existing provider, then show one read-only text document. Pin named refs to a
  commit hash before constructing its document URI; ensure the policy for a ref
  moving since the comparison was loaded is explicit (refresh or capture comparison
  commits), rather than silently implying the original snapshot is still current.
  Include revision identity in editor presentation so equal paths at different
  commits are distinguishable. The current textual provider is not sufficient for
  historical binary/image/notebook previews as a complete supported feature.
- Place target selection in focused action modules and native editor effects in
  a workbench adapter. Update panel composition, message unions, validators,
  origin/session authorization, handlers and tests together.
- Send item IDs (or commit hash plus change ID for Show Log) from the webview;
  resolve repository, path and permissible revision on the host. Reject delayed
  messages from a replaced comparison, log, repository or closed repository.

## Edge Cases and Acceptance Criteria

- Added file: historical source side is absent. Deleted file: historical target
  side is absent; offer the explicitly labeled source/parent version when useful.
  Never present an empty diff placeholder as an actual historical file.
- Local availability is independent of historical change status. A file deleted
  in one compared revision can exist in the current checkout. Recheck availability
  at activation; reject a missing path with a short actionable message, without
  creating an empty file or falling back to a different version.
- Renames: use original path on the source/parent side and renamed path on the
  target side. Do not infer later rename chains or guess a current filename.
- Root commits and merges: do not try to open a file from the empty-tree sentinel;
  parent-side actions follow the existing first-parent policy and say which side
  they open. Other parent selection is outside this proposal.
- Keep actions bound to their original repository, with no new active-repository
  tracker. Preserve filters, selection, theming and keyboard menu operation.
- Opening current files preserves unsaved editor contents; opening historical
  files changes neither worktree nor index. Handle unavailable Git objects,
  permission failures, large files and unsupported historical binary content clearly.

## Supporting Judgment

A focused `jev_decide` compared explicit version actions, one context-dependent
Open File action, and replacing double-click diff. It preferred explicit targets
with probability 0.85 and confidence 0.82. This supports the clarity recommendation;
it is not proof, verification or maintainer approval. Its auxiliary claim that
replacing double-click would preserve double-click diff contradicts the candidate
definition and is discarded. Inspection and explicit behavior definitions govern.

## Test Plan and Manual Validation for Implementation

Test target selection for both compare modes and Show Log, additions, deletions,
renames, first-parent/root behavior, missing files, dirty editors, historical content
and revision identity. Test malformed IDs, replaced contexts, repository closure,
and two repositories with identical relative paths. Verify opening causes no Git
mutation. Run `npm run build`, `npm test` and required quality checks after code
changes, then `graphify update .`.

In Extension Development Host, exercise context menus with mouse and keyboard,
existing double-click diff, normal text/image/notebook worktree opening, historical
read-only editors, same path at two revisions, a moved branch, missing paths,
unsaved edits and multi-root switching. Windows path behavior requires coverage.

## Verification, Release Impact and Handoff

This analysis used graphify, current source, existing test definitions, the locked
VS Code declarations and official documentation. Context7's first retrieval was
off-topic; a focused second retrieval returned the virtual-document guide. No
build, tests or Extension Host smoke were run because runtime code is unchanged.

Recommended delivery: current-worktree opening in both file-list panels first;
explicit historical opening second. Multi-file Open Selected Files, new command
palette actions, graph file pickers and historical binary viewers are non-goals.
Estimates above are relative engineering scope, not elapsed-time commitments.

No release assignment, version bump, packaging, Marketplace change or approved
PRD/SAD scope change is made. On implementation, update README and the relevant
feature/release evidence; rollback removes only the added opening actions.

Sources:

- [VS Code virtual documents](https://code.visualstudio.com/api/extension-guides/virtual-documents)
- [VS Code built-in commands](https://code.visualstudio.com/api/references/commands)
- Local `node_modules/@types/vscode/index.d.ts`: TextDocumentContentProvider,
  openTextDocument and showTextDocument at pinned version 1.100.0.
- [TypeSafe Choice guidance](https://docs.typesafe.ai/primitives/choice)
