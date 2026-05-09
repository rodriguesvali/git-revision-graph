# Show Log Text Filter

## Define Status

Feasibility analysis complete. Build implementation is tracked in `project-context/2.build/features/0.0.30-show-log-text-filter.md`.

Version bump, package generation, and Marketplace publishing remain unapproved.

## Goal

Add a TortoiseGit-like text filter to Show Log so users can type a term and find commits whose searchable metadata contains that text.

## User Workflow

A user opens Show Log from a graph reference or revision range, types text into a filter field, and sees matching commits for the active log scope. The filter should help find commits by description/message, author, hash, and reference labels without leaving the Show Log surface.

## Current Architecture Fit

- `ShowLogViewProvider` owns the current source, entries, paging, loading state, and webview message handling.
- `DefaultRevisionGraphBackend.loadRevisionLog` already loads paged Git history through targeted `git log` calls.
- `RevisionLogEntry` already contains searchable fields: `hash`, `shortHash`, `author`, `subject`, full `message`, and `references`.
- `buildShowLogWebviewState` is the right place to expose filtered rows and filter state to the webview.
- `showLog/messageValidation.ts` already bounds webview messages and should add a bounded filter message.

## Recommended Approach

Implement an extension-host-backed filter, not a purely browser-only filter.

The webview should own the input control and debounce user typing, then send a bounded `setFilterText` message. The presenter should store the normalized filter in `ShowLogState`, reset paging and expanded commit state when the filter changes, and reload entries through the backend for the active source.

The backend should filter parsed `RevisionLogEntry` objects in TypeScript against a normalized searchable string built from:

- full commit message
- subject
- author
- full hash and short hash
- reference names and formatted labels

For filtered pagination, the backend can scan bounded `git log` batches until it has enough matching entries for the requested page or the log is exhausted. This keeps search behavior broader than the currently loaded 50 commits while preserving existing timeout and output-limit protections.

## Alternative Considered

A browser-only filter over `state.commits` would be very low risk and instant, but it would only search commits already loaded in the current page. That would likely feel incomplete compared with TortoiseGit because older matching commits would be invisible until the user scrolls enough pages first.

Using Git's `--grep` and `--author` directly can reduce work for message-only searches, but a single free-text field across message, author, hashes, and refs is easier to keep correct by parsing and filtering entries in TypeScript. Git options can be revisited later if large-repository performance becomes a problem.

## Proposed Scope

- Add a filter input to the Show Log toolbar.
- Add `filterText` to Show Log extension state and webview state.
- Add a bounded `setFilterText` webview message with debounce in the webview runtime.
- Reload the Show Log results when the filter changes.
- Match case-insensitively across message, author, hashes, and references.
- Keep existing Show All Branches, range logs, commit expansion, file actions, and Load More behavior working.
- Show an empty state when no commits match the active filter.

## Non-Goals

- Regex search.
- Path/file-name filtering.
- Highlighting matched text inside rows.
- Full advanced TortoiseGit filter syntax.
- Changing the revision graph search box.
- Publishing or bumping the extension version.

## Acceptance Criteria

- Typing a filter updates Show Log results for the active source after a short debounce.
- Matching includes commit description/message and author at minimum.
- Matching also includes hash and visible reference names.
- Clearing the filter restores the unfiltered paged log.
- `Load More` continues to page through filtered results.
- Toggle `Show All Branches` preserves the current filter and reloads the filtered scope.
- Invalid or oversized filter messages are rejected by webview message validation.
- Existing commit expansion and file actions remain scoped to loaded filtered commits.

## Risks

- Full-history search can be expensive in very large repositories if implemented without a scan budget.
- Re-scanning from the beginning for filtered pagination is simple but can repeat Git work.
- Filtering only parsed batches may miss older matches if the scan budget is too low.

## Open Decisions

- Choose the initial scan budget for filtered searches, for example 1,000 or 2,000 commits per request.
- Decide whether the empty state should distinguish "no matches in scanned commits" from "no matches in full log" when a scan budget is reached.
- Decide whether the filter field should persist in VS Code webview state after hide/show or reset whenever a new Show Log source is opened.

## Test Plan

- Add shared-state tests for filtered summary, empty state, and searchable fields.
- Add backend tests for filtered log paging and case-insensitive matching.
- Add message validation tests for bounded `setFilterText`.
- Add webview shell tests for the filter input, clear action, and debounced message wiring.
- Run `npm run build`.
- Run `npm test`.
