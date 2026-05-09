# Show Log Commit Context Menu Candidates

## Define Status

Candidate analysis complete. No implementation started.

Version bump, package generation, and Marketplace publishing remain unapproved.

## Current State

The Show Log commit-row context menu currently exposes only `Open Commit Details`.

The file-row context menu already supports:

- `Open Diff`
- `Compare with Worktree`
- `Copy to Clipboard > File Name`
- `Copy to Clipboard > Full Path`

The revision graph context menu is richer and already supports compare, show log, unified diff, copy commit hash, copy ref name, checkout, sync, reset workspace, publish branch, create branch, create tag, delete, and merge workflows.

## Architecture Notes

- `ShowLogViewProvider` currently receives only the revision graph backend.
- Low-risk commit actions can be implemented directly in `showLogView.ts` using the loaded `RevisionLogEntry`.
- Actions that need Compare Results or branch/tag mutation should reuse `refActions` and `createWorkbenchRefActionServices`, which likely requires injecting shared services or narrow callbacks into `ShowLogViewProvider`.
- Commit rows already have the commit hash, parent hashes, author, subject, refs, and loaded repository in extension state.
- Menu message validation must remain bounded in `src/showLog/messageValidation.ts`.

## Recommended Candidate Set

### Tier 1: Low-Risk Inspect and Copy Actions

These are good first candidates because they do not mutate the repository and do not require new dependencies beyond the current Show Log provider.

- `Open Commit Details`
  - Already implemented.
- `Open Unified Diff`
  - Removed from the recommended first scope after review.
  - It is technically available through existing helpers, but has weaker user value than a structured compare workflow.
- `Copy Commit Hash`
  - Copy the full commit hash to the clipboard.
- `Copy Short Hash`
  - Copy the visible short hash.
- `Copy Commit Subject`
  - Copy the subject line.
- `Copy Author`
  - Copy the author text.

### Tier 2: High-Value Git Navigation Actions

These are useful and still mostly safe, but need either small service wiring or careful reuse of existing workflows.

- `Compare with Worktree`
  - Reuse `compareResolvedRefWithWorktree` with the commit hash as an unreferenced revision selection.
  - Requires Compare Results presenter wiring into Show Log.
- `Compare with Another Commit`
  - Let the user compare two commits from the Show Log and send the result to the existing Compare Results view.
  - Preferred replacement for `Open Unified Diff` because it provides the same review surface used by graph comparisons.
  - Requires a small Show Log commit selection model, for example `Set as Compare Base` and `Compare with Selected Base`.
- `Create Branch from Commit`
  - Reuse `createBranchFromResolvedReference` with `{ kind: 'commit', refName: commitHash }`.
  - Requires ref action services and refresh strategy.
- `Create Tag from Commit`
  - Reuse `createTagFromResolvedReference` with `{ kind: 'commit', refName: commitHash }`.
  - Requires ref action services and refresh strategy.
- `Show Log from Commit`
  - Reload Show Log with the selected commit as the target source.
  - Simple to implement and useful when the current log is a range or filtered result.

### Tier 3: Powerful but Riskier Actions

These should wait until the Show Log menu has a clear selection model and stronger confirmations.

- `Cherry-pick Commit`
  - Mutates the worktree and can create conflicts.
  - Needs clean-worktree/conflict guards and Source Control reveal handling.
- `Revert Commit`
  - Mutates history/worktree and requires clear safety copy.
- `Reset Current Branch to Commit`
  - Destructive, should not be first release scope.
- `Checkout Commit`
  - Detached HEAD behavior is potentially confusing; branch creation is safer.

## Recommended First Build Scope

For `0.0.30`, start with the compare-between-commits workflow requested by the user, using Ctrl-selection in the Show Log list.

This gives the commit menu immediate practical value while staying within the current Show Log architecture:

- `Open Commit Details`
- `Compare` when exactly two commits are selected and the context menu opens over either selected commit.

Selection behavior:

- A normal click selects one commit and keeps the current expand/collapse behavior.
- `Ctrl+click` adds the clicked commit to an ordered two-commit comparison selection without expanding or collapsing the row.
- The first selected commit is the compare base, and the second selected commit is the compare target.
- The comparison opens in the existing Compare Results view.

## Follow-Up Build Scope

After Tier 1 is stable, add service-backed actions:

- `Compare with Worktree`
- `Create Branch from Commit`
- `Create Tag from Commit`

This should be implemented by sharing the same ref-action service boundary used by the graph, rather than duplicating Git mutation logic in Show Log.

## Non-Goals

- Adding destructive history operations in the first pass.
- Replacing the graph context menu.
- Adding a broad multi-select system in the first pass.
- Publishing or bumping the extension version.

## Acceptance Criteria for First Build Scope

- Commit context menu groups inspect and copy actions clearly.
- `Compare` appears when two commits are selected and the menu opens over one of them.
- `Compare` compares the first selected commit with the second selected commit through the existing Compare Results view.
- Message validation rejects malformed or oversized commit-menu requests.
- Existing file-row context menu behavior remains unchanged.

## Test Plan

- Add Show Log webview shell coverage for the new commit context menu items and grouped clipboard submenu.
- Add message validation coverage for new commit-row actions.
- Add presenter tests or focused helper tests for resolving a loaded commit and rejecting unloaded commit hashes.
- Add compare workflow coverage proving the selected base and clicked commit route to Compare Results.
- Run `npm run build`.
- Run `npm test`.
