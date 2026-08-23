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

Use graph scopes, search, focus modes, zoom, and the minimap to move from repository-wide context to
the revisions that matter. Large scenes use bounded history, host-side layout, caching, and
virtualized rendering to remain responsive.

## Compare Without Losing Context

Select two visible references or commits to open **Compare Results**, or compare one revision with
the current worktree.

![Compare Results with status filters and changed files](https://raw.githubusercontent.com/rodriguesvali/git-revision-graph/main/media/marketplace/02-compare-results.png)

- Review changed files as a compact queue with status filters and rename-aware paths.
- Open file changes in VS Code's native diff editor or inspect the complete Unified Diff.
- Compare an item with the worktree and restore guarded worktree files when needed.
- Generate an optional, user-initiated AI Briefing through an available GitHub Copilot language
  model. Diff context is bounded, filtered, and sanitized before it reaches the model.

## Inspect History With Show Log

Open **Show Log** from any visible branch, tag, remote reference, stash, or commit. The log starts on
the exact selected target; **Show All Branches** is available when broader history is intentional.

![Show Log with compact commits, reference badges, and expanded file changes](https://raw.githubusercontent.com/rodriguesvali/git-revision-graph/main/media/marketplace/03-show-log.png)

- Inspect compact commit history for one target or an explicit `base..compare` range.
- Search loaded history, load additional pages automatically, and expand commits for changed files.
- Open file diffs, compare commits with the worktree, copy hashes and reference names, and open
  supported commits on their hosted remote.
- Create branches or tags from exact commits, check out a commit to a new branch, reset with
  confirmation, and cherry-pick selected commits with conflict handoff to Source Control.

## Work Directly From The Graph

The graph keeps everyday Git actions close to their revision context:

| Area | Available workflows |
| --- | --- |
| Navigation | All refs, current branch, `origin/HEAD`, and local-branch scopes; search by ref, hash, subject, or author; Focus Range; Focus Descendants; relationship highlighting; minimap; zoom; Center HEAD; persisted view options. |
| Branches and tags | Checkout local or remote branches, create a branch or tag from a visible revision, publish a local branch with upstream tracking, push or remove remote tags, and delete supported local or remote refs. |
| Remote synchronization | Fetch with optional Prune and Tags flags, Pull, Push, confirmed force-push modes, and Sync for the tracked current branch. Remote work uses nonblocking progress so the graph remains interactive. |
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
- Start releases and hotfixes from main, features from main or a release, packages from a feature or
  release, tasks from a feature or release, and bugs from a feature or release.
- Run fetch-first readiness checks, synchronize safe behind-only sources after confirmation, preserve
  ahead-only work, and block divergent sources for manual reconciliation.
- Prepare local `sync/*` equalization branches without automatic push and hand governed integrations
  off to supported Pull Request workflows.
- Improve branch descriptions only when the user explicitly requests assistance from an available
  GitHub Copilot language model.

Create the repository configuration with **Create Flow Governance Config**, or enable Flow
Governance from the graph's **View** menu. A missing or invalid configuration never blocks the
standard graph.

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

- Visual Studio Code `1.90.0` or newer, Git, and the built-in VS Code Git extension.
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
