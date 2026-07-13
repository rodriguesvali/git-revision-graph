# Extension Development Host Smoke Matrix

Status: Active
Last updated: 2026-07-13

Use this matrix before a release candidate is considered ready. Run it in an Extension Development
Host with a disposable Git fixture repository so destructive actions can be validated without
risking user work.

## Preconditions

- `npm run build` has passed.
- `npm run quality:check` has passed.
- `npm test` has passed for behavior-affecting changes.
- `npm run test:e2e` has passed locally or in CI for the current candidate.
- The Extension Development Host is launched from the current workspace.
- At least one disposable Git repository is available with:
  - a current branch with an upstream;
  - at least two local branches;
  - at least one tag;
  - at least one remote-tracking branch;
  - a file change suitable for Compare Results and worktree diff checks.
- For multi-repository checks, open a workspace with two Git repositories.
- For Flow Governance checks, use a disposable repository where creating or editing
  `.git-revision-graph-flow.json` is acceptable.

## Automated Extension Host Baseline

`npm run test:e2e` launches two isolated VS Code instances and verifies the non-destructive release
baseline before the manual matrix:

| Scenario | Automated evidence |
| --- | --- |
| Zero repository | The extension activates with the real built-in `vscode.git` API reporting no repositories, and the revision graph editor opens. |
| Single repository | A disposable repository with one commit is discovered by the real built-in `vscode.git` API, and the revision graph editor opens. |
| Singleton panel | Running `View Git Revision Graph` twice leaves exactly one editor webview tab with the expected view type and title. |

This baseline does not replace the manual checks for rendered webview content, multi-repository
selection, native prompts and editors, remote/authentication behavior, themes, or Git mutations.

## Core Graph

| Area | Steps | Expected Result |
| --- | --- | --- |
| Zero repository | Open an empty non-Git workspace and run `View Git Revision Graph`. | The graph opens with a clear empty state and no unhandled errors. |
| Single repository launch | Open a Git repository and run `View Git Revision Graph` from Source Control. | The editor graph opens, loads refs/commits, and uses the expected repository title. |
| Multi-repository launch | Open a workspace with two Git repositories and run the graph command. | Repository selection is available when needed and the chosen repository drives graph state. |
| Repository switch | Use the graph repository picker to switch repositories. | The graph refreshes to the selected repository and stale actions from the prior repository are rejected. |
| Refresh | Trigger normal refresh and empty-cache refresh. | Loading state appears, completes, and preserves usable graph interactions. |
| Projection controls | Toggle branch/tag/stash/scope controls and focus modes. | Graph updates without stale selection, broken minimap, or incorrect toolbar state. |

## Flow Governance

| Area | Steps | Expected Result |
| --- | --- | --- |
| Config bootstrap | Run `Create Flow Governance Config` from the Command Palette in a disposable Git repository and confirm creation. | `.git-revision-graph-flow.json` is created at the configured repository-relative path, opened in the editor, and contains only Phase 1 fields. |
| Existing config | Run `Create Flow Governance Config` again in the same repository. | The existing file opens without overwrite and no duplicate prompt writes a file. |
| Multi-repository bootstrap | Open a workspace with two repositories and run `Create Flow Governance Config`. | Repository selection appears and the file is created/opened only in the selected repository. |
| Enabled Flow View | Set `enabled` to `true` in the repository flow file and open or refresh `View Git Revision Graph`. | Flow Governance controls appear in the graph `View` menu and branch-kind badges render from host-provided metadata. |
| No branch hiding | With Flow Governance enabled, inspect `release/*`, `sync/*`, `feature/*`, unknown, local, and remote refs that are present in the current graph projection. | Branch-kind badges render for classified local branches, but Flow Governance does not hide or remove any branch refs. |
| Release equalization | On a blocked `release/*` branch, run `Prepare Production Equalization`, accept the suggested `sync/*` name, and confirm. | A local sync branch is created from the release and production is merged into it; no push occurs. Conflicts open Source Control for manual resolution. |
| Repository config disable | Uncheck `Flow Governance` in the graph `View` menu when the active source is `.git-revision-graph-flow.json`, then reload the extension or reopen the graph. | Flow badges stop applying, only the `Flow Governance` checkbox remains visible, and the repository flow file is updated with `"enabled": false`. |
| Repository config re-enable | Check `Flow Governance` again in the graph `View` menu. | Flow badges apply again and the repository flow file is updated with `"enabled": true`. |
| Invalid config | Temporarily make the flow file invalid JSON or use an invalid regex, then reload the graph. | The graph still loads, Flow Governance controls are hidden for that state, and normal graph actions remain usable. |
| Disabled behavior | Set Flow Governance off through settings or config and refresh. | Existing graph behavior remains unchanged and no Flow Governance controls are shown unless metadata is present. |
| Zero repository | Run `Create Flow Governance Config` from an empty non-Git workspace. | A concise no-repository information message appears and no file is written. |

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
