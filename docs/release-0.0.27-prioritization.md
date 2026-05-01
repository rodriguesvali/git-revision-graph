# Release 0.0.27 Prioritization

## Intent

Version `0.0.27` should be a stabilization and hardening release.

The release should avoid broad feature work and focus on reducing security, reliability, and operational fragility in the existing extension surfaces: targeted Git CLI calls, webview message handling, compare restore operations, and release dependency posture.

## Inputs Reviewed

- `package.json` baseline version `0.0.26`
- `project-context/3.deliver/release.md` current release readiness state for `0.0.26`
- `README.md` known limitations and validation strategy
- `docs/revision-graph-parity-plan.md`
- Existing runtime surfaces in `src/extension.ts`, `src/revisionGraph/controller.ts`, `src/revisionGraph/backend.ts`, `src/revisionGraph/source/graphGit.ts`, `src/compareResultsView.ts`, `src/showLogView.ts`, `src/gitExec.ts`, and `src/workbenchRefActionServices.ts`
- `npm audit --omit=dev --json`
- `npm audit --json`

## Product Observations

- Recent releases focused heavily on graph readability, layout resilience, minimap behavior, refresh efficiency, and Git workflow breadth.
- A stabilization release is well timed because the extension now has several powerful user-facing workflows that run Git commands, open diffs, restore worktree files, and accept webview messages.
- Production dependencies currently report no `npm audit --omit=dev` vulnerabilities.
- Development dependencies currently report moderate transitive audit findings through `@vscode/vsce -> @azure/identity -> @azure/msal-node -> uuid`; this affects packaging/tooling posture rather than runtime extension code.

## Recommended Scope

### 1. Harden Git CLI Revision Arguments

Risk:

- Known refs from a repository can include names that Git may parse as command options when passed directly as revisions.
- The most sensitive paths are unified diff, show log, commit/log helpers, remote tag lookup, and ref-backed content reads.

Candidate fixes:

- Add a centralized safe revision/ref argument helper.
- Prefer full ref names where the ref kind is known.
- Use Git's option terminator support where valid for the command.
- Add regression tests for tags or refs whose short names begin with `-` or otherwise look option-like.

Primary touchpoints:

- `src/revisionGraph/backend.ts`
- `src/revisionGraph/source/graphGit.ts`
- `src/revisionGraph/repository/log.ts`
- `src/refContentProvider.ts`
- `src/workbenchRefActionServices.ts`
- tests around revision log args, unified diff, and ref content.

### 2. Bound Git CLI Output And Duration

Risk:

- Some Git CLI calls can return very large output or hang long enough to degrade the extension host.
- Graph snapshot loading already has output bounds and abort support, but unified diff, commit details, show log, and fetch paths are less consistently bounded.

Candidate fixes:

- Extend `GitExecOptions` with a timeout option.
- Apply output caps and timeouts to unified diff, commit details, show log, fetch with tags, and ref restore `git show` operations.
- Surface clear user-facing messages when a command is stopped for size or time.

Primary touchpoints:

- `src/gitExec.ts`
- `src/revisionGraph/backend.ts`
- `src/revisionGraph/controller.ts`
- `src/workbenchRefActionServices.ts`
- `test/gitExec.test.ts`

### 3. Guard Worktree Restore Paths

Risk:

- `Compare Results -> Revert to This` writes and deletes worktree files using paths from the Git API change object.
- The current flow assumes those paths are within the repository. That is probably true for normal Git API output, but a stabilization release should make the invariant explicit before destructive filesystem operations.

Candidate fixes:

- Add a repository containment check before every delete/write path.
- Reject absolute/relative escape paths and surface a clear error.
- Add tests for restore plans that would target paths outside the repository root.

Primary touchpoints:

- `src/workbenchRefActionServices.ts`
- `src/compareResultRestore.ts`
- `test/compareResultRestore.test.ts`

### 4. Tighten Webview Message Budgets

Risk:

- Message validators verify shape and known state for major graph actions, but they do not consistently cap string or array sizes.
- A malformed or compromised webview could send oversized labels, arrays, or IDs that create needless extension-host work.

Candidate fixes:

- Add shared maximum lengths for webview message strings and selection arrays.
- Keep existing state-based checks for graph actions.
- Add tests for oversized graph, compare-results, and show-log messages.

Primary touchpoints:

- `src/webviewMessageValidation.ts`
- `src/revisionGraph/messageValidation.ts`
- `src/compareResults/messageValidation.ts`
- `src/showLog/messageValidation.ts`
- `test/webviewMessageValidation.test.ts`

### 5. Refresh Packaging Dependency Posture

Risk:

- Runtime dependencies are clean under `npm audit --omit=dev`, but dev tooling has moderate transitive findings through `@vscode/vsce`.

Candidate fixes:

- Check whether a lockfile-only update or `@vscode/vsce` patch/minor update resolves the moderate audit items without changing extension runtime dependencies.
- Run `npm audit --omit=dev --json`, `npm audit --json`, `npm run build`, and `npm test` after any dependency update.

Primary touchpoints:

- `package.json`
- `package-lock.json`

## Out Of Scope By Default

- Graph focus filters, saved filters, or other new product features.
- Full-history graph rendering.
- New Git mutation workflows.
- Marketplace publication, version bumping, or VSIX packaging without explicit approval.
- Broad architecture rewrites.

## Suggested Release Narrative

`0.0.27` should be positioned as a reliability release:

- hardened Git command argument handling
- bounded expensive Git outputs
- safer compare restore filesystem behavior
- stricter webview message validation
- refreshed packaging dependency posture

## Acceptance Criteria

- Option-like refs/tags cannot alter targeted Git CLI command behavior.
- Expensive Git command paths have explicit output limits, cancellation, or timeout behavior.
- Compare restore refuses to write or delete outside the selected repository root.
- Webview message validators reject oversized payloads before command handling.
- Runtime dependency audit remains clean.
- Development dependency audit status is documented, resolved if low risk, or explicitly accepted if tooling fixes require undesirable churn.

## Verification Plan

- `npm run build`
- `npm test`
- `npm audit --omit=dev --json`
- `npm audit --json`
- Manual Extension Development Host smoke:
  - Open a repository with normal refs and verify graph loading, show log, unified diff, compare results, and restore flows.
  - Test or simulate option-like tag/ref names and confirm diff/log paths fail safely or resolve the intended ref.
  - Verify a large diff or intentionally slow Git command reports a clear bounded failure instead of hanging indefinitely.
  - Verify compare restore still works for normal modified, added, deleted, and renamed files.

## Risks

- Git option-terminator behavior differs by command and Git version; fixes should be command-specific and tested.
- Output caps can interrupt legitimate large diffs, so user-facing messages need to explain the limit.
- Dependency updates for packaging tools can create lockfile churn; keep the update narrow.

## Open Questions

- Should dependency-tooling audit fixes be included in `0.0.27` if they only affect packaging and development dependencies?
- What output limits and timeouts are acceptable for unified diff, commit details, show log, fetch, and restore operations?
- Should option-like refs be blocked at the webview/action layer, normalized to full refs, or handled only by Git argument construction?
