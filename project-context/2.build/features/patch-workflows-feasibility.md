# Format Patch and Apply Patch — Feasibility

Status: Discovery complete; refined scope authorized for implementation in 1.7.6
Date: 2026-10-26
Baseline: 1.7.6 development; VS Code minimum 1.100.0

## Goal and Semantics

Evaluate sharing and receiving patches through the existing graph, Compare Results,
Show Log and native workbench architecture. The subsequent implementation request
authorized the refined scope; see the [build record](1.7.6-patch-workflows.md).

| Capability | Contract | Git primitive |
| --- | --- | --- |
| Format Patch | Export a committed change with author, author date and message; a series has one message per non-merge commit. | `git format-patch` |
| Save Patch | Export the complete directed difference between comparison states, including all changed files; no commit metadata contract. | `git diff --binary --full-index` |
| Apply Patch to Worktree | Apply a received diff to disk, preserving HEAD and index. | `Repository.apply()` / `git apply` |
| Apply as Commits | Import a formatted mailbox into the current branch, creating commits with author/message metadata; hashes and committer metadata need not match the originals. | `git am` |

The refined scope includes selected-commit export from Show Log (one file per
commit, approved on 2026-10-27), full-comparison export and HEAD-only worktree import.
Commit-preserving series import remains a later proposal.
Applying a format-patch file to the worktree does **not** restore its authorship or
message as commit metadata; that requires Apply as Commits. File extensions alone
must not select a mutation mode automatically.

## Recommended Placement

Maintainer refinement on 2026-10-26: remove graph Format Patch entry points;
Apply Patch is available only on the currently checked-out branch (HEAD), with
a clean workspace. This supersedes the original toolbar/Command Palette proposal.
The maintainer subsequently specified one Save Patch action beside the existing
Unified Diff button, considering all files in the comparison. No per-file or
selected-file export action is included.

| Surface | Proposed action | Meaning and availability |
| --- | --- | --- |
| Show Log single commit menu, near Open Commit Details | `Format Patch…` | Export exactly the selected commit, independent of paging and filtering. |
| Compare Results toolbar, beside Unified Diff | `Save Patch…` | Export every changed file from source to target, ignoring search/status filters and row selection. Ref-to-worktree exports disk state; unsaved buffers require an explicit save/retry decision. |
| Graph current branch (HEAD) context menu, workspace actions | `Apply Patch…` | Available only for the attached local branch currently checked out, with a clean repository/workspace and no active conflicting operation. |
| Show Log multi-selected commit menu | `Format Patch…` | Choose a folder and export one numbered file per exact selected non-merge commit, without expanding ranges or overwriting existing files. |

Apply has a single entry point: the current branch's graph menu. Do not expose it
on other branches, tags, remotes, historical commits, detached HEAD, stash or a
multi-selection menu. Sharing the same commit hash as HEAD does not make another
reference eligible. Do not add toolbar, Command Palette, Explorer, Compare Results
or Show Log Apply entry points. Format Patch remains in Show Log, not the graph.
Arbitrary multi-selected commits need an explicit ordered list, not an inferred range
that silently includes other commits or depends on the currently loaded page.

Save Patch opens a native save dialog for one complete comparison patch. Include
modified, added, deleted, renamed and binary files, plus untracked additions already
belonging to a worktree comparison. Preserve the comparison's source-to-target
direction and both rename paths. Filters, selection and viewport visibility never
reduce the exported set. Unchanged/ignored files outside the comparison are not
added. Exceeding output limits must fail explicitly, never save a truncated patch.

## Proposed Initial Flows

1. Export: select a Show Log commit, choose Format Patch and a native save destination.
   Pin the commit before the prompt; branch movement must not change it. Generate
   bounded complete output without checkout, then save with normal overwrite handling.
   Cancellation writes nothing; partial output must never appear as a valid export.
   For multiple selected commits, choose a folder; number independent files in
   reverse displayed history order. Load every patch before writing; reject any
   selected merge, empty export or aggregate output above 32 MiB. Remove owned
   partial files after failures/context changes and preserve existing files.
2. Import: open the checked-out branch's graph menu, choose Apply Patch, identify
   destination repository and current branch/HEAD, select one patch,
   read a bounded immutable copy, inspect paths and run `git apply --check`. Show a
   file/change summary and offer patch inspection. Confirm worktree application
   without staging/committing; recheck context and filesystem/editor state after
   prompts and immediately before mutation. Apply the same bytes and reveal SCM.
3. Reject multi-message mailboxes initially rather than applying earlier messages
   before a later failure. Explain that worktree mode does not preserve commit
   metadata. A future Apply as Commits mode explicitly opts into creating commits.

Import requires the chosen repository's clean index and worktree, no untracked files
and no unsaved editors belonging to that repository. Other workspace repositories
retain independent state. The target must be the actual attached local branch by
kind and name, not simply a reference with HEAD's hash or a named detached tag.
On that branch, a dirty workspace can leave the item visible but disabled with an
explanation; other targets omit the action. Reject active merge/rebase/am/cherry-pick/
revert/bisect operations. A patch saved as an untracked file inside that repository consequently
blocks this conservative policy: explain moving it outside rather than exempting
arbitrary files. Dirty-worktree support is outside the agreed constraint.

## Architecture and Safety

- Own the feature in focused patch workflows with injected UI, storage and Git
  services; keep presenters thin. No new runtime dependency is necessary.
- Extend existing typed messages, validation, authorization and action-origin
  handling together. Browser messages carry intent/IDs, not arbitrary Git options.
- Import uses `RepositoryMutationCoordinator`, current-repository invalidation and
  refresh ownership. The coordinator cannot lock external tools or filesystem races.
  Do not automatically reverse patches or reset the repository after errors.
- Enforce attached branch kind/name, repository identity, pinned HEAD and cleanliness
  in host authorization and workflow preflight, not just menu visibility. Recheck
  after file selection, preview and confirmation; a branch switch, HEAD movement,
  newly dirty editor/index/worktree or stale graph message must abort before apply.
- VS Code 1.100.0 exposes `Repository.apply(patch: string, reverse?: boolean)`.
  Source inspection confirms `patch` is a **file path**, executed as `git apply
  <path>` through the operation wrapper. Extend the local minimal Repository
  contract during implementation. Prefer this API for worktree mutation with a
  private absolute temporary file holding the inspected bytes. It exposes no check/
  cancellation options; perform bounded CLI checks and reconcile actual state if
  context changes after API mutation starts.
- Use configured Git and bounded CLI calls for export/check; the inspected public
  API has no `git am` equivalent. Build array arguments with immutable hashes and
  path separators. Existing `gitExec` captures text/binary output but ignores stdin;
  a private patch file avoids inventing stdin support.
- Existing Unified Diff is a presentation path: its tracked/untracked generators
  do not request binary payloads. Export needs binary/full-index output, no color,
  external diff or textconv, stable prefixes and byte-preserving storage. Reuse the
  temporary-index strategy for untracked additions without staging the real index.
- Keep Git unsafe-path protection; never enable `--unsafe-paths`, `--reject`, automatic
  `--3way`, whitespace rewriting or automatic staging in initial worktree mode.
  Validate traversal, absolute/Windows paths, symlinks and gitlinks; define submodule
  and sparse-checkout support explicitly rather than silently skipping changes.
- Default apply rejects the whole patch when a hunk is inapplicable. This is not a
  rollback guarantee for disk errors, termination or external edits; preflight is
  valid only for its observed state. Report and reconcile failures.
- A merge must not silently export an ancestor. Offer a separately named diff
  against a deliberately selected parent if needed, without a topology guarantee.
  Cover root and empty commits without blindly deriving `<hash>^`.
- `git am` requires a separately owned, persisted lifecycle with partial progress,
  Continue / Skip / Abort, reload recovery and external-session takeover protection.
  It can run configured applypatch hooks. Address branch, signing and author/
  committer policies explicitly before implementing commit-preserving import.

## Evidence and Verification Plan

Graphify scoped the ownership boundaries; source inspection confirmed current menus,
the coordinator and diff loader. Context7 `/git/htmldocs` corroborated format-patch/am
and revision ranges but did not adequately answer root/merge/atomicity details.
Official manuals, exact VS Code 1.100.0 source and disposable experiments supplied
those details.

An isolated Python-driven Git 2.55.0 fixture passed on 2026-10-26 without modifying
the project checkout:

- Root `format-patch -1 --stdout` includes that root's mailbox header.
- `format-patch -1 <merge>` exported an ancestor, not the selected merge.
- An empty commit produced 189 bytes of mailbox output. Importing empty messages
  was not tested and needs a deliberate policy.
- A binary-capable comparison patch applied addition, deletion, rename and binary
  content while preserving HEAD and index bytes.
- One incompatible hunk caused default apply to fail without changing any fixture
  worktree file or index bytes.
- A two-message format-patch series imported with am created two commits, retained
  authorship and produced the expected target tree.

Jev advisory (`jev-1.14.0`) preferred explicit worktree-first import (0.98), while
flagging that this alone does not preserve commit metadata. This is an assessment,
not correctness evidence or maintainer approval. The explicit metadata warning and
separate Apply as Commits contract above address that gap.

Before delivery, cover malformed/oversized input, unsafe paths, binary/rename/mode/
EOL handling, root/empty/merge commits, partial series, external changes, stale
dialogs and cancellation. Test clean/dirty HEAD, detached/tag/remote/other-branch
targets (including shared hashes), forged requests and branch switches during prompts.
Verify full-comparison export under active search/status filters, row selection and
virtual scrolling, including all change kinds and worktree untracked additions.
Run build, relevant tests, platform and real minimum/
stable Extension Host checks; include Windows and multi-repository smoke.
No runtime, manifest, dependency or version changes occurred during discovery;
the existing full suite was not rerun for this documentation-only change.

Effort/risk: single-commit export low-to-moderate; comparison export moderate;
guarded worktree import moderate-to-high; resumable commit-series import high.
Rollback removes eventual entry points/workflows; never automatically revert
already-applied user changes or commits.

## Sources

- [Git format-patch](https://git-scm.com/docs/git-format-patch)
- [Git apply](https://git-scm.com/docs/git-apply)
- [Git am](https://git-scm.com/docs/git-am)
- [VS Code 1.100 Git API](https://github.com/microsoft/vscode/blob/1.100.0/extensions/git/src/api/git.d.ts)
- [VS Code apply implementation](https://github.com/microsoft/vscode/blob/1.100.0/extensions/git/src/git.ts)
- [VS Code operation wrapper](https://github.com/microsoft/vscode/blob/1.100.0/extensions/git/src/repository.ts)
- [TypeSafe Choice](https://docs.typesafe.ai/primitives/choice)
