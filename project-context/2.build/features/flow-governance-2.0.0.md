# Flow Governance 2.0.0

Status: Build complete - manual validation pending
Last updated: 2026-07-13
Baseline: `1.5.8` plus completed Flow Governance Phase 1 foundation

## Goal

Ship Flow Governance as an operational governance feature, not as a visual-only
overlay. The 2.0.0 release should help users understand governed branch roles,
see when final integration requires a Pull Request, validate release promotion
readiness, and prepare safe equalization when production changes are missing
from an active release.

## User Workflow

1. The user opens the existing Git Revision Graph.
2. Flow Governance classifies visible branch refs and shows compact badges.
3. The user activates Flow Governance and opens the `main` reference context menu.
4. The graph shows a first-position `Flow Governance` context submenu. Hovering
   or focusing that item reveals `Start New Release`, `Start New Feature`, and
   `Start New Hot Fix`.
5. Before any governed branch form opens, the host fetches the source's tracked
   upstream and then verifies its refreshed state. Release, feature, and hotfix
   require exact synchronization with `main`; task and bug require their source
   not to be behind and block divergence for manual reconciliation.
6. The user fills the required name and description and confirms.
7. The extension validates the input, derives the branch from `patterns.release`
   or `patterns.feature`, creates and checks out the branch from `main`, and
   saves the description as Git branch metadata.
8. From a feature branch, the user can choose `Flow Governance > Start New Task`,
   enter the required Dev Task number, short name, and description,
   and create a task branch named from `<task-dev>-<short-name>` through
   `patterns.task`.
9. From a release or feature branch, the user can choose
   `Flow Governance > Start New Bug`, enter the required Bug ID, short name, and
   description, and create a bug branch named from `<bug-id>-<short-name>`
   through `patterns.bug`.
10. The user selects a governed source or target branch.
11. The graph explains applicable governance policy, including whether a PR is
   required.
12. For `release/*` promotion, the user can validate whether production is an
   ancestor of the release.
13. If promotion is blocked, the extension guides the user toward a `sync/*`
   equalization branch and PR handoff.
14. From a release or feature branch, the user can choose
   `Prepare Equalization`, select `main` or an active release as the origin,
   enter a required description, and prepare a local `sync/*` branch without an
   automatic push.

## Scope

- Keep the completed Phase 1 configuration, classification, toggle, badges, and
  config-file persistence foundation.
- Add a pure transition-policy model for governed source/target pairs.
- Add direct-merge policy support with default `warn`.
- Add release promotion ancestry validation with `ready`, `blocked`, and
  `inconclusive` outcomes.
- Add contextual diagnostics close to the graph surface.
- Add PR handoff through copyable context or recognized GitHub compare/PR URLs.
- Provide a release and feature equalization assistant that can prepare a local
  `sync/*` branch from `main` or an active release, without pushing automatically.

## Non-Goals

- No branch hiding or branch-type visibility checkboxes.
- No final direct merge into governed destination branches.
- No automatic push.
- No cleanup assistant.
- No GitLab, Azure Repos, Bitbucket, or generic provider API integration.
- No persistent diagnostics panel or separate diagnostics editor.
- No runtime dependency additions without explicit approval.

## Touched Surfaces

- `src/revisionGraph/flow/*` for policy, diagnostics, promotion checks, PR
  context, and sync planning helpers.
- `src/revisionGraph/controller.ts` and message handling boundaries for new
  graph intents.
- Existing revision graph webview context menu and toolbar feedback.
- Existing ref action services only where governance must warn or block
  extension-initiated direct merges.
- `package.json`, README, and CHANGELOG only if user-visible commands, settings,
  or documented workflows change.

## Acceptance Criteria

- Flow Governance never hides branch refs; all refs included by the current
  graph projection remain visible.
- Reference cards reserve room for Flow Governance badges and expand for common
  long branch names, using ellipsis only after the bounded maximum width.
- Hovering or focusing a reference shows a compact reference-specific tooltip
  with its badge, full name, optional branch description, commit subject, short
  hash, author, and date instead of the browser-native multi-reference block.
- Governed source/target pairs produce deterministic PR-required diagnostics.
- Direct governed merge handling defaults to `warn` and can be configured later
  without changing the policy engine contract.
- Release promotion validation reports `ready`, `blocked`, or `inconclusive`.
- Release promotion validation clears its in-graph progress state before showing
  the result in a modal VS Code dialog; successful results use an information
  dialog and blocked or inconclusive results use a warning dialog.
- Blocked release promotion explains that production contains commits missing
  from the release.
- PR handoff is available without requiring provider authentication.
- When Flow Governance is active, a branch classified as `main` shows a
  first-position `Flow Governance` submenu with `Start New Release` and
  `Start New Feature`, separated from the standard context-menu actions.
- `Start New Release`, `Start New Feature`, and `Start New Hot Fix` fetch the
  tracked upstream before verifying the selected `main`. If it is ahead,
  behind, or divergent, the user must confirm and complete synchronization
  first; fetch, synchronization, or cancellation failure keeps the form closed.
  Existing required-field validation then creates the branch from `main` and
  separately offers optional confirmed publication after creation.
- `Start New Hot Fix` is available from a branch classified as `main`. Its form
  requires a Hotfix ID, short name, and description, combines the identifying
  values as `<hotfix-id>-<short-name>`, validates the result through
  `patterns.hotfix`, creates and checks out the local branch from `main`, stores
  its description, and never pushes automatically.
- A branch classified as `feature` shows `Flow Governance > Start New Task`.
  Its form requires a numeric Dev Task, a short name, and a description,
  combines the values as `<task-dev>-<short-name>`, validates the
  result through `patterns.task`, and creates the local branch from that feature.
  The tracked feature is fetched first: ahead-only proceeds without a source
  push, behind-only requires confirmed synchronization, and divergence blocks
  the form pending manual reconciliation.
- Branches classified as `release` or `feature` show
  `Flow Governance > Start New Bug`. Its form requires a Bug ID, short name, and
  description, combines the identifying values as `<bug-id>-<short-name>`,
  validates the result through `patterns.bug`, creates and checks out the local
  branch from the selected source, stores its description, and never pushes
  automatically. Its tracked feature or release source uses the same fetch-first
  not-behind policy as task creation.
- Release and feature branches show `Flow Governance > Prepare Equalization`.
  Its form requires an origin branch and description. The origin list contains
  `main` and visible active releases, excludes the target when applicable, and
  orders `main` first. Submission creates a deterministic local `sync/*` branch
  from the target branch, stores the description, merges the selected origin,
  never pushes automatically, and hands conflicts to VS Code Source Control.
- Existing compare, checkout, branch, merge, sync, delete, diff, log, minimap,
  search, focus, refresh, empty-state, and multi-repository behavior remains
  intact.

## Risks

- False release-readiness results: keep ancestry checks explicit and report
  inconclusive states honestly.
- Governance UX overload: keep feedback contextual and avoid a separate panel
  for 2.0.0.
- Unsafe Git mutation: require confirmation, preserve conflict guards, and avoid
  automatic push or final governed merges.
- Provider scope creep: ship PR handoff before API-based PR creation unless
  GitHub API work receives explicit scope approval.

## Test Plan

- Unit tests for transition-policy matching and direct-merge policy outcomes.
- Unit tests for release promotion readiness states.
- Tests for missing refs, Git command errors, and inconclusive validation.
- Message validation and authorization tests for new graph intents.
- Regression tests proving Flow Governance metadata and diagnostics do not hide
  refs or alter graph topology.
- Ref-action tests for governed merge warning/block boundaries when implemented.

## Verification

- Pure transition-policy model implemented on 2026-07-02 in
  `src/revisionGraph/flow/flowTransitionPolicy.ts`.
- Focused Flow Governance policy tests cover all governed default pairs,
  non-governed pairs, and direct merge policy outcomes for `off`, `warn`, and
  `block`.
- `npm run build` passed on 2026-07-02 after the policy engine slice.
- `npm test -- --test-name-pattern "Flow Governance"` passed on 2026-07-02 with
  563 compiled tests after the policy engine slice.
- Release promotion readiness implemented on 2026-07-02 in
  `src/revisionGraph/flow/flowPromotionChecks.ts`.
- Focused Flow Governance readiness tests cover `ready`, `blocked`, and
  `inconclusive` outcomes, merge-base argument construction, and missing/error
  states.
- `npm run build` passed on 2026-07-02 after the readiness slice.
- `npm test -- --test-name-pattern "Flow Governance"` passed on 2026-07-02 with
  566 compiled tests after the readiness slice.
- Contextual governance diagnostics were expanded on 2026-07-02 in
  `src/revisionGraph/flow/flowDiagnostics.ts`.
- Focused Flow Governance diagnostics tests cover PR-required, direct-merge
  blocked, and non-governed transitions.
- `npm run build` passed on 2026-07-02 after the diagnostics slice.
- `npm test -- --test-name-pattern "Flow Governance"` passed on 2026-07-02 with
  568 compiled tests after the diagnostics slice.
- The first graph-visible governance action was added on 2026-07-02:
  `Validate Release Promotion` appears for Flow Governance release branches and
  reports readiness through the existing VS Code notification surface.
- Focused message validation, authorization, handler, and webview shell tests
  cover the `validate-release-promotion` message and context action.
- `npm run build` passed on 2026-07-02 after the release promotion action slice.
- Focused message/webview/Flow Governance tests passed on 2026-07-02 with 569
  compiled tests after the release promotion action slice.
- `npm test` passed with 569 tests on 2026-07-02 after the release promotion
  action slice.
- `git diff --check` passed on 2026-07-02 after the release promotion action
  slice.
- PR handoff was added on 2026-07-02 for governed release-to-main promotion:
  the release branch context menu can copy Pull Request context or open a
  recognized GitHub compare URL without provider authentication.
- Focused Flow Governance, message validation, authorization, handler, and
  webview shell tests cover PR context generation, GitHub URL generation,
  bounded webview messages, repository-scoped authorization, and menu wiring.
- `npm run build` passed on 2026-07-02 after the PR handoff slice.
- Focused message/webview/Flow Governance tests passed on 2026-07-02 with 571
  compiled tests after the PR handoff slice.
- `npm test` passed with 571 tests on 2026-07-02 after the PR handoff slice.
- `git diff --check` passed on 2026-07-02 after the PR handoff slice.
- Production-to-release equalization was added on 2026-07-02 through the
  release branch context menu. It prompts for a validated `sync/*` branch,
  requires a clean workspace and explicit confirmation, creates the local
  branch from release, merges production, never pushes, and reveals Source
  Control when conflicts remain.
- Equalization tests cover deterministic naming, local branch creation, merge,
  the no-push invariant, `sync/*` enforcement, message boundaries, and webview
  wiring.
- `npm test` passed with 575 tests on 2026-07-02 after the equalization slice.
- The `main` branch Flow Governance context menu now exposes a first-position
  `Flow Governance` submenu with `Start New Release` and `Start New Feature`.
- `npm run build` passed on 2026-07-03 after adding the `main` branch Flow
  Governance start actions.
- `npm test` passed with 573 tests on 2026-07-03 after adding the `main` branch
  Flow Governance start actions.
- The Flow Governance context menu was collapsed into a first-position submenu
  on 2026-07-03, with hover/focus access to governed actions and a separator
  before standard graph actions.
- `npm run build` passed on 2026-07-03 after adding the Flow Governance
  context submenu.
- `npm test` passed with 573 tests on 2026-07-03 after adding the Flow
  Governance context submenu.
- `Start New Release` was promoted from the generic branch-creation workflow to
  a Flow Governance release form on 2026-07-03. `Start New Feature` was aligned
  with the same shared form and host workflow on 2026-07-04. The host derives
  branch names from `patterns.release` or `patterns.feature`, validates the
  final Git branch name, creates and checks out the local branch from `main`,
  and stores branch description metadata when provided.
- `npm run build` passed on 2026-07-04 after sharing the Flow Governance start
  branch form across release and feature workflows.
- `npm test` passed with 579 tests on 2026-07-04 after adding the Start New
  Feature form workflow.
- Governed reference card sizing was expanded on 2026-07-04 to account for the
  badge beside the branch name while keeping a bounded maximum width.
- `npm run build` and `npm test` passed with 581 tests on 2026-07-04 after the
  governed reference card sizing adjustment.
- `Start New Task` was added on 2026-07-04 for feature branches, reusing the
  governed branch creation workflow with task-specific fields and source-kind
  authorization.
- `Start New Hot Fix` was added on 2026-07-10 for `main`, reusing the governed
  branch workflow with required Hotfix ID, short name, and description fields.
  The host composes and validates `hotfix/<hotfix-id>-<short-name>` under the
  default configuration, enforces the description again at the trusted host
  boundary, creates the local branch from `main`, and does not push it.
- `npm run build` and `npm test` passed with 593 tests on 2026-07-10 after the
  Start New Hot Fix workflow; `graphify update .` refreshed the code knowledge
  graph after implementation.
- `Start New Bug` was added on 2026-07-10 for references classified as `release`
  or `feature`. Its required Bug ID, short name, and description produce
  `bug/<bug-id>-<short-name>` under the default configuration. Message
  authorization rejects all other source kinds, the trusted host rechecks the
  description, and the workflow creates only a local checked-out branch.
- `npm run build` and `npm test` passed with 596 tests on 2026-07-10 after the
  Start New Bug workflow.
- All governed branch creation workflows now ask whether the newly created and
  checked-out branch should be published. Acceptance selects a remote when
  needed and performs a normal push with upstream tracking; declining,
  canceling remote selection, missing remotes, authentication errors, and push
  failures preserve the successfully created local branch.
- `npm run build`, `npm test` (607 tests), and `git diff --check` passed on
  2026-07-11 after optional governed-branch publication was added.
- `Validate Release Promotion` result presentation was corrected on 2026-07-10.
  The host now posts a non-loading graph state before awaiting a modal result,
  so `Validating release promotion...` is removed before the dialog opens.
  Ready results use modal information; blocked, missing-production, and
  inconclusive results use modal warnings.
- `npm run build` and `npm test` passed with 598 tests on 2026-07-10 after the
  release-promotion result presentation correction.
- `Validate Release Promotion` was removed on 2026-07-11 after the ahead-aware
  `Promotion PR Context` workflow made the separate readiness action redundant.
  Its message contract, controller path, readiness helpers, diagnostics, and
  focused tests were removed with the menu item.
- `npm run build` and `npm test` passed with 598 tests on 2026-07-11 after the
  obsolete release-promotion validation workflow was removed.
- Equalization was generalized on 2026-07-10. `Prepare Production Equalization`
  is now `Prepare Equalization`, with a single form for required Origin branch
  and Description. Eligible origins are `main` and other visible releases; the
  selected target release is excluded in both the webview and trusted message
  authorization. The deterministic local `sync/*` branch stores the supplied
  description, merges the selected origin, and is not pushed automatically.
- `npm run build` and `npm test` passed with 600 tests on 2026-07-10 after the
  generalized equalization workflow.
- `Prepare Equalization` was extended to feature branches on 2026-07-10. The
  message contract now models a generic target branch, authorization accepts
  release and feature targets, and feature helpers use
  `sync/<feature-short-name>` while retaining the same eligible origins and
  no-push guarantee.
- `npm run build` and `npm test` passed with 601 tests on 2026-07-10 after
  extending equalization to feature branches.
- Hotfix and release references expose `Promotion PR Context` whenever the
  configured production branch is available. Activating it performs a fresh
  host-side ahead check before opening the form.
- `npm run build` and `npm test` passed with 601 tests on 2026-07-11 after
  adding the hotfix promotion PR handoff actions.
- `Promotion PR Context` now opens a review form populated by the trusted
  host with informational `Flow`, read-only `Title`, and read-only
  `Description` fields. Title and Description expose independent copy-icon
  actions; each copy request is re-authorized and its value is regenerated by
  the host instead of accepting arbitrary clipboard text from the webview.
- `npm run build` and `npm test` passed with 601 tests on 2026-07-11 after the
  Pull Request context review and field-copy workflow was added.
- The Pull Request context form now reuses the same filled copy icon and
  low-chrome link action styling as reference and Show Log tooltips. Supporting
  copy, spacing, and description height were aligned with the existing webview
  visual language.
- `npm run build` and `npm test` passed with 601 tests on 2026-07-11 after the
  Pull Request context form visual alignment.
- The Pull Request context copy icon now explicitly resets the graph-wide SVG
  absolute positioning, keeping the shared icon inside its field action button.
- `npm run build` and `npm test` passed with 601 tests on 2026-07-11 after the
  copy-icon positioning regression fix.
- The field copy icon was enlarged within the existing action target and its
  internal padding removed, improving visual occupancy without expanding the
  button or changing form alignment.
- `npm run build` and `npm test` passed with 601 tests on 2026-07-11 after the
  copy-icon occupancy adjustment.
- Pull Request context eligibility uses a bounded host-side
  `git rev-list --count --max-count=1 <target>..<source>` check. Release and
  hotfix actions remain visible, but a source with no commits ahead produces a
  modal warning and aborts the context workflow. Inconclusive checks also warn
  and fail closed.
- `release -> main` and `hotfix -> main` Promotion PR Context now perform the production ancestry
  check as part of the handoff itself. The action resolves the handoff remote,
  fetches its current production tip, and checks that exact commit against the
  source. When production is not an ancestor, the context and provider URL are
  blocked with guidance explaining that production may contain a missing or
  incompatible hotfix. The guard is re-run immediately before opening GitHub.
- Production promotion also requires the local production ref to equal the
  freshly fetched remote production tip. A local `main` that is behind, ahead,
  or divergent aborts the handoff with explicit synchronization guidance before
  ancestry is evaluated.
- `npm run build`, `npm test` (610 tests), and `git diff --check` passed on
  2026-07-11 after adding the local/remote production synchronization gate.
- `npm run build`, `npm test` (609 tests), and `git diff --check` passed on
  2026-07-11 after integrating the production-promotion ancestry guard into the PR
  handoff.
- Feature references always expose `Promotion PR Context`. The form lists all
  classified release branches as targets and warns when the feature has no
  commits ahead of the selected release or the check is inconclusive. Copy and
  GitHub actions remain disabled until an eligible release is selected.
- The trusted `feature -> release` handoff now resolves and fetches the selected
  remote release before repeating eligibility. The local release must exactly
  match that fetched tip before the ahead check can release context or a
  provider URL. Behind, ahead, divergent, missing, and inconclusive targets fail
  closed without pull, merge, equalization, checkout, or target push.
- `feature -> release` is now an explicit governed PR transition. The GitHub
  action moved into the context form, so `Open Promotion PR URL` is no longer a
  separate context-menu item for any branch kind.
- `npm run build` and `npm test` passed with 603 tests on 2026-07-11 after the
  ahead-aware unified Pull Request context workflow.
- GitHub Pull Request URLs now use the documented `quick_pull=1`, `title`, and
  `body` query parameters. The title and description come from the same trusted
  Flow Governance context shown in the form, so GitHub opens with both fields
  pre-populated instead of deriving the title from commits.
- Pull Request handoff now runs a trusted remote-source preflight for every
  governed source kind. It resolves the handoff remote, checks remote branch
  existence, fetches the exact source, and compares local and remote tips.
- Missing and locally-ahead sources offer `Publish and Continue` or
  `Push and Continue` only after explicit confirmation. Remote-ahead,
  divergent, read-only, and inconclusive states fail closed; force push is
  never offered. A successful push is revalidated before the context or GitHub
  URL is released.
- `npm run build`, `npm test` (602 tests), and `git diff --check` passed on
  2026-07-11 after the Pull Request remote-source preflight was added.
- `npm run build` and `npm test` passed with 583 tests on 2026-07-04 after the
  Start New Task workflow.
- The generated webview numeric validation for Dev Task was corrected on
  2026-07-04 and covered at the final rendered-script boundary.
- Reference tooltips were redesigned on 2026-07-04. Local
  `branch.<name>.description` values are loaded in one bounded Git config query
  and included only when present; loading failures do not block the graph.
- `npm run build` and `npm test` passed with 585 tests on 2026-07-04 after the
  reference tooltip redesign.

## Manual Validation

- Open the graph in an Extension Development Host.
- Enable Flow Governance with a repository config file.
- Leave the checked-out local `main` behind its tracked remote and run
  `Start New Release`. Verify the form remains closed until `Synchronize and
  Continue` is accepted and pull succeeds. Repeat with cancellation and a pull
  failure; neither path may open the form or create a release branch.
- Advance remote `main` without fetching locally, then run `Start New Feature`.
  Verify the workflow fetches first, detects the refreshed behind state, and
  opens the feature form only after confirmed synchronization succeeds.
- Repeat the stale tracked-`main` scenario with `Start New Hot Fix`; verify the
  hotfix form is protected by the same fetch-first exact-sync gate.
- On a tracked feature, verify task and bug preflight after fetch in three
  states: ahead-only opens the form without pushing; behind-only opens it only
  after confirmed synchronization; divergent shows a modal manual-reconciliation
  warning and leaves the form closed. Repeat bug preflight from a release.
- With Flow Governance active, delete the repository flow file without
  refreshing the graph and run `Start New Release`. Verify the unavailable
  warning is modal, the form remains closed, and no branch is created.
- Verify `Start New Release` and `Start New Feature` from the `main` Flow
  Governance submenu create local branches through the shared required-name and
  required-description form.
- Verify `Start New Hot Fix` from the `main` Flow Governance submenu requires
  Hotfix ID, short name, and description, then creates and checks out
  `hotfix/<hotfix-id>-<short-name>` and offers to publish it.
- On a hotfix or release with no commits ahead of production, verify the Flow
  Governance submenu still exposes `Promotion PR Context`; activating it must
  show a modal warning and leave the context form closed. Add a source-only
  commit and verify the same action opens the form targeting production.
- Create a release before a production hotfix, then run `Promotion PR Context`
  on that release. Repeat with a hotfix branch created from an outdated `main`.
  Verify both workflows abort because current remote `main` is not an ancestor,
  explain the incompatibility risk, and neither opens context nor GitHub.
  Synchronize/equalize the source with `main` and verify the handoff becomes
  eligible.
- Leave local `main` behind `origin/main` as shown by separate graph refs and
  run `Promotion PR Context` for a release or hotfix. Verify the handoff reports
  the behind count, aborts before ancestry/context generation, and succeeds only
  after local `main` is synchronized and the graph is refreshed.
- With an unpublished hotfix, verify `Promotion PR Context` offers
  `Publish and Continue`, sets upstream tracking, revalidates the remote tip,
  and opens the form only after success. Repeat with an already-published but
  locally-ahead source and verify `Push and Continue` performs a normal push.
- Verify remote-ahead and divergent sources remain blocked with actionable
  guidance and that no force-push option is presented.
- Run `Promotion PR Context` and verify the form displays
  `<source> -> <target>` without a copy action, plus populated Title and
  Description fields with independent copy icons on the right.
- On a feature, verify `Promotion PR Context` remains available and lists every
  classified release. Selecting a release with no source-only commits must show
  an alert and disable copy/GitHub actions; selecting an eligible release must
  populate the context and enable `Open Pull Request on GitHub`.
- For an eligible feature target, leave the local release behind, ahead of, and
  divergent from its remote in turn. Verify the trusted handoff fetches the
  selected release, reports each mismatch modally, and releases neither context
  nor provider URL. Synchronize the local release and verify the ahead/source
  preflights then proceed without any automatic pull, merge, or equalization.
- The context-menu label is `Promotion PR Context`; the earlier `Copy`
  prefix was removed because copying happens per field inside the review form.
- Verify `Start New Bug` appears for both release and feature references,
  requires Bug ID, short name, and description, creates and checks out
  `bug/<bug-id>-<short-name>` from the selected source, and offers to publish it.
- On release and feature references, open `Prepare Equalization` and verify that
  Origin branch lists `main` plus active releases but not the target when it is
  itself a release. Verify Description is required, submission prepares the
  local `sync/*` branch from the selected target, merges the selected origin,
  and performs no push.
- Verify long governed branch names remain readable beside their badges and
  exceptional names are truncated only at the bounded maximum card width.
- On a feature branch, verify `Start New Task` requires a numeric Dev Task,
  ShortName, and description; creates `task/<task-dev>-<short-name>` from that
  feature under the default configuration; and stores the description.
- Hover and keyboard-focus refs with and without descriptions, including refs
  near viewport edges, and verify the tooltip remains legible without covering
  the selected reference.
- Select governed branch pairs and verify PR-required explanations.
- Validate a ready release and a blocked release.
- Confirm blocked release guidance points to equalization.
- Prepare a sync branch only after confirmation.
- Verify no automatic push happens.
- Verify conflicts are handed to Source Control.
- Re-check existing compare, diff, log, checkout, branch, merge, sync, and
  delete basics.

## Release-Note Impact

2.0.0 should be described as Flow Governance becoming operational: branch
classification, PR-required diagnostics, release readiness, PR handoff, and
safe production-to-release equalization guidance.

## Handoff Notes

The planned operational Flow Governance build scope is implemented. Next step
is Extension Development Host validation of readiness, PR handoff, successful
equalization, conflict handoff, and the no-automatic-push invariant.
