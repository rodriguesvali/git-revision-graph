# Extension Development Host Smoke Matrix

Status: Active
Last updated: 2026-10-17

Use this matrix before a release candidate is considered ready. Run it in an Extension Development
Host with a disposable Git fixture repository so destructive actions can be validated without
risking user work.

## 1.7.5 Tag-Detached HEAD

Automated Node and Linux/Xvfb host verification passed on 2026-10-17 with VS Code
1.100.0/stable 1.142.0. A disposable annotated tag exposes the actual API's named
tag HEAD, loads without a fabricated branch and displays a detached/tag title.
A same-name branch at another commit remains separate, accepts the actual graph
checkout workflow and becomes attached. A subsequent plain detached commit clears
branch state. The existing safety matrix then passes on cleaned-up fixtures.
See the [feature record](../2.build/features/1.7.5-tag-detached-head.md).

The automated fixtures did not modify the reported Angular environment. On
2026-10-17 the maintainer confirmed the fix works there. Detailed native
confirmation, keyboard/theme and other platform checks retain their separate
manual gates.

## 1.7.5 Automated Safety Integration — S4

On 2026-10-17, the working tree based on `043bd24` passed empty, single-repository
and two-repository safety scenarios on Linux/Xvfb with VS Code 1.90.0, 1.100.0 and
stable 1.142.0. Codex operated disposable fixture repositories and profiles.
Actual production panels, webview transport, built-in Git checkout and DOM restore
actions exercised stale-origin rejection, repository isolation, partial rename
recovery and graph close/reopen during pending Git log. Guard-bypass controls
failed as expected. See the [S4 evidence and limits](../2.build/features/1.7.5-extension-host-safety-regressions.md).

Native repository choices and confirmation responses were supplied by the test
harness. Manual prompt, cancellation, keyboard/theme and packaged-installation
results below remain unrecorded. The [1.100 assessment](../1.define/vscode-1.100-compatibility-assessment.md)
also records the legacy separate-untracked gap and heading-refresh follow-up;
the maintainer subsequently approved retiring 1.90–1.99 support in the
[1.100 baseline](../2.build/features/1.7.5-vscode-1.100-baseline.md).
Historical heading observations do not establish a fix on supported versions.
After the baseline change, all three scenarios passed again on 1.100.0/stable
1.142.0 with real mixed/separate untracked detection and checkout event checks.

## 1.7.5 File Restore — S1

Status: Automated workflow/fault regressions passed; real Extension Host smoke pending.
Record operator, platform, VS Code version, source commit and disposable repository.

| Scenario | Expected result | Result |
| --- | --- | --- |
| Compare Results restore/cancel | Confirm a modified-file and rename restore; dismiss another confirmation. Correct files are restored; cancellation changes nothing. | Not recorded |
| Show Log restore | Restore the selected commit's side for a modified file and a rename; verify file modes and staged changes remain appropriate. | Not recorded |
| Stale reference/source | Prepare a rename comparison, then move the selected branch so a later source is absent. Restoring reports failure without changing either local path. | Not recorded |
| Execution/recovery failure | With a controlled disposable fixture, fail a later restore write. Previous files are recovered. If the fixture also blocks recovery, the modal identifies retained copies for manual recovery. | Not recorded |

The original S1 tests execute both host workflows with native Git and injected CLI
failures outside the real panel transport. S4 above adds selected real panel/DOM
coverage; supplied confirmations still leave native modal UX acceptance manual.
See the [S1 feature artifact](../2.build/features/1.7.5-safe-file-restore.md).

## 1.7.5 Webview Action Origin — S2

Status: Automated boundary and browser checks recorded in the
[feature artifact](../2.build/features/1.7.5-webview-action-origin.md); real Extension Host smoke pending.
Use two disposable repositories with identical branch names, hashes and relative paths.

| Scenario | Expected result | Result |
| --- | --- | --- |
| Graph A→B→A and rerender | Replay a captured old action after each replacement: no workflow/Git call. Fresh action operates on the displayed repository. | Not recorded in Extension Host |
| Deferred graph click | Replace the render before the scheduled frame sends a click. Message retains old origin and is rejected; refresh/ready remain usable. | Not recorded in Extension Host |
| Comparison replacement | Reuse the same paths/refs in another repository and a new comparison in the original repository. Old restore/diff/copy messages have no effect. Fresh actions work. | Not recorded in Extension Host |
| Log replacement | Reuse the same commit in another source/repository. Old checkout/tag/restore messages have no effect. Fresh actions, file search and paging work. | Not recorded in Extension Host |
| Panel lifecycle and empty state | Close/reopen panels and repositories; replay old messages. Reject scoped actions while empty; new panels bootstrap and receive fresh context. | Not recorded in Extension Host |

Chromium exercises real DOM emitters and host dispatchers with captured messages;
the original S2 fixtures do not establish real transport or Git mutation acceptance.
S4 adds those selected integration checks above; native confirmation UX remains manual.

## 1.7.5 Render Cancellation — S3

Status: Deterministic coordinator regression checks passed; real Extension Host smoke pending.
See the [feature artifact](../2.build/features/1.7.5-render-cancellation.md).
Record operator, platform, VS Code version, source commit and disposable repository.

| Scenario | Expected result | Result |
| --- | --- | --- |
| Close during a pending load | Close the graph panel during loading; a delayed completion/failure must not publish a graph state or show an error from the retired request. | Not recorded in Extension Host |
| Reopen and refresh | Reopen the panel and refresh after cancellation; the fresh request renders normally. | Not recorded in Extension Host |
| Rapid refresh and repository change | Refresh repeatedly and switch between two repositories; only current results appear and fresh failures remain visible. | Not recorded in Extension Host |

Controlled-promise tests exercise producer noncooperation at the coordinator boundary.
S4 separately verifies a cooperative native load through the real host lifecycle.
Visual/manual acceptance and the wider rapid-switch matrix remain pending.

## 1.7.4 Published Release Evidence

Status: Publication confirmed on 2026-10-11; full manual smoke evidence not supplied.
The maintainer reported “publicação finalizada.” Local VSIX inspection is recorded
in release readiness. Publication confirmation does not establish per-scenario
smoke results or clean-profile installation; the pending results below remain
follow-up evidence, not a claim that the release is still unpublished.
Source candidate: `e934ca1df148d50da83077ed1c27e6ca2f4bfc3b`.
Operator, test date, VS Code version, platform, repository fixture and exact tested
commit/VSIX: not supplied. Record these with results before closing this gate.

Automated evidence is recorded in [release readiness](release.md): final build and
1,039 tests, quality checks, 39 Linux platform tests, 119 minimum-version Chromium
fixture scenarios and CI graph benchmark passed. Browser transport fixtures and
earlier user UI acceptance do not establish complete manual Extension Host smoke.

| Scenario | Required check | Result |
| --- | --- | --- |
| Graph/Show Log bisect entry | Start from a graph ref and single Show Log commit against HEAD; verify chosen repository, endpoints and original return destination. Cancel preparation without Git changes. | Pending |
| Active bisect and compact controls | Test good/bad/skip, undo and inspect; Minimize exposes only ready good/bad controls. Verify step/hash, disabled pending decisions and result expansion. | Pending |
| Graph visibility | Bisect Commit stays visible across steps and repeated layouts without manual scrolling; verify narrow panes, focus/scope/history limits and the reported Angular-style large graph. | Pending |
| Dirty and multiple repositories | Staged/unstaged/untracked/conflicted and unsaved files in the chosen repository block transitions. Changes in another repository do not block it; nested repository ownership remains correct. | Pending |
| Reload, failure and external state | Reload mid-search and recover; change native bisect/HEAD externally in a disposable fixture and verify checkout/metadata are preserved with actionable recovery. Stop confirmation must not act after controls are detached. | Pending |
| Completion and restoration | Found/skipped/divergent outcomes are explicit; finish returns attached/detached HEAD, removes marker and releases mutation reservation. A moved original branch is preserved. | Pending |
| Expanded-file search | Global change/file search propagates; edit/clear and collapse/reopen retain file filter. Rapid replacement/source switches discard stale results; filtered diff/menu actions address the correct file. See focused cases below. | Pending |
| Flow creation sources | Create Feature and Bug from Package and Package from Main, including configured names. Verify selected source, existing clean/sync guards, form cancellation and explicit publication decisions. | Pending |
| Tooltip timing and keyboard | Both custom tooltips open after 1 second of hover; graph reference focus also uses this delay. Leaving/opening a menu before activation cancels them. Verify keyboard, theme and narrow-pane behavior. | Pending |
| Lifecycle regression | Open with zero/one/multiple repositories; switch repositories, close/reopen and reload the graph/Show Log. Verify Compare Results, refs, checkout and existing governed actions. | Pending |

VSIX inspection/clean-profile installation remains a separate post-packaging gate.
Record artifact identity and installation outcome; manual source smoke does not
establish packaged byte identity or Marketplace publication.

## 1.7.4 Show Log Expanded Change Search

Status: Focused manual Extension Development Host smoke pending.

Automated evidence on 2026-10-09: full suite/build and quality checks passed;
39 Linux platform checks passed. VS Code 1.90.0 Chromium 122 fixture passed 13
cases with mocked host transport, the real native query backend and 301 changed
files. This is browser evidence, not a completed manual Extension Host smoke.
See [feature evidence](../2.build/features/1.7.4-show-log-expanded-change-search.md).

- Search commits with `change:"validateToken("`; expand a result and verify the
  inherited filter shows only files with matching added/removed lines.
- Combine `file:src/` and `change:`; verify both operators carry into the file filter.
- Run an independent file-level change query, combine it with path/status text,
  test quoted values, case sensitivity, invalid syntax and no results.
- Clear the file filter without clearing the commit query; collapse/reopen and
  verify explicit edits/clears survive, including typing immediately before collapse.
- Switch commits, refs and repositories; verify filters and pending results remain scoped.
- On a filtered file, verify diff, context-menu copy and guarded restore actions.
- Record operator, date, VS Code version, platform and outcome before release.

## 1.7.3 Release Evidence

- Publication confirmed by the maintainer on 2026-10-04 ("publicação concluída").
  Local `git-revision-graph-1.7.3.vsix` inspected; metadata/checksum are recorded in
  [release readiness](release.md). Clean-profile installation and equality with the
  published package were not established by this confirmation.
- Final release smoke: completed by maintainer confirmation on 2026-10-04
  ("smoke finalizado. vamos lançar a versão. Pode ajustar os artefatos da release.").
- Scope accepted for release: reference-menu readability/keyboard navigation,
  Compare Results review-context retention, Show Log loading/alignment and file/change search.
- Source baseline observed when recording this confirmation: `043bf5f`; the maintainer
  did not supply an exact tested commit or VSIX identity.
- Operator: maintainer; environment and individual scenario outcomes not supplied.
  This closes the remaining focused manual smoke follow-ups; it does not establish
  per-scenario evidence, VSIX inspection, clean-profile installation or publication.

### Earlier Menu Smoke — 2026-10-03

- Earlier menu smoke completed by maintainer confirmation on 2026-10-03
  ("Smoke finalizado.").
- Scope: the approved reference-menu readability and keyboard improvements,
  including the correction keeping menus above the toolbar in short panes.
- Operator: maintainer; name not recorded.
- VS Code version, platform, fixture, candidate commit/VSIX and individual scenario
  results: not supplied and not inferred. The confirmation closes the final smoke
  follow-up for the two menu improvements; it does not establish individual
  outcomes for every scenario below. At that date it did not cover the later Compare
  Results and Show Log changes, now accepted by the final release confirmation above.
- Automated evidence remains separate: 945 tests including build, the quality gate,
  21 Chromium keyboard scenarios and 36 readability scenarios passed.
- VSIX packaging/inspection, clean-profile installation and Marketplace publication
  are not established by this smoke confirmation.

### Additional Compare Results Scope — Completed

Approved and implemented after the menu smoke confirmation. Automated evidence:
958 tests including build, quality check and 16 VS Code 1.90.0 Chromium scenarios
with mocked host messages passed. The final release smoke confirmation on 2026-10-04
closes this scope. Individual briefing, restore/refresh and reset outcomes were not supplied.

### Show Log Loading Correction — Completed

The maintainer screenshot reported duplicate initial/search loading feedback. The
correction and vertical-alignment follow-up passed 15 VS Code 1.90.0 Chromium scenarios
with mocked host messages (including three pane widths and two font settings),
958 tests including build and the quality check. The final release smoke confirmation
on 2026-10-04 closes loading/search/pagination and alignment follow-ups. Individual
scenario outcomes were not supplied.

### Show Log File/Change Search — Completed

Approved and implemented after the prior smoke confirmation. Automated evidence:
971 tests including build, quality check, 39 platform tests on Linux and 24 VS Code
1.90.0 Chromium scenarios passed. Nine browser search checks use mocked host transport
with the real backend and a disposable Git fixture; 15 cover loading/alignment.
The final release smoke confirmation on 2026-10-04 closes the search follow-up.
Individual query, expansion/diff and source/repository-switch outcomes were not supplied.

## 1.7.2 Release Evidence

Publication confirmed by the maintainer on 2026-09-22. Reviewed implementation: `b437638`.
Local VSIX inspected; clean-profile installation and final manual results were not supplied.
Publication confirmation is not treated as a manual smoke pass.
Automated evidence: 937 tests/build passed; VS Code 1.90.0 Linux/Xvfb smoke passed for
activation, Git discovery and singleton-panel opening with zero and one repository.
The automation does not establish the following manual results.

Record operator, date, VS Code version, platform, candidate commit/VSIX and result for
these scenarios in disposable fixture repositories:

| Scenario | Expected result | Manual result |
| --- | --- | --- |
| Untracked current branch | Toolbar shows cloud-upload and Publish tooltip; force-push menu is hidden. | Not recorded |
| Publish cancel/success | Cancel remote or confirmation without mutation; successful publication establishes upstream and restores Push icon/menu. | Not recorded |
| Differently named upstream | Publish confirmation explains tracking replacement; cancel preserves existing tracking. | Not recorded |
| Focus persistence | Apply Focus Descendants, close/reopen panel and reload window; same anchor and filter badge return. | Not recorded |
| Repository isolation | Choose distinct focus in two repositories, switch back and forth, then reload; each retains its own focus. | Not recorded |
| Focus removal | Clear, choose another scope or select Focus Range, then reload; descendant focus does not return. | Not recorded |
| Filtered/offscreen HEAD | Filtered-out HEAD disables Center with explanation; clear filter to restore; panning offscreen still permits centering. | Not recorded |
| Disabled/accessibility states | Check loading, detached HEAD, keyboard focus, tooltip/icon agreement and light/dark themes. | Not recorded |
| Installed candidate | Install inspected VSIX in clean profile; confirm 1.7.2 identity and repeat affected workflows. | Not recorded |

## 1.7.0 Release Evidence

- Result: Marketplace publication complete and independently verified on 2026-09-04; final
  Extension Development Host evidence was not supplied and is not inferred.
- Candidate scope: operation-specific processing feedback across Revision Graph and Show Log,
  latest-owner progress coordination, vertically centered compact Show Log rows, continuous graph
  lines after expanded reference-bearing commits, and commit messages without an inline short hash.
- Required manual focus: exercise representative subtle and blocking Git operations after their
  final native prompt; verify cancellation and remote failure cleanup; verify compact, referenced,
  selected, and expanded Show Log rows in light and dark themes; retrieve the commit hash through
  tooltip and context actions.
- The published Marketplace VSIX is byte-identical to the inspected local package. Clean-profile
  installation, source synchronization/tagging, and final manual evidence remain with the
  maintainer.

## 1.6.9 Release Evidence

- Result: passed by maintainer confirmation on 2026-08-25, including the last-minute responsive
  toolbar-height correction.
- Scope: final Extension Development Host smoke for remote-tag mutation progress, independent
  repository and zoom toolbar wrapping, dynamically aligned graph/search/progress surfaces, and
  viewport-reachable grouped reference context menus.
- Operator: maintainer; name not recorded.
- VS Code version, platform, fixture, candidate commit, and per-scenario results: not recorded and
  not inferred.
- Packaging was not covered by the smoke confirmation. VSIX filename, checksum, size,
  embedded-version inspection, clean-profile installation, Marketplace timestamp, and
  installed-version evidence remain pending.

## 1.6.7 Release Evidence

- Result: passed by maintainer confirmation on 2026-08-15.
- Scope: final Extension Development Host smoke for repository-file-backed Flow Governance,
  removal of Promotion PR Context, selectable graph layout strategies, compact keyboard-accessible
  search, narrow-width and theme behavior, and Show Log outgoing, regular, and merge markers.
- Operator: maintainer; name not recorded.
- VS Code version, platform, fixture, and per-scenario results: not recorded and not inferred.
- Packaging was not covered by the smoke confirmation. Marketplace publication was subsequently
  confirmed complete by the maintainer on 2026-08-15, but VSIX filename, checksum, size,
  embedded-version inspection, clean-profile installation, exact Marketplace timestamp, and
  installed-version evidence were not supplied and are not inferred.

## 1.6.4 Planned Release Evidence

- Result: automated items 1 through 5 and the Azure DevOps portal handoff correction passed;
  manual smoke remains pending.
- Source baseline: repository tag `1.6.3` at `c620e35`.
- Scope: measured, staged revision-graph loading performance improvements defined in
  `project-context/2.build/features/1.6.4-revision-graph-load-performance.md`, plus the Azure
  DevOps Services portal handoff correction in
  `project-context/2.build/features/1.6.4-azure-devops-pr-handoff.md`.
- Required manual focus: cold and warm graph opening, normal and empty-cache refresh, repository
  switching, projection-only changes, status-only changes, Flow Governance enabled and disabled,
  and post-load selection, search, minimap, scrolling, and zoom behavior.
- Item 1 focus: compare trace phases for merge analysis, Flow Governance, and branch descriptions;
  verify the ready graph remains identical with Flow Governance enabled, disabled through fallback
  settings, disabled through repository config, and invalid through repository config.
- Item 2 focus: repeat empty-cache refreshes and projection changes in one panel session, then switch
  repositories and close/reopen the panel. Confirm layout remains identical, canceled refreshes do
  not surface stale results, concurrent/superseded requests recover, and extension-host shutdown
  does not retain a worker process.
- Item 3 focus: modify and restore only worktree files, then exercise pull/push availability and a
  merge-conflict state. Confirm toolbar actions update without graph flicker or loss of viewport,
  selection, search, highlights, minimap state, tooltips, or node offsets; repeat after switching
  repositories to confirm stale status does not cross scenes.
- Item 4 focus: open repositories where the initial bounded history produces both fewer and more
  visible major-operation nodes than the configured adaptive threshold. Confirm the graph deepens
  only when expected and remains identical across ref scopes, hidden tag/remote/stash options,
  merge visibility, revision ranges, and descendant focus.
- Item 5 focus: repeat warm refreshes and projection toggles that return to a prior topology, then
  compare nodes, routed edges, minimap, selection, and viewport behavior with an empty-cache load.
  Confirm restored layouts remain identical after reloading the Extension Development Host and no
  prior scene can alter a later cached result.
- Operator, VS Code versions, platforms, fixtures, candidate commit, and results: pending.
- Packaging and Marketplace evidence remain outside this matrix and require explicit maintainer
  approval.

## 1.6.3 Release Evidence

- Result: passed by maintainer confirmation on 2026-08-01.
- Candidate source implementation: commit `c1edded` on `main`.
- Scope: final Extension Development Host smoke for the applicable `1.6.3` Flow Governance,
  Revision Graph performance, tooltip, AI Assistance, and Show Log checks recorded in
  `project-context/3.deliver/release.md`.
- Operator: maintainer; name not recorded.
- VS Code version, platform, and fixture details: not recorded.
- The packaging rows below were not covered by the smoke confirmation. VSIX filename, checksum,
  size, embedded-version inspection, clean-profile installation result, Marketplace timestamp, and
  installed-version evidence remain pending and are not inferred.

## 1.6.1 Release Evidence

- Result: passed by maintainer confirmation on 2026-07-29.
- Candidate source implementation: commit `5bf38f0` on `release/1.6.1`.
- Scope: final Extension Development Host smoke for the applicable `1.6.1` Core Graph, Flow
  Governance, Compare Results, Show Log, Git workflow safety, AI availability, stop/cancellation,
  keyboard, and theme checks.
- Operator: maintainer; name not recorded.
- VS Code version, platform, and fixture details: not recorded.
- Marketplace publication was confirmed complete by the maintainer on 2026-07-29.
- The packaging rows below were not covered by the smoke confirmation. VSIX filename, checksum,
  size, embedded-version inspection, clean-profile installation result, exact Marketplace
  timestamp, and installed-version evidence were not supplied and are not inferred.

## Preconditions

- `npm run build` has passed.
- `npm run quality:check` has passed.
- `npm test` has passed for behavior-affecting changes.
- The Extension Host E2E matrix has passed locally or in CI for the current candidate on both the
  minimum supported VS Code version and the current stable release.
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
- For remote-host checks, use accessible GitHub, Azure DevOps Services, GitLab.com, AWS CodeCommit,
  and Google Secure Source Manager repositories where available.

## Automated Extension Host Baseline

The CI matrix runs `npm run test:e2e` against VS Code `1.90.0` and the current stable release. Each
entry launches two isolated VS Code instances and verifies the non-destructive release baseline
before the manual matrix:

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
| Always-visible Flow toggle | Remove the configured repository flow file and open the graph `View` menu. Enable `Flow Governance`, then disable and re-enable it. | The checkbox is visible and initially unchecked; enabling creates the default file with `enabled: true`, and later toggles persist the matching boolean without hiding the control. |
| Existing config | Run `Create Flow Governance Config` again in the same repository. | The existing file opens without overwrite and no duplicate prompt writes a file. |
| Multi-repository bootstrap | Open a workspace with two repositories and run `Create Flow Governance Config`. | Repository selection appears and the file is created/opened only in the selected repository. |
| Enabled Flow View | Set `enabled` to `true` in the repository flow file and open or refresh `View Git Revision Graph`. | Flow Governance controls appear in the graph `View` menu and branch-kind badges render from host-provided metadata. |
| No branch hiding | With Flow Governance enabled, inspect `release/*`, `sync/*`, `feature/*`, unknown, local, and remote refs that are present in the current graph projection. | Branch-kind badges render for classified local branches, but Flow Governance does not hide or remove any branch refs. |
| Release from synchronized main | With local `main` tracking and matching `origin/main`, run `Flow Governance > Start New Release`. | The required name/description form opens immediately; submitting valid data creates and checks out `release/*`, then asks whether to publish it. |
| AI release description | In `Start New Release`, enter a name and description, select the AI icon, approve model access if prompted, and submit after reviewing the result. | No request occurs before the icon is selected; only the description changes, the action exposes an accessible tooltip/busy state, and the reviewed text is used by normal branch creation. |
| Feature from behind main | Advance remote `main` from another clone, leave local `main` stale, and run `Flow Governance > Start New Feature` before any manual fetch. | The workflow fetches first, detects that local `main` is behind, requests `Synchronize and Continue`, and opens the feature form only after synchronization succeeds. |
| Release from behind main | Leave the checked-out local `main` behind `origin/main`, run `Start New Release`, and accept `Synchronize and Continue`. | The release form stays closed until pull succeeds, then opens. Submitting creates the release from the updated `main`, not the stale commit. |
| Release from behind non-current main | Check out another branch, leave local `main` behind `origin/main`, run `Start New Release` from the `main` ref, and confirm synchronization. | The local `main` is fast-forwarded without changing the active branch; the form opens only after success. |
| Release synchronization cancellation/failure | Repeat with `main` behind, first declining synchronization and then simulating a pull failure. | In both cases the form remains closed and no release branch is created; the failure is reported through the existing Git error surface. |
| Hotfix from stale main | Advance remote `main` without fetching locally, then run `Start New Hot Fix`. | The workflow fetches first and keeps the hotfix form closed until confirmed synchronization succeeds. |
| Task from ahead-only feature | Add an unpushed commit to a tracked feature and run `Start New Task`. | The workflow fetches first, recognizes that the feature is not behind, opens the form without a synchronization prompt, and does not push the source. |
| Task or bug from behind source | Advance the tracked feature or release remotely, then run the applicable task or bug action. | The workflow fetches first, requests confirmation, synchronizes the source, and opens the form only after success. |
| Task or bug from divergent source | Create distinct local and remote commits on the tracked feature or release, then run the applicable action. | A modal warning requires manual reconciliation; the form remains closed and no pull, push, or new branch occurs. |
| Release equalization | On a blocked `release/*` branch, run `Prepare Production Equalization`, accept the suggested `sync/*` name, and confirm. | A local sync branch is created from the release and production is merged into it; no push occurs. Conflicts open Source Control for manual resolution. |
| Repository config disable | Uncheck `Flow Governance` in the graph `View` menu when the active source is `.git-revision-graph-flow.json`, then reload the extension or reopen the graph. | Flow badges stop applying, only the `Flow Governance` checkbox remains visible, and the repository flow file is updated with `"enabled": false`. |
| Repository config re-enable | Check `Flow Governance` again in the graph `View` menu. | Flow badges apply again and the repository flow file is updated with `"enabled": true`. |
| Deleted active config | Enable Flow Governance from the repository flow file, delete that file without refreshing the graph, then run `Start New Release`. | A native modal warning reports that Flow Governance is unavailable; the release form remains closed and no branch is created. |
| Invalid config | Temporarily make the flow file invalid JSON or use an invalid regex, then reload the graph. | The graph still loads, Flow Governance controls are hidden for that state, and normal graph actions remain usable. |
| Disabled behavior | Set Flow Governance off through settings or config and refresh. | Existing graph behavior remains unchanged and no Flow Governance controls are shown unless metadata is present. |
| Zero repository | Run `Create Flow Governance Config` from an empty non-Git workspace. | A concise no-repository information message appears and no file is written. |

## Review Workflows

| Area | Steps | Expected Result |
| --- | --- | --- |
| Compare refs | Select two refs and run compare. | Compare Results opens or updates with changed files, loading clears, and file rows are actionable. |
| Compare with worktree | Select a ref and compare with worktree. | Worktree changes appear; empty comparisons show a concise information message. |
| AI Compare Briefing | In completed ref/ref and ref/worktree comparisons, invoke the AI sparkle action, review and copy a ready briefing, dismiss/reopen it, and regenerate it. Repeat with model consent denied, no model available, sensitive-only changes, and while replacing the comparison or closing the panel during generation. | AI is invoked only by the explicit action. The plain-text briefing remains bounded and usable; dismissing/reopening a ready result does not regenerate it; unavailable or excluded context leaves review usable; and stale or canceled responses never update a replaced or closed comparison. |
| Compare review context | Filter by text and status, select multiple files, then generate/cancel/regenerate a briefing and open Unified Diff. Restore one selected worktree file in a disposable fixture. | Same-comparison updates retain filters and existing selected IDs; removed/status-changed IDs disappear from selection; actions use current results; typing and row focus remain usable. A zero-count active category remains visible with All and Clear recovery controls. |
| Compare session isolation | Open a new comparison with the same refs, reversed refs and another repository with identical relative paths. Cancel a loading comparison and review the restored results. | New comparisons reset filters/selection; another repository never inherits file selections; the restored comparison has a stable identity during subsequent updates. |
| File diff | Open a file diff from Compare Results and Show Log. | `vscode.diff` opens with the expected left/right sides and readable title. |
| Show Log loading | Open Show Log and search history while loading, then scroll to request another page. | Initial loading and search show only the header status; pagination shows only the footer status; completed empty/error feedback remains visible. |
| Show Log file/change search | Search `file:src/`, `change:"validateToken("`, their combination with metadata, and a quoted path containing spaces. Try invalid/duplicate filters, all-branches/range scope, paging, rapid replacement/clear and source/repository switching. | Only changed paths/added-or-removed text match; metadata combines with AND; scope/order and the 2,000-commit partial-history notice remain correct; invalid syntax has actionable feedback; older responses are suppressed; expansion and diff actions retain the complete commit. |
| Show Log | Open Show Log for a ref, range, and loaded commit where available. | Log panel loads entries, commit details, file expansion, and copy actions remain usable. |
| Hosted commit links | Select `Open on Remote` from Revision Graph and Show Log for GitHub, Azure DevOps, GitLab.com, and CodeCommit repositories. Repeat on Secure Source Manager. | Exact commits open on the first four providers. Secure Source Manager reports that no verified commit link is available; unsupported remotes show concise native feedback without opening a URL. |

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
