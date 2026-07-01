# Feature Requirements Document

# Git Revision Graph - Flow Governance Layer

**Target extension:** Git Revision Graph (`rodriguesvali.git-revision-graph`)  
**Repository:** `rodriguesvali/git-revision-graph`  
**Project status:** Existing published VS Code extension  
**Feature status:** Final proposal for incremental specification and implementation  
**Document version:** 2.1 - Final decisions resolved  
**Language:** English  

---

## 1. Overview

The Flow Governance Layer adds a configurable semantic layer for interpreting,
decorating, filtering, diagnosing, and assisting governed Git branch flows inside
Git Revision Graph.

This is not a new product and it must not replace the existing extension
architecture. It extends the current revision graph experience by adding
branch-flow metadata over the already loaded Git graph.

The current extension already provides:

- a Source Control-launched revision graph editor webview;
- integration with the built-in `vscode.git` extension;
- graph rendering based on `d3-dag`;
- contextual compare, checkout, branch, merge, sync, delete, diff, tag, stash,
  reset, and log workflows;
- search, filters, minimap, refresh behavior, and multi-repository support;
- native VS Code confirmations, diff editors, picks, notifications, and Source
  Control handoff.

The Flow Governance Layer must build on those foundations. It should help teams
understand branch roles and detect flow issues, while keeping official
integration gates in the remote provider through Pull Requests.

---

## 2. Product Goal

Add a visual and operational governance layer that can:

1. classify branch refs from configurable patterns;
2. reduce visual noise in branch-heavy repositories;
3. highlight the production trunk (`main` or `master`);
4. group or relate branches such as tasks, features, releases, hotfixes, bugs,
   one or more package branches, and sync branches;
5. detect branch-flow governance issues;
6. identify cleanup candidates without deleting anything automatically;
7. assist safe equalization through `sync/*` branches;
8. require Pull Requests for all governed final integrations;
9. create GitHub Pull Requests automatically for supported GitHub remotes when
   the user explicitly requests it.

The extension may initiate, prepare, validate, and explain a flow. It must not
act as the final authority for protected branch promotion. Final integration
between governed branches is PR-gated.

---

## 3. Problem Statement

In corporate repositories with many developers, parallel features, releases,
hotfixes, bugfixes, and temporary integration branches, the Git graph can become
visually noisy and difficult to audit.

Common problems include:

- too many visible branches at once;
- difficulty identifying the production trunk;
- no visual distinction between permanent, temporary, and ephemeral branches;
- old or consolidated branches remaining in the repository;
- difficulty auditing how tasks, features, releases, and production relate;
- production hotfixes that are not carried back into active release lines;
- risky direct merges into governed branches;
- loss of traceability when teams rely on squash or ad hoc merges.

The proposed feature addresses these problems by preserving Git history and
using the graph as a visual governance, diagnostic, and guided-action surface.

---

## 4. Core Governance Principle

Flow Governance is based on this rule:

> The extension may prepare and validate governed flows, but final integration
> into governed target branches must happen through a Pull Request.

This means:

- Git Revision Graph may classify, diagnose, compare, validate, create helper
  branches, create GitHub Pull Requests, and open or copy PR creation context.
- Git Revision Graph should not directly complete governed merges into protected
  destination branches.
- Provider-side policies, branch protections, reviewers, checks, approvals, and
  merge methods remain authoritative.
- Direct local merges into governed destination branches should be diagnosed,
  discouraged, or blocked when governance mode is enabled, depending on
  configuration.

---

## 5. Target Users

### Tech Leads and Engineering Managers

- Understand the state of development and release flow.
- Identify active releases, features, hotfixes, bugs, tasks, packages, and sync
  branches.
- Audit promotion readiness.
- Detect branches outside expected patterns.
- Detect production changes missing from release lines.
- Review cleanup candidates with lower risk.

### Developers

- Understand where their branch fits in the configured flow.
- Reduce visual graph noise.
- Find related tasks, features, releases, and hotfixes faster.
- Receive actionable diagnostics before opening a PR.
- Use existing Git Revision Graph actions with more context.

### Extension Maintainers

- Add enterprise value without reimplementing Git or provider-specific PR
  systems.
- Preserve native VS Code ergonomics.
- Keep implementation incremental, testable, and compatible with the published
  extension.

---

## 6. Scope

### Included

- Flow configuration in a repository-versioned flow file, with VS Code settings
  used as fallback or bootstrap configuration.
- Branch classification from configurable patterns.
- Main-trunk highlighting.
- Visual decorations by branch kind.
- Flow filters by branch kind and diagnostics.
- Optional hiding of ephemeral branch refs.
- Basic task, feature, package, release, hotfix, bug, and sync branch metadata.
- Governance diagnostics.
- PR-gated integration policy.
- Release promotion readiness checks.
- Production-to-release equalization guidance.
- Cleanup candidate identification and dry-run.
- Reuse of existing Git actions where safe.
- GitHub-first automatic Pull Request creation for supported GitHub remotes.
- Fallback PR context copy or URL opening when automatic PR creation is not
  available.

### Excluded From The First MVP

- Remote branch deletion in bulk.
- Automatic conflict resolution.
- History rewriting.
- Mandatory adoption of one Git Flow model.
- Mandatory squash workflows.
- Fully automated release management.
- Required Jira, Azure DevOps, GitHub Issues, GitLab MR, Azure Repos PR, or
  Bitbucket PR integration.
- Completing governed merges directly into protected destination branches.
- Pushing Sync Sandbox helper branches automatically.

---

## 7. Supported Branch Model

The extension must allow teams to configure branch patterns. The following model
is the recommended default.

| Branch kind | Suggested pattern | Lifecycle | Role | Visual behavior |
|---|---|---:|---|---|
| Main | `main` or `master` | Permanent | Production trunk | Highlighted trunk |
| Release | `release/*` | Temporary | UAT, release candidate, or version preparation | Release badge |
| Sync | `sync/*` | Ephemeral | Safe equalization branch | Hidden by default when configured |
| Package | `package` or `package/*` | Temporary or reusable | Integration branch for tasks targeting different releases or features | Technical or dashed line |
| Feature | `feature/*` | Medium or long | Feature aggregator | Continuous branch identity |
| Task | `task/*` | Short | Atomic development unit | Groupable by issue ID |
| Bug | `bug/*` | Short | Internal bug fix | Bugfix badge |
| Hotfix | `hotfix/*` | Short and urgent | Production fix | Alert identity |
| Unknown | Any unmatched branch | Variable | Outside the configured model | Governance indicator |

The default model is only a preset. Teams must be able to adapt patterns to
their own conventions.

The default model must support both `package` and multiple `package/*` branches.
A package branch may be needed to integrate tasks for different release or
feature targets.

---

## 8. PR-Gated Integration Policy

When Flow Governance is enabled, the following governed integrations require a
Pull Request for finalization.

| Source | Target | Policy |
|---|---|---|
| `release/*` | `main` or `master` | PR required; promotion must be linear or fast-forward ready |
| `task/*` | `feature/*` | PR required |
| `package` or `package/*` | `feature/*` | PR required |
| `hotfix/*` | `main` or `master` | PR required |
| `bug/*` | `main` or `master` | PR required |
| `bug/*` | `release/*` | PR required |
| `bug/*` | `feature/*` | PR required |
| `sync/*` | `release/*` | PR required |

The extension may guide users toward the correct source and target, validate
readiness, and help prepare the PR. It must not silently perform the final merge
for these transitions.

### Direct Merge Handling

For governed source/target pairs, direct local merge should be configurable:

- `off`: no governance enforcement;
- `warn`: show a diagnostic and allow the user to continue;
- `block`: prevent the extension-initiated merge action and explain that a PR is
  required.

The default policy must be `warn`. The remote provider remains the final
authority: if the user continues with a direct merge, protected branch policies
on the server are expected to reject direct pushes to governed targets such as
`main`, `master`, `release/*`, or `feature/*`.

Blocking behavior can be introduced later for teams that want stricter local
guardrails.

### Remote Branch Protection Recommendation

Production branches such as `main` or `master` should be protected in the remote
provider. The recommended policy is:

- require Pull Requests;
- require linear history or fast-forward-only merges when supported;
- block direct commits and direct pushes;
- require successful checks before merge;
- apply equivalent protections to `release/*` and `feature/*` when those
  branches are governed targets.

When provider APIs are not used, protected branches must be declared explicitly
in the repository-versioned flow configuration.

---

## 9. Release Promotion Rule

Before opening or recommending a PR from `release/*` to `main` or `master`, the
extension must validate whether the production branch is an ancestor of the
release branch.

Conceptually:

```bash
git merge-base --is-ancestor main release/x.y.z
```

or:

```bash
git merge-base --is-ancestor master release/x.y.z
```

Expected interpretation:

- exit code `0`: production is contained in the release; the release is
  promotion-ready from an ancestry perspective.
- exit code `1`: production is not contained in the release; promotion is
  blocked because production contains commits missing from the release.
- any other error: validation is inconclusive and must be reported as such.

If production is not an ancestor of the release, the extension should diagnose:

```text
Release promotion blocked: production contains commits that are not present in
this release. Equalize production into the release before opening the promotion
PR.
```

This commonly means a `hotfix/*` or `bug/*` branch was promoted to production
after the release branch was cut.

---

## 10. Production-To-Release Equalization

When release promotion is blocked because `main` or `master` is not an ancestor
of `release/*`, the recommended flow is:

1. Create a sync branch from the release branch, for example
   `sync/release-1.8.0-from-production`.
2. Merge `main` or `master` into the sync branch.
3. If conflicts occur, pause and hand off resolution to VS Code Source Control.
4. After conflict resolution, let the user validate locally.
5. Tell the user to push the `sync/*` branch to the remote.
6. After the branch exists remotely, create a GitHub PR or copy/open PR context
   from `sync/*` to `release/*`.
7. After that PR is merged by the provider, revalidate that production is an
   ancestor of the release.
8. Only then recommend or open context for the promotion PR from `release/*` to
   `main` or `master`.

This creates two explicit governance events:

| PR type | Source | Target | Purpose |
|---|---|---|---|
| Equalization PR | `sync/<release>-from-production` | `release/*` | Bring production commits into the release line |
| Promotion PR | `release/*` | `main` or `master` | Promote the validated release to production |

The extension must not merge `sync/*` into `release/*` directly when this policy
is active.

The first assisted Sync Sandbox phase must not push helper branches
automatically. The user is responsible for pushing the prepared `sync/*` branch
to the remote.

---

## 11. Functional Requirements

## FR01 - Flow Configuration

The extension must allow users to configure the branch governance model.

Configuration must be repository-versioned by default, using a file such as
`.git-revision-graph-flow.json`. When Flow Governance is activated and no flow
file exists, the extension should offer to create a default file in the
repository.

VS Code settings may still be used for bootstrap options, user overrides, or a
custom config path. If a technically sound way to store this information in Git
repository configuration is introduced later, it may be evaluated, but the
versioned flow file remains the preferred source of truth for governance.

Recommended precedence:

1. repository-versioned `.git-revision-graph-flow.json`;
2. workspace VS Code settings;
3. user VS Code settings;
4. extension defaults.

Expected settings:

- enable or disable Flow Governance;
- define regex patterns for each branch kind;
- define production branch names;
- define production tag patterns;
- define protected branch patterns;
- define PR-required target patterns;
- define linear-history or fast-forward-only target patterns;
- hide ephemeral branches by default;
- configure direct-merge handling for governed pairs;
- configure where diagnostics appear;
- configure whether GitHub PR creation is enabled.

Example:

```json
{
  "enabled": true,
  "mainBranches": ["main", "master"],
  "patterns": {
    "release": "^release/.+",
    "feature": "^feature/.+",
    "task": "^task/([A-Z]+-\\d+).+",
    "sync": "^sync/.+",
    "package": "^package(/.+)?$",
    "bug": "^bug/.+",
    "hotfix": "^hotfix/.+"
  },
  "protectedBranches": ["main", "master", "release/*", "feature/*"],
  "requirePullRequestTargets": ["main", "master", "release/*", "feature/*"],
  "requireLinearHistoryTargets": ["main", "master"],
  "hideSyncBranchesByDefault": true,
  "requirePullRequests": true,
  "directMergePolicy": "warn",
  "requireLinearReleasePromotion": true,
  "productionTagPattern": "^v\\d+\\.\\d+\\.\\d+$",
  "githubPullRequests": {
    "enabled": true
  }
}
```

## FR02 - Semantic Branch Classification

The extension must classify each loaded branch ref according to configured
patterns.

Suggested model:

```ts
type FlowBranchKind =
  | 'main'
  | 'release'
  | 'sync'
  | 'package'
  | 'feature'
  | 'task'
  | 'bug'
  | 'hotfix'
  | 'unknown';

type FlowBranchInfo = {
  refName: string;
  kind: FlowBranchKind;
  groupId?: string;
  issueId?: string;
  parentFeature?: string;
  isEphemeral: boolean;
  shouldHideByDefault: boolean;
  diagnostics: FlowDiagnostic[];
};
```

Classification must happen in the extension host or shared model layer. The
webview must not infer branch governance semantics from branch names on its own.

## FR03 - Visual Decorations

The graph must render branch identity using non-disruptive visual decorations.

Expected behavior:

- highlight `main` or `master` as the production trunk;
- show badges for release, hotfix, bug, package, sync, feature, task, and
  unknown branches;
- optionally hide ephemeral `sync/*` refs without deleting commits from the
  loaded graph;
- show unknown branches with a lightweight attention indicator;
- avoid decorations that reduce graph legibility.

Decorations are visual metadata. They must not become hard layout rules in the
first MVP.

## FR04 - Flow View

The extension should provide a Flow View mode that prioritizes branch-flow
readability.

Suggested controls:

- Flow View;
- Hide Sync Branches;
- Show Releases;
- Show Features;
- Show Tasks;
- Show Bugs;
- Show Hotfixes;
- Show Unknown Branches;
- Highlight Production Trunk.

The user must be able to reduce visual noise without losing access to the
underlying Git history.

## FR05 - PR-Gated Transition Diagnostics

The extension must detect governed source/target pairs and explain when final
integration requires a PR.

Initial diagnostics:

- direct merge discouraged or blocked because PR is required;
- release promotion blocked because production is not an ancestor of the
  release;
- equalization required before release promotion;
- source branch kind is not allowed for the selected target kind;
- source or target branch kind is unknown;
- validation is inconclusive because required Git data is unavailable.

Suggested severity:

```ts
type FlowDiagnosticSeverity = 'info' | 'warning' | 'error';
```

## FR06 - Release Readiness Checks

For `release/*` to `main` or `master`, the extension must check promotion
readiness.

Minimum checks:

- production branch exists in the loaded repository;
- release branch exists;
- production branch is an ancestor of the release branch;
- there is no unresolved merge or unsafe working tree state before any local
  helper action;
- validation result is visible to the user.

If the loaded graph window is insufficient to prove ancestry, the extension may
use targeted Git CLI calls. The result must be reported as validated,
blocked, or inconclusive.

## FR07 - Production Equalization Assistant

When release promotion is blocked, the extension may offer a guided equalization
flow.

Expected behavior:

- propose a `sync/*` branch name;
- create the sync branch from the release branch only after confirmation;
- merge production into the sync branch;
- pause on conflicts and hand off to VS Code Source Control;
- never resolve conflicts automatically;
- never force push;
- never delete the `sync/*` branch on error;
- do not push the sync branch in the first assisted phase;
- tell the user that the sync branch must be pushed before PR creation;
- create a GitHub PR from `sync/*` to `release/*` when the remote is supported
  and the branch already exists remotely;
- otherwise open or copy PR creation context from `sync/*` to `release/*`;
- refresh the graph after local operations.

Final merge of `sync/*` into `release/*` must happen through PR.

## FR08 - Task, Feature, Package, Bug, And Hotfix Relationships

The extension should identify branch relationships when they can be inferred
reliably.

Examples:

- `task/JIRA-123-login-form`;
- `feature/customer-dashboard`;
- `package/daily-integration`;
- `bug/payment-rounding`;
- `hotfix/production-login`.

Possible relationship signals:

- configured regex capture groups;
- branch naming conventions;
- Git ancestry, when sufficient data is available;
- remote tracking metadata.

Task-to-feature association should use both naming conventions and Git ancestry.
Naming provides the intended relationship, while ancestry validates or flags
possible drift.

The extension should provide a small assisted branch-creation form for governed
branches such as `task/*`. For task branches, the form should let the user choose
the target feature and then generate a consistent branch name from the configured
pattern.

Uncertain relationships must be marked as unknown or inconclusive. The extension
must not invent a relationship.

## FR09 - Governance Diagnostics

The extension should identify flow issues such as:

- branch outside the configured model;
- production commits missing from a release;
- release without a production tag after promotion;
- stale `sync/*` branch;
- task without an inferred feature;
- feature without inferred tasks;
- local branch without upstream;
- remote branch without local counterpart;
- hotfix not equalized back into active release lines;
- cleanup candidate branch;
- branch divergent from the production trunk.

Diagnostics may appear as:

- graph badges;
- node or ref tooltips;
- filters;
- contextual validation messages triggered by user actions;
- contextual actions.

A dedicated diagnostics panel or separate diagnostics editor is not part of the
MVP. In the optimistic operating model, teams are expected to open equalization
PRs when production hotfixes affect active release candidates, and server-side
branch protection should catch invalid promotion attempts.

Avoid notification spam. Notifications should be reserved for completed actions,
errors, conflicts, and destructive confirmations.

## FR10 - GitHub Pull Request Creation

The MVP must support automatic Pull Request creation for GitHub remotes.

Expected behavior:

- detect supported GitHub remotes;
- resolve repository owner and name from the remote URL;
- request GitHub authentication through VS Code authentication APIs;
- create a Pull Request through the GitHub API when the source branch exists on
  the remote;
- prefill source branch, target branch, title, and body;
- explain authentication, permission, SSO, repository, branch, or validation
  failures clearly;
- fall back to opening a PR URL or copying PR context if API creation fails or
  is unavailable.

The extension must not require GitLab, Azure DevOps, Bitbucket, or other
provider support in the MVP.

## FR11 - Cleanup Assistant

The extension should identify branches that may be safe to clean up after
consolidation.

A branch may be a cleanup candidate when:

- it has already been merged into `main` or `master`;
- it is contained in a production tag;
- it has been consolidated into a promoted release;
- it is not the current branch;
- it has no exclusive commits relevant to the configured flow;
- it is not protected by configuration;
- it is not required for an open or pending PR.

Expected behavior:

- show candidate branches;
- explain each recommendation;
- show risk level;
- provide dry-run;
- reuse existing assisted delete flows where safe;
- require explicit confirmation for destructive actions.

Out of MVP:

- remote deletion in bulk;
- automatic deletion;
- deletion based only on branch name.

---

## 12. Non-Functional Requirements

## NFR01 - Operational Safety

Any action that changes the repository must:

- require confirmation when destructive;
- block or pause in conflict states;
- respect the current branch;
- avoid deleting protected branches;
- explain impact clearly;
- allow cancellation before execution.

## NFR02 - History Preservation

The feature must not require squash to work.

Recommended flows should preserve individual commits and explicit merge history
where the team's provider policy allows it.

## NFR03 - Performance

Flow Governance must not force a full graph rebuild when only visual metadata
changes.

Whenever possible:

- classify branches as an overlay;
- reuse compatible graph snapshots;
- update badges, filters, and decorations without recomputing layout;
- avoid extra Git process fan-out;
- use targeted Git CLI only for checks not available through the Git API or the
  loaded graph.

## NFR04 - Configurability

The feature must not impose one branching model.

It should provide useful defaults while allowing teams to adapt branch names,
governed transitions, PR requirements, and diagnostics.

## NFR05 - Compatibility

Users who do not enable Flow Governance must not experience disruptive changes.

Existing graph actions, repository switching, empty states, focus modes,
minimap, search, context menus, Compare Results, Show Log, and native VS Code
workflows must continue to work.

---

## 13. Suggested Architecture

Add Flow Governance as an independent semantic layer under the existing revision
graph architecture.

Suggested directory:

```text
src/
  revisionGraph/
    flow/
      flowConfig.ts
      flowBranchClassifier.ts
      flowBranchRules.ts
      flowTransitionPolicy.ts
      flowPromotionChecks.ts
      flowDiagnostics.ts
      flowDecorations.ts
      flowGithubPullRequests.ts
      flowCleanupCandidates.ts
      flowSyncPlan.ts
```

Suggested responsibilities:

| File | Responsibility |
|---|---|
| `flowConfig.ts` | Read, validate, and normalize settings |
| `flowBranchClassifier.ts` | Classify refs into semantic branch kinds |
| `flowBranchRules.ts` | Centralize regex and default branch rules |
| `flowTransitionPolicy.ts` | Define allowed source/target transitions and PR requirements |
| `flowPromotionChecks.ts` | Validate release promotion readiness and ancestry |
| `flowDiagnostics.ts` | Generate governance diagnostics |
| `flowDecorations.ts` | Produce visual metadata for the graph view model |
| `flowGithubPullRequests.ts` | Create GitHub Pull Requests and provide fallback PR context |
| `flowCleanupCandidates.ts` | Identify cleanup candidates |
| `flowSyncPlan.ts` | Plan safe `sync/*` equalization flows |

Expected data flow:

```text
Git refs + commit graph
        |
Flow branch classification
        |
Transition policy and promotion checks
        |
Diagnostics and decorations
        |
Graph projection/view model
        |
Layout
        |
Webview rendering
```

The webview should receive classified metadata from the extension host or shared
model layer. It should render and filter; it should not own governance rules.

---

## 14. Recommended UX

## 14.1 Toolbar

Start with lightweight controls:

- Flow View;
- Flow Filters;
- Hide Sync Branches;
- Highlight Production Trunk.

Avoid adding a new persistent Activity Bar view, a separate diagnostics editor,
or a dedicated diagnostics panel for the MVP. Keep governance feedback close to
the graph through badges, tooltips, filters, and contextual validation messages.

## 14.2 Context Menu

Add contextual actions only when applicable:

- Show Flow Details;
- Hide Branch Type;
- Show Related Branches;
- Validate Release Promotion;
- Prepare Production Equalization;
- Create GitHub Pull Request, when the remote provider is supported;
- Copy PR Context;
- Open PR Compare URL, as fallback when available;
- Run Cleanup Dry-Run;
- Start Sync Sandbox.

## 14.3 Contextual Governance Feedback

The MVP should avoid a full diagnostics surface. Governance feedback should
appear only where it helps the current task:

- branch-kind badges in the graph;
- ref or node tooltips;
- inline validation messages for promotion and equalization actions;
- warning prompts for direct governed merges;
- fallback PR context when GitHub PR creation is unavailable.

## 14.4 Notifications

Avoid excessive notifications.

Use notifications only for:

- completed actions;
- errors;
- conflicts;
- destructive confirmations;
- blocked operations requiring explicit user attention.

---

## 15. Implementation Phases

## Phase 1 - Flow View And Configuration Foundation

Goal: deliver visual governance without changing the repository.

Included:

- repository-versioned `.git-revision-graph-flow.json` configuration;
- default flow file creation when Flow Governance is activated;
- branch classification;
- branch-kind badges;
- branch-kind filters;
- production trunk highlight;
- optional `sync/*` ref hiding;
- basic unknown-branch diagnostic;
- lightweight contextual feedback only;
- no repository mutations;
- no PR automation.

Acceptance criteria:

- users can enable and disable Flow View;
- configured branches are classified correctly;
- unknown branches are marked as `unknown`;
- `sync/*` refs can be hidden without removing commits from history;
- the feature does not alter the repository;
- existing graph behavior remains unchanged when disabled.

## Phase 2 - PR-Gated Policy And GitHub Pull Requests MVP

Goal: show governed transition policy, validate release readiness, and create
GitHub Pull Requests for supported remotes.

Included:

- PR-required transition diagnostics;
- release promotion ancestry check;
- production-missing-from-release diagnostic;
- tooltips;
- filters by diagnostic;
- GitHub remote detection;
- GitHub authentication through VS Code;
- automatic GitHub PR creation;
- fallback PR URL opening or copyable PR context.

Acceptance criteria:

- the MVP supports GitHub PR creation for supported authenticated remotes;
- the user understands why a transition requires a PR;
- release promotion is blocked when production is not an ancestor;
- inconclusive validation is reported honestly;
- GitHub PR creation succeeds for supported authenticated repositories;
- GitHub PR creation failures fall back to URL/context handoff;
- no diagnostic performs a destructive action.

## Phase 3 - Production Equalization Assistant

Goal: prepare safe production-to-release equalization when release promotion is
blocked.

Included:

- `sync/*` branch planning;
- local sync branch creation after confirmation;
- merge production into sync branch;
- conflict pause and Source Control handoff;
- no automatic push of sync branch;
- instruction that the user must push the branch manually;
- PR context from `sync/*` to `release/*`;
- graph refresh after local operations.

Acceptance criteria:

- unsafe working tree states block the flow;
- conflicts are resolved by the user;
- no squash is performed;
- no force push is performed;
- `sync/*` is not deleted on error;
- the user remains responsible for pushing the sync branch;
- final integration into `release/*` is PR-gated.

## Phase 4 - Cleanup Assistant

Goal: suggest safe branch cleanup after consolidation.

Included:

- cleanup candidate detection;
- recommendation explanation;
- dry-run;
- integration with existing assisted local delete;
- explicit confirmation.

Acceptance criteria:

- the extension never deletes a branch without confirmation;
- the current branch cannot be deleted;
- not-fully-merged branches require special confirmation or are blocked;
- remote bulk deletion remains out of MVP.

## Phase 5 - Additional Provider PR Helpers

Goal: expand PR handoff beyond GitHub without making the extension a full
provider client.

Included:

- recognize GitLab, Azure DevOps, Bitbucket, or other common remote URL formats;
- generate compare/PR URLs for additional supported providers;
- copy PR title/body context;
- keep provider integration optional.

Acceptance criteria:

- unsupported providers degrade gracefully;
- no additional provider token is required unless an explicit provider
  integration is implemented;
- no PR is created silently;
- provider-side policies remain authoritative.

---

## 16. General Acceptance Criteria

The feature is ready when:

- Flow Governance can be enabled and disabled;
- branch patterns are configured through a repository-versioned flow file;
- a default flow file is provided when governance is activated;
- branches are classified correctly;
- visual governance reduces noise without hiding history irreversibly;
- diagnostics are understandable and actionable;
- governed final integrations are PR-gated;
- GitHub Pull Requests can be created automatically for supported GitHub
  remotes;
- release promotion is blocked when production is missing from the release;
- production-to-release equalization is explicit and PR-gated;
- Sync Sandbox helper branches are not pushed automatically;
- destructive actions require confirmation;
- existing Git Revision Graph behavior remains intact;
- users outside the governance model are not disrupted.

---

## 17. Risks And Mitigations

| Risk | Impact | Mitigation |
|---|---:|---|
| Incorrect branch classification | Medium | Explicit regex settings and `unknown` fallback |
| Visual noise from too many badges | Medium | Filters, compact badges, and Flow View toggle |
| False release readiness result | High | Use ancestry checks; report inconclusive states honestly |
| Unsafe cleanup recommendation | High | Dry-run, protected branches, explicit confirmation |
| Sync Sandbox creates complex conflicts | High | Pause and hand off to VS Code Source Control |
| Performance degradation | Medium | Treat flow metadata as overlay and avoid unnecessary layout recompute |
| Governance model feels too rigid | Medium | Make branch patterns and transition policy configurable |
| Feature becomes a full Git/provider client | High | Keep provider integration optional and PR handoff lightweight |

---

## 18. Success Metrics

- Users report reduced visual noise in branch-heavy repositories.
- Flow View and flow filters are used repeatedly.
- Release promotion diagnostics catch missing production commits.
- Production-to-release equalization flows are completed through PRs.
- Cleanup dry-runs identify useful candidates without accidental deletion.
- Low error rate in assisted branch operations.
- Positive feedback compared with generic Git graph visualizers.

---

## 19. Resolved Product Decisions

1. The default model supports both `package` and multiple `package/*` branches.
   Package branches may integrate tasks for different release or feature
   targets.
2. Task-to-feature association uses both naming conventions and Git ancestry.
   The extension should provide a small branch-creation form to help users pick
   the target feature and generate a consistent task branch name.
3. A diagnostics panel or separate diagnostics editor is not part of the MVP.
   Governance feedback starts as lightweight badges, tooltips, filters, warning
   prompts, and contextual validation messages.
4. Flow configuration is repository-versioned by default in a file such as
   `.git-revision-graph-flow.json`. When governance is activated, the extension
   should provide a default file.
5. Sync Sandbox does not push helper branches in the first assisted phase. The
   user is responsible for pushing the prepared `sync/*` branch to the remote.
6. The MVP is GitHub-first for automatic PR creation. GitHub remotes should
   support PR creation through VS Code authentication and the GitHub API, with
   URL/context fallback.
7. Protected branches are configured explicitly in the versioned flow file when
   provider APIs are not used.
8. Direct governed merges default to `warn`. The extension warns that final
   integration must happen by PR, while remote branch protection remains the
   final enforcement layer.

---

## 20. Final Recommendation

Proceed with Flow Governance as an incremental, PR-gated governance layer.

Start with the Flow View and repository-versioned configuration foundation,
then deliver the GitHub-first PR-gated MVP. Production-to-release equalization
through `sync/*` branches should follow without automatic helper-branch pushes.

The most important product rule is:

> Git Revision Graph can start, prepare, validate, and explain governed flows,
> but final integration into governed branches happens through Pull Requests.
