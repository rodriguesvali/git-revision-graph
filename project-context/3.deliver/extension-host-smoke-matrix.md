# Extension Development Host Smoke Matrix

Status: Active
Last updated: 2026-07-01

Use this matrix before a release candidate is considered ready. Run it in an Extension Development
Host with a disposable Git fixture repository so destructive actions can be validated without
risking user work.

## Preconditions

- `npm run build` has passed.
- `npm test` has passed for behavior-affecting changes.
- The Extension Development Host is launched from the current workspace.
- At least one disposable Git repository is available with:
  - a current branch with an upstream;
  - at least two local branches;
  - at least one tag;
  - at least one remote-tracking branch;
  - a file change suitable for Compare Results and worktree diff checks.
- For multi-repository checks, open a workspace with two Git repositories.

## Core Graph

| Area | Steps | Expected Result |
| --- | --- | --- |
| Zero repository | Open an empty non-Git workspace and run `View Git Revision Graph`. | The graph opens with a clear empty state and no unhandled errors. |
| Single repository launch | Open a Git repository and run `View Git Revision Graph` from Source Control. | The editor graph opens, loads refs/commits, and uses the expected repository title. |
| Multi-repository launch | Open a workspace with two Git repositories and run the graph command. | Repository selection is available when needed and the chosen repository drives graph state. |
| Repository switch | Use the graph repository picker to switch repositories. | The graph refreshes to the selected repository and stale actions from the prior repository are rejected. |
| Refresh | Trigger normal refresh and empty-cache refresh. | Loading state appears, completes, and preserves usable graph interactions. |
| Projection controls | Toggle branch/tag/stash/scope controls and focus modes. | Graph updates without stale selection, broken minimap, or incorrect toolbar state. |

## Review Workflows

| Area | Steps | Expected Result |
| --- | --- | --- |
| Compare refs | Select two refs and run compare. | Compare Results opens or updates with changed files, loading clears, and file rows are actionable. |
| Compare with worktree | Select a ref and compare with worktree. | Worktree changes appear; empty comparisons show a concise information message. |
| File diff | Open a file diff from Compare Results and Show Log. | `vscode.diff` opens with the expected left/right sides and readable title. |
| Show Log | Open Show Log for a ref, range, and loaded commit where available. | Log panel loads entries, commit details, file expansion, and copy actions remain usable. |

## Git Workflow Safety

| Area | Steps | Expected Result |
| --- | --- | --- |
| Checkout | Checkout a local branch and try checkout with dirty/conflicted states. | Clean checkout succeeds; guarded states show actionable messages. |
| Branch creation | Create a branch from a local ref, remote ref, tag, and commit where available. | Prompts validate names, branch is checked out, and remote tracking behavior remains correct. |
| Merge | Merge a safe branch and separately trigger/inspect a conflicted merge in a disposable fixture. | Successful merge refreshes; conflict path opens or points to Source Control and keeps abort handling available. |
| Sync/fetch | Run fetch/sync/pull/push paths for a tracked current branch. | Operations are serialized per repository and failures show non-blocking, actionable errors. |
| Delete/tag/stash/reset | Exercise delete, tag, stash, and reset actions only in a disposable fixture. | Destructive confirmations are modal where expected and refresh state is correct after completion/cancel/error. |

## Release Packaging Checks

| Area | Steps | Expected Result |
| --- | --- | --- |
| VSIX package | Run packaging only after maintainer approval. | Record VSIX filename, checksum, size, and package version. |
| Clean-profile install | Install the VSIX into a clean VS Code profile. | Installed extension reports the candidate version and graph launch works. |
| Marketplace metadata | Publish only after maintainer approval. | Record publication timestamp and installed-version evidence. |

## Evidence To Record

- Date and operator.
- VS Code version and platform.
- Fixture repository description or path.
- Automated commands and results.
- Manual pass/fail notes by matrix area.
- VSIX filename, checksum, size, and Marketplace timestamp when packaging/publication are approved.
