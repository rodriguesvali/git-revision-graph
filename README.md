# Git Revision Graph

**Visualize. Compare. Act. — without leaving VS Code.**

Git Revision Graph turns Git history into an interactive editor workspace. Explore branches and
merges, review changes, inspect commit history, and run guarded Git workflows from the graph while
staying close to VS Code Source Control and native diff editors.

[Install from the Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=rodriguesvali.git-revision-graph)

<video
  src="https://raw.githubusercontent.com/rodriguesvali/git-revision-graph/main/media/marketplace/overview-demo.webm"
  poster="https://raw.githubusercontent.com/rodriguesvali/git-revision-graph/main/media/marketplace/overview-demo-poster.png"
  controls
  muted
  playsinline
  title="Git Revision Graph overview: navigate the graph, compare revisions, and inspect commit history">
  Your browser does not support HTML video. Use the screenshots below for a product overview.
</video>

## Start In Source Control

Open **View Git Revision Graph** from the Source Control toolbar or Command Palette. The active
repository opens in a full-size editor panel, with repository selection available for
multi-repository workspaces.

![Revision Graph with branches, tags, remotes, and merge topology](https://raw.githubusercontent.com/rodriguesvali/git-revision-graph/main/media/marketplace/01-revision-graph.png)

Center on HEAD is disabled when HEAD is absent from the current graph, including after filtering.
Reference context menus adapt to the available panel width and wrap long names so their full
action targets remain readable.
With a reference focused, press **Shift+F10** or the **Menu** key to open its actions.
Use **Up/Down**, **Home/End**, and **Right/Left** to navigate actions and submenus;
**Enter** activates an action, **Esc** closes one menu level, and **Tab** leaves the menu.

Use graph scopes, search, focus modes, zoom, and the minimap to move from repository-wide context to
the revisions that matter. Large scenes use bounded history, host-side layout, caching, and
virtualized rendering to remain responsive.

The graph uses a compact automatic view that preserves references and structural
connections. Intermediate commits can be compressed into connecting paths;
**View** controls tags, remote branches, stashes and the minimap.

Custom tooltips in the graph and Show Log appear after 1 second of hover.

Use **Apply Patch…** from the currently checked-out branch's context menu. The
chosen repository must have no staged/unstaged changes, untracked files or unsaved
editors. Select one patch and confirm its destination and change summary.
Changes remain unstaged; no commit is created. Detached HEAD, patch series and
submodule imports and sparse-checkout application are not supported. Keep an input patch outside the repository
if it would otherwise be an untracked file.
An exported empty commit contains no file changes to apply; use `git am --empty=keep`
if you want to recreate that commit from its mailbox.

## Compare Without Losing Context

Select two visible references or commits to open **Compare Results**, or compare one revision with
the current worktree.
Comparisons between revisions use their final contents directly. Branches with
identical contents report no differences even when their commit histories differ.

![Compare Results with status filters and changed files](https://raw.githubusercontent.com/rodriguesvali/git-revision-graph/main/media/marketplace/02-compare-results.png)

- Review changed files as a compact queue with status filters and rename-aware paths.
- Keep filters and valid file selections during briefing updates and worktree refreshes in
  the same comparison. A new comparison starts with cleared filters and a fresh selection.
- Actions stay bound to the repository and review context that displayed them;
  delayed clicks from a replaced context are ignored.
- Open file changes in VS Code's native diff editor or inspect the complete Unified Diff.
- Use **Save Patch…** beside Unified Diff to save all changes from source to target,
  including binary files. Search/status filters and selection do not restrict export.
  The suggested name is `from<source-hash>to<target-hash>compare_<number>.patch`,
  using 8-character hashes (`worktree` for a workspace target). Numbers advance per
  comparison after successful saves and account for matching files in the default folder.
  Save unsaved editors before exporting a worktree comparison.
  In sparse checkouts, export a reference-to-reference comparison instead.
- Use **Open File** to edit the current worktree file, or open a labeled historical
  source/target version read-only. Comparisons pin their revisions when loaded.
  Added files have no source version; deleted files have no target version.
  Historical availability is independent of whether the file exists locally.
- Compare an item with the worktree. Use **Revert** to restore the selected
  revision's file into the worktree. Comparisons between references omit this action.
- Failed file restores attempt to recover the previous files. If automatic recovery
  cannot finish, the error identifies retained copies for manual recovery.
- Generate an optional, user-initiated AI Briefing through an available GitHub Copilot language
  model. Diff context is bounded, filtered, and sanitized before it reaches the model.

## Inspect History With Show Log

Open **Show Log** from any visible branch, tag, remote reference, stash, or commit. The log starts on
the exact selected target; **Show All Branches** is available when broader history is intentional.

![Show Log with compact commits, reference badges, and expanded file changes](https://raw.githubusercontent.com/rodriguesvali/git-revision-graph/main/media/marketplace/03-show-log.png)

- Inspect compact commit history for one target or an explicit `base..compare` range.
- Search commit metadata, filter by changed files or code, load additional pages automatically,
  and expand commits for changed files.
- Open file diffs, compare commits with the worktree, copy hashes and reference names, and open
  supported commits on their hosted remote.
- Use **Format Patch…** to export non-merge commits with author and message metadata.
  Select multiple commits with **Ctrl/Cmd + click**, then choose a destination folder:
  each selected commit gets its own numbered `.patch` file, in reverse displayed
  history order. Existing files are never overwritten by a batch export. A single
  commit uses the Save dialog. Applying a patch to the worktree does not create a commit.
- From an expanded file, use **Open File** for the current version or open the
  commit version read-only. For deletions, open the explicitly labeled parent
  version. Missing local files are reported without creating or restoring them.
  Historical single-file opening supports text; binary previews are not provided.
- Create branches or tags from exact commits, check out a commit to a new branch, reset with
  confirmation, and cherry-pick selected commits with conflict handoff to Source Control.

Show Log accepts `file:src/auth/` for changes to a repository-relative file or directory and
`change:"validateToken("` for literal text in added or removed text lines. Combine them with
ordinary metadata text, for example `file:src/auth/ change:"validateToken(" fix parser`, to require
all conditions. Quote values containing spaces; inside quotes, use `\"` for a quote and `\\` for a
backslash. File paths and changed text are case-sensitive, without wildcards or regular expressions.
Paths match their name at each commit; the filter does not follow earlier names across renames.
Ordinary text retains case-insensitive matching against hashes, authors, messages and references.
Search checks up to 2,000 commits in the selected scope and identifies results when older history
was not searched.

Expand a commit to search its changed files with `change:"validateToken("` in the
file filter. An active commit-level `change:` search is applied there automatically,
including its `file:` restriction when present. Edit or clear that filter to explore
other changes; ordinary text still filters file paths and status without regard to case.

## Work Directly From The Graph

Use **Open File at Revision…** on a graph branch, tag or commit to search all
files present at that revision and open one read-only. The selected commit stays
fixed if a branch advances. Canceling the picker changes nothing; switching
repositories or closing the graph cancels the request. No checkout is required.


Use **Find Bug Against HEAD…** on a graph reference or a single Show Log commit
to find the first revision introducing a bug. Confirm which endpoint has the bug,
then test each checkout and choose **Bug absent**, **Bug present**, or **Cannot test**.
Use **Minimize** to keep the graph visible and classify ready test commits with
**Bug absent** / **Bug present** in the compact banner. Use **Expand** for
**Cannot test**, **Undo last answer**, history and recovery. Decisions remain
disabled while updating or blocked by an error; completion opens the result once.
Skipped revisions can leave several possible culprits.

During the search, **Bisect Commit** marks the checked-out test revision in the
graph, remains visible through scope/focus filters and centers on each new step.
The marker is visual only and disappears when the search ends.

The chosen repository must have no staged, unstaged, untracked or conflicted files,
and its open files must be saved before switching revisions. Other workspace
repositories do not block the search. Finishing or stopping returns to the original
branch or detached commit. Sessions survive graph closure and window reloads;
incompatible Git mutations are blocked until the search ends. If external Git
changes invalidate ownership, **Detach controls (keep Git state)…** releases the
extension's controls without resetting Git or changing the checkout; restoration
then remains manual. Test commands are run by you.

The graph keeps everyday Git actions close to their revision context:

| Area | Available workflows |
| --- | --- |
| Navigation | All refs, current branch, `origin/HEAD`, and local-branch scopes; search by ref, hash, subject, or author; Focus Range; Focus Descendants remembered per repository across window reloads; relationship highlighting; minimap; zoom; Center HEAD; persisted view options. |
| Branches and tags | Checkout local or remote branches, create a branch or tag from a visible revision, publish a local branch with upstream tracking, push or remove remote tags, and delete supported local or remote refs. |
| Remote synchronization | Fetch with optional Prune and Tags flags, Pull, Push, confirmed force-push modes, and Sync for the tracked current branch. The toolbar offers Publish Branch to Remote when the current branch has no matching upstream, then switches to Push after publication. Remote work uses nonblocking progress so the graph remains interactive. |
| History and recovery | Merge into the current branch, abort a conflicted merge, reset to a revision, stash workspace changes, apply/pop/drop visible stashes, and restore selected worktree files. |
| Hosted remotes | Open exact commits on supported GitHub, Azure DevOps, GitLab.com, and AWS CodeCommit remotes. |
| Repository support | Automatic repository-state refresh, actionable empty states, and explicit selection for multi-repository workspaces. |

Workspace-changing actions use confirmations, clean-worktree and conflict checks, repository-scoped
mutation coordination, and actionable failure messages. Conflicts remain in VS Code Source Control,
where the normal resolution workflow is already available.

## Optional Flow Governance

Flow Governance adds repository-defined branch classification and guided delivery workflows without
replacing normal Git Revision Graph behavior.

- Display compact, theme-aware badges for main, release, feature, package, task, hotfix, bug, and
  synchronization branches.
- Start releases and hotfixes from main, features from main, a release or a package, packages from
  main, a feature or release, tasks from a feature or release, and bugs from a feature, release or package.
- Run fetch-first readiness checks, synchronize safe behind-only sources after confirmation, preserve
  ahead-only work, and block divergent sources for manual reconciliation.
- Prepare local `sync/*` equalization branches without automatic push and hand governed integrations
  off to supported Pull Request workflows.
- Preview the source, target/base, expected branch name, checkout and merge effects before submitting
  branch or equalization forms. The summary highlights the final name, separates validation feedback,
  and offers expandable details with the full name. Names follow the repository configuration. Incomplete or invalid names
  show a compatible example or the required pattern. Previews identify conflicts with known local and
  remote-tracking branches; submission rechecks availability. If a preview is temporarily unavailable,
  use **Retry preview** without changing the entered name.
- Navigate branch and equalization dialogs with Tab/Shift+Tab. Escape closes idle forms; closing
  restores focus to the previous control or View when that control is no longer available.
- Keep branch and equalization form input after a failed operation so it can be corrected and retried.
  If a branch was already created before a later step failed, review its state before starting another operation.
- Improve branch descriptions only when the user explicitly requests assistance from an available
  GitHub Copilot language model.

Create the repository configuration with **Create Flow Governance Config**, or enable Flow
Governance from the graph's **View** menu. Activation is saved in the repository configuration file;
the checked checkbox indicates activation, and **Saving…** appears while the update is pending.
A missing or invalid configuration never blocks the standard graph. The **View** menu shows configuration status
and validation details; use **Open Configuration** to inspect the file, then reload the graph after
correcting it.

## Quick Start

1. Install **Git Revision Graph** from the Marketplace.
2. Open a folder containing a Git repository.
3. Open Source Control and select **View Git Revision Graph** from its toolbar.
4. Select one revision for contextual actions or Ctrl/Cmd-click two revisions to compare them.

The graph, Compare Results, and Show Log are editor panels. Closing the graph also closes its
on-demand review panels.

## Settings

| Setting | Purpose | Default |
| --- | --- | --- |
| `gitRevisionGraph.traceLoading` | Writes graph loading diagnostics to the Git Revision Graph output channel. | `false` |
| `gitRevisionGraph.graphCommandTimeoutMs` | Sets the bounded timeout for revision-history Git commands. | `60000` ms |
| `gitRevisionGraph.flowGovernance.configPath` | Selects the repository-relative Flow Governance configuration path. | `.git-revision-graph-flow.json` |

## Requirements And Current Boundaries

- Visual Studio Code `1.100.0` or newer, Git, and the built-in VS Code Git extension.
- The graph intentionally loads a bounded recent-commit window instead of unbounded full history.
- Merge conflict resolution is delegated to the standard VS Code Source Control experience.
- Binary files and unusual encodings may not render meaningfully in textual diffs.
- Hosted commit and Pull Request actions depend on the configured remote provider and supported URL
  shape.

## Project Links

- [Changelog](CHANGELOG.md)
- [Contributing and local development](CONTRIBUTING.md)
- [Issues](https://github.com/rodriguesvali/git-revision-graph/issues)
- [Source repository](https://github.com/rodriguesvali/git-revision-graph)

## License

[MIT](LICENSE)

## Credits

Git Revision Graph was inspired by revision-graph workflows in
[TortoiseGit](https://tortoisegit.org/).
