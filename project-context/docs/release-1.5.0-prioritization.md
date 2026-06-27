# Release 1.5.0 Prioritization

## Release Status

Status: Release cycle open. The implementation scope is proposed and is not yet frozen or approved.

- Published package baseline: `1.4.0`.
- Target release: `1.5.0`.
- Package metadata is `1.5.0` in `package.json` and `package-lock.json` after the approved release opening.
- The maintainer confirmed all `1.4.0` Deliver gates complete on 2026-06-27, including Marketplace publication.
- Do not implement proposed slices, package a new VSIX, update dependencies, or publish until their respective gates are approved.

## Objective

Deliver `1.5.0` as a reliability and safety release that hardens privileged Git actions, repository lifecycle handling, filesystem restore behavior, bounded process execution, graph layout failure recovery, and Git history parsing.

The release should preserve the current Source Control-launched singleton graph, Compare Results and Show Log editor panels, command IDs, native VS Code ergonomics, multi-repository behavior, and existing Git workflow semantics. It should not add a new product surface.

## Evidence and Direction

The Graphify review of `src/` reported 964 nodes and 2,958 relationships. Its principal bridges include `Repository`, `RevisionGraphController`, `layeredLayout.ts`, and `gitExec.ts`. Direct inspection and fault-oriented testing identified the following release themes:

- overlapping or stale repository mutations can cross asynchronous confirmation boundaries;
- rejected webview message handlers are not consistently contained at the VS Code event boundary;
- lexical restore path checks do not establish symlink-safe filesystem containment;
- several local Git CLI mutations have no timeout or captured-output limit;
- worker layout failure can repeat expensive layout work synchronously in the extension host;
- control characters in Git commit text can collide with current record framing;
- Compare Results and Show Log can retain repository objects after repository closure;
- ref content load failures are presented as empty content.

The `1.4.0` automated baseline is strong: `npm test` passes with 466 tests, `npm audit --omit=dev` reports zero production vulnerabilities, and the full development dependency audit currently reports 11 transitive findings, including 5 high-severity findings.

## Proposed Scope

### Priority 0: mutation integrity and asynchronous containment

1. Add a reusable webview message execution boundary that catches unexpected rejections, restores a coherent non-loading state, records actionable diagnostics, and avoids unhandled promise rejections.
2. Add a per-repository mutation coordinator for workspace-changing actions.
3. Reject overlapping mutations instead of queueing them for later execution.
4. Revalidate repository identity, repository availability, relevant ref/commit state, and operation generation immediately before mutation after any prompt or picker.
5. Preserve existing clean-worktree, merge-conflict, confirmation, refresh, and cancellation semantics.

### Priority 1: filesystem and Git process safety

1. Replace lexical-only restore containment with a symlink-aware strategy.
2. Preserve correct tracked-file behavior for regular files, renames, executable files, and symbolic links without allowing writes outside the selected repository.
3. Apply explicit timeout and captured-output policies to every targeted Git CLI call.
4. Ensure cancellation and timeout settle once, terminate spawned work reliably, and preserve bounded diagnostic stderr.
5. Replace control-character Git log framing with a NUL-safe protocol for graph and Show Log parsing.

### Priority 2: lifecycle and failure recovery

1. Invalidate and close Compare Results and Show Log when their repository closes or is no longer present in the Git API repository set.
2. Cancel in-flight Show Log loads and discard late responses during repository invalidation.
3. Make worker exit without a result, worker timeout, worker error, and cancellation settle deterministically.
4. Do not repeat expensive layout synchronously in the extension host for medium or large graphs; use a bounded fallback or an actionable retry state.
5. Surface ref-backed content load failures instead of returning an indistinguishable empty document.

### Priority 3: release engineering

1. Add focused fault-injection and concurrency regression coverage for every slice.
2. Establish an automated CI matrix for supported Node/VS Code build assumptions and at least Linux and Windows path/process behavior, subject to maintainer approval.
3. Update vulnerable development dependencies only after explicit dependency-change approval; require zero high-severity production findings and no unexplained high-severity development findings for the release candidate.
4. Re-run Graphify after implementation and review whether new coordinators or adapters became excessive cross-community bridges.

## Sequencing and Gates

### Wave 0: release baseline

- All `1.4.0` Deliver gates confirmed complete by the maintainer. Complete.
- Record the `1.5.0` opening comparison baseline. Complete: `0fd5263e5fdbcaaeb9d305abf981f7e01e895936`.
- Capture baseline test count, audit output, graph load trace, and representative graph size.
- Obtain maintainer approval for the `1.5.0` scope before implementation.

### Wave 1: host action safety

1. Webview rejection containment.
2. Per-repository mutation coordinator.
3. Post-prompt repository and state revalidation.
4. Repository-close invalidation for graph-dependent panels.

Wave 1 is the critical path because later restore, Git execution, and panel changes must use the same operation context and error boundary.

### Wave 2: data and process safety

1. Git execution policy and process-settlement hardening.
2. Symlink-safe restore implementation using the approved restore strategy.
3. NUL-safe graph and Show Log parsing.
4. Explicit ref content provider failures.

Implement the Git execution policy before a Git-native restore strategy if that strategy is approved.

### Wave 3: layout resilience

1. Worker timeout and exit-without-result handling.
2. Size-aware fallback policy that protects the extension host.
3. Failure diagnostics and retry UX using the existing graph surface.

### Wave 4: release closure

1. Full automated verification and audit review.
2. Cross-platform and Extension Development Host manual matrix.
3. README/CHANGELOG/release note updates limited to implemented behavior.
4. Confirm final version metadata, then run VSIX packaging, clean-profile installation, and Marketplace publication only after explicit approval.

## Acceptance Criteria

- Two concurrent mutation requests for the same repository cannot both reach Git.
- A mutation cannot execute after its repository was switched, removed, closed, or invalidated while a prompt was open.
- Unexpected webview handler rejection is contained, logged, shown through an actionable message when appropriate, and leaves the panel usable.
- Restore cannot modify a target outside the selected repository through a symlink or symlinked ancestor.
- Restore behavior is covered for additions, deletions, renames, regular files, executable files, and symbolic links.
- Every targeted Git CLI execution has a reviewed timeout, output cap, cancellation behavior, and deterministic settlement path.
- Commit subjects and bodies containing `U+001E` or `U+001F` round-trip without corrupting commits or refs.
- Closing a repository invalidates dependent Compare Results and Show Log state and cancels relevant in-flight work.
- Worker failures never leave a layout promise pending and do not trigger an unbounded synchronous layout on the extension host.
- Ref content load failures cannot masquerade as valid empty files.
- Zero- and multi-repository workspaces, conflicts, canceled prompts, retained panels, and stale responses remain correct.
- `npm run build`, `npm test`, `git diff --check`, and `npm audit --omit=dev` pass on the exact release-candidate commit.
- Manual Extension Development Host verification is recorded before packaging approval.

## Verification Plan

### Automated tests

- Deferred-promise tests for double dispatch, concurrent mutation, repository switch during confirmation, and repository close during confirmation.
- Event-boundary tests where graph, Compare Results, and Show Log handlers reject.
- Filesystem fixtures with symlinked files and directories pointing outside the repository.
- Git process fixtures for timeout, output flood, cancellation, non-zero exit, child-process settlement, and allowed exit codes.
- Parser fixtures containing record separators, field separators, multiline bodies, unusual author text, and decorated refs.
- Worker fixtures for result, error, non-zero exit, zero exit without result, timeout, and abort.
- Provider tests that distinguish valid empty blob content from a failed `git show`.
- Full regression suite after every wave.

### Manual Extension Development Host matrix

- Single repository, multi-repository workspace, repository removal, and repository reopen.
- Double-trigger destructive and remote actions; verify only one operation proceeds.
- Switch repositories while confirmations and Quick Picks are open.
- Keep Compare Results and Show Log open while removing their repository.
- Exercise restore with spaces, nested paths, renames, executable files, and supported symlink cases.
- Trigger graph refresh, cancellation, worker failure simulation, retry, and panel disposal.
- Verify compare, diff, checkout, branch, tag, sync, pull, push, merge, abort, stash, reset, delete, Show Log, and unified diff regressions.
- Record operating system, VS Code version, Git version, fixture commits, tester, and date.

## Exclusions

- No new command, menu, view, persistent panel, setting, or product surface.
- No full-history graph loading or graph architecture replacement.
- No replacement of the built-in `vscode.git` API for operations it already handles well.
- No dependency additions or upgrades without explicit maintainer approval.
- No opportunistic graph UX, parity, or feature work unrelated to the identified reliability risks.
- No further version change, packaging, or publication during unapproved Build work.

## Rollback Strategy

- Keep each wave independently revertible and avoid combining unrelated hardening slices in one commit.
- Mutation coordination can be disabled by reverting the coordinator wiring while preserving the error boundary.
- Restore hardening must retain the previous implementation behind no runtime toggle; revert the complete slice if platform validation fails.
- Parser format and parser implementation must change atomically.
- Worker fallback changes must preserve the existing worker entrypoint and package layout.
- Keep the last validated `1.4.0` VSIX available until `1.5.0` clean-profile validation succeeds.

## Marketplace Positioning

Describe `1.5.0` as a reliability and safety release. Claims should name implemented outcomes such as prevention of duplicate Git actions, safer repository switching, bounded Git execution, resilient graph layout, and correct parsing of unusual commit text. Do not claim fixes that lack automated and manual verification.

## References

- `project-context/2.build/features/1.5.0-robustness-hardening.md`
- `project-context/3.deliver/release.md`
- `project-context/1.define/prd.md`
- `project-context/1.define/sad.md`
- `project-context/1.define/open-questions.md`
- `src/graphify-out/GRAPH_REPORT.md`
- `.codex/skills/vscode-extension-developer/references/project-map.md`
