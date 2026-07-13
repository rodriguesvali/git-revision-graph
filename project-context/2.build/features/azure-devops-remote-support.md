# Azure DevOps Remote Support Analysis

Status: Implemented; manual Extension Development Host validation pending
Last updated: 2026-07-13
Baseline: `2.0.0`

## Goal

Extend the existing remote-host handoff from GitHub to Azure DevOps without changing the Git
mutation model, adding credentials, or turning the extension into a provider API client.

The initial user outcome is:

1. Open a visible commit in the matching Git hosting web UI from the revision graph or Show Log.
2. Open the Azure DevOps Pull Request creation page from Flow Governance with the source and target
   branches selected.
3. Preserve the existing publication, divergence, production synchronization, and ancestry guards
   before the Pull Request handoff.

## Previous Baseline

The current GitHub integration is URL-only. It does not authenticate with GitHub or create Pull
Requests through an API.

- `src/showLog/remoteCommitUrl.ts` parses GitHub HTTPS/SSH remotes and builds commit URLs.
- `src/showLog/remoteCommitAction.ts` opens the URL and reports unsupported remotes.
- `src/revisionGraph/flow/flowPullRequestContext.ts` combines provider-neutral title/body generation
  with GitHub-specific remote parsing and compare/PR URL construction.
- `src/revisionGraph/flow/pullRequestWorkflow.ts` verifies the target, verifies or publishes the
  source branch, and then opens the GitHub URL.
- Revision Graph and Show Log webview messages, action names, labels, and tests encode GitHub in
  otherwise provider-neutral workflows.
- GitHub remote parsing is duplicated between commit browsing and Pull Request handoff.

No manifest contribution, command, setting, extension dependency, or runtime package is involved.

## Approved Scope

### Increment 1: provider-neutral URL handoff

- Support GitHub and Azure DevOps Services through one shared remote-host resolver.
- Recognize current Azure DevOps HTTPS and SSH clone URL shapes:
  - `https://dev.azure.com/{organization}/{project}/_git/{repository}`
  - HTTPS URLs with the optional Azure DevOps username component.
  - `git@ssh.dev.azure.com:v3/{organization}/{project}/{repository}`
  - equivalent `ssh://` URLs.
- Recognize the legacy hosted form
  `https://{organization}.visualstudio.com/{project}/_git/{repository}` when it can be normalized
  without ambiguity.
- Build Azure DevOps commit destinations as
  `{repositoryWebUrl}/commit/{commitId}`.
- Build Azure DevOps Pull Request handoff destinations as
  `{repositoryWebUrl}/pullrequestcreate` with `sourceRef=refs/heads/{source}` and
  `targetRef=refs/heads/{target}` through `URLSearchParams`.
- Keep title and description in the existing Flow Governance context dialog. Microsoft documents
  `sourceRef` and `targetRef` for the Pull Request creation URL, but does not document equivalent
  title/description deep-link parameters; the implementation must not depend on undocumented
  query parameters.
- Replace provider-specific UI text with stable neutral text such as `Open on Remote`,
  `Open Pull Request`, and `No supported Git hosting remote is configured for this repository.`
- Preserve origin-first remote selection, zero-repository handling, multi-repository isolation, and
  every existing Flow Governance preflight.

### Deferred increments

- Creating Pull Requests through Azure DevOps REST APIs.
- Microsoft Entra/OAuth/PAT acquisition, storage, or refresh.
- Existing Pull Request detection, reviewer assignment, draft/auto-complete options, policies, or
  work-item linking.
- Azure Boards integration.
- Azure DevOps Server/on-premises support with arbitrary collection paths and versions. HTTPS
  installations may share the hosted URL shape, but they need explicit fixtures and manual
  validation before being claimed as supported.
- Any GitHub API expansion. Azure DevOps should initially match the existing GitHub URL handoff,
  not introduce an asymmetric authenticated workflow.

## Implemented Architecture

Extract a small shared host model instead of adding Azure conditionals to both existing parsers.
A discriminated union is sufficient for two providers and keeps the implementation lighter than a
runtime adapter registry.

The focused shared contract is implemented in `src/hostedGitRemote.ts`:

```ts
type HostedGitProvider = 'github' | 'azure-devops';

interface HostedGitRemote {
  readonly provider: HostedGitProvider;
  readonly providerLabel: 'GitHub' | 'Azure DevOps';
  readonly name: string;
  readonly isReadOnly: boolean;
  readonly repositoryWebUrl: string;
}
```

The module should own:

- parsing one fetch or push URL into a credential-free canonical repository web URL;
- resolving a supported repository remote with the current origin-first behavior;
- building provider-specific commit URLs;
- building provider-specific Pull Request handoff URLs;
- normalizing `.git`, percent-encoded organization/project/repository segments, and branch refs;
- rejecting malformed, incomplete, or ambiguous remotes.

`flowPullRequestContext.ts` should retain only provider-neutral context creation. The Pull Request
workflow should resolve the hosted remote once and use the same result for preflight selection and
URL construction. Commit actions should become provider-neutral thin consumers of the shared
module.

The webview does not need provider metadata for Increment 1. Neutral labels avoid adding remote
state to the serialized graph and keep provider detection in the trusted extension host.

## Data Flow

```text
vscode.git Repository.state.remotes
  -> origin-first hosted remote resolver
  -> GitHub | Azure DevOps normalized repository web URL
  -> commit URL -----------------------------> vscode.env.openExternal
  -> Flow Governance target/source preflight
       -> optional confirmed publish/push
       -> Pull Request creation deep link ----> vscode.env.openExternal
```

## Security And Correctness Constraints

- Reconstruct browser URLs from parsed components; never propagate remote URL user information,
  embedded PATs, query strings, or fragments.
- Allow only the documented hosted domains in the first increment:
  `github.com`, `dev.azure.com`, `ssh.dev.azure.com`, and the recognized
  `{organization}.visualstudio.com` form.
- Encode organization, project, repository, commit, and ref values exactly once.
- Reject empty components, traversal-like segments, non-HTTP browser schemes, and unsupported SSH
  hosts.
- For Pull Request handoff, fail closed when fetch and push URLs resolve to different providers or
  repositories. Otherwise the existing publication check and the opened Pull Request destination
  can refer to different servers.
- Continue validating webview messages and loaded commit hashes before opening external URLs.

## Touched Surfaces

Production changes:

- Added the shared `src/hostedGitRemote.ts` parser/builder module.
- `src/showLog/remoteCommitUrl.ts` and `src/showLog/remoteCommitAction.ts`, renamed or reduced to
  provider-neutral wrappers.
- `src/showLogView.ts`, `src/showLogWebview.ts`, Show Log message types/handlers, and their labels.
- `src/revisionGraph/flow/flowPullRequestContext.ts` and
  `src/revisionGraph/flow/pullRequestWorkflow.ts`.
- Revision Graph controller/message host contracts, protocol, validation, authorization, webview
  message helpers, reference tooltip, and Pull Request dialog label.
- Flow exports where GitHub-specific functions are currently public inside the source tree.
- README feature and manual-validation language.

Test changes:

- Add a dedicated shared remote-host URL test matrix.
- Generalize the current GitHub commit-action tests and Flow Governance URL tests.
- Update Show Log and Revision Graph webview shell, message validation, authorization, and dispatch
  expectations from GitHub-specific to provider-neutral names.
- Add mixed-provider, origin preference, fetch/push mismatch, URL credential stripping, malformed
  URL, empty ref/hash, encoded name, and non-supported host cases.

`package.json` should not change: no command, menu, view, setting, activation event, dependency, or
engine change is required.

## Acceptance Criteria

- Existing GitHub HTTPS and SSH behavior remains functional.
- Supported Azure DevOps HTTPS and SSH remotes open the correct commit page from both Revision Graph
  and Show Log.
- Flow Governance opens the Azure DevOps Pull Request creation page with explicit source and target
  branch refs only after the existing guards pass.
- Unsupported remotes produce one provider-neutral actionable message and do not open a URL.
- The resolver prefers `origin`, then other remotes, without leaking credentials into browser URLs.
- Pull Request handoff rejects ambiguous fetch/push repository identities.
- Zero-repository and multi-repository behavior is unchanged.
- No provider token is requested, stored, logged, or added to configuration.
- `npm run build`, `npm test`, and `git diff --check` pass.

## Manual Validation

Use one GitHub repository and one Azure DevOps Services repository in the same Extension Development
Host workspace.

- Open commits from a Revision Graph reference tooltip and from Show Log for both providers.
- Verify HTTPS, current SSH, and a legacy `visualstudio.com` Azure remote where available.
- Run a governed Pull Request handoff with a ready source and verify source/target selection.
- Exercise an unpublished source and confirm publish/push occurs only after consent, then verify the
  opened Pull Request points to that same remote.
- Verify remote-ahead, divergent, production-out-of-sync, non-ancestor, read-only, unsupported, and
  canceled flows remain closed.
- Confirm no username, PAT, query, or fragment from the Git remote appears in the opened browser URL
  or output logs.

## Risks

- Microsoft documents the Pull Request `sourceRef`/`targetRef` behavior, but the exact portal route
  and commit route still need live smoke coverage because portal routes are less formal than REST
  API contracts.
- Azure organization, project, and repository names may contain spaces or encoded characters;
  double encoding is the most likely parser defect.
- Split fetch/push URLs can point to different hosts. The current GitHub-only implementation does
  not model that ambiguity explicitly.
- Renaming internal webview messages touches several validation and authorization tests, although
  it is not a public extension API.
- Azure DevOps Server URL shapes vary by version and collection path and should not be inferred from
  hosted-service tests.

## Decisions

- Azure DevOps Services is the first support boundary; Azure DevOps Server remains deferred.
- Remote-host actions use provider-neutral labels and do not expand serialized graph state.
- Azure DevOps matches the existing GitHub URL handoff; authenticated API creation remains deferred.
- Recognized legacy hosted `visualstudio.com` HTTPS and SSH forms are included in compatibility
  coverage.

## Implementation Slices

1. Shared parser/model and exhaustive pure URL tests.
2. Provider-neutral commit browsing in Revision Graph and Show Log, including protocol renames and
   shell/dispatch tests.
3. Provider-neutral Flow Governance Pull Request handoff and preflight alignment tests.
4. README, focused manual smoke, full deterministic verification, and release artifact update when
   the feature is approved for a release.

## Sources

- Local architecture: `package.json`, `src/git.ts`, `src/showLog/remoteCommitUrl.ts`,
  `src/revisionGraph/flow/flowPullRequestContext.ts`, and
  `src/revisionGraph/flow/pullRequestWorkflow.ts`.
- Microsoft Learn, Azure Repos SSH URL formats:
  <https://learn.microsoft.com/en-us/azure/devops/repos/git/use-ssh-keys-to-authenticate?view=azure-devops>
- Microsoft Learn, Azure DevOps Pull Request URL target selection:
  <https://learn.microsoft.com/en-us/azure/devops/repos/git/pull-request-targets?view=azure-devops>
- Microsoft Learn, commit details UI:
  <https://learn.microsoft.com/en-us/azure/devops/repos/git/commit-details?view=azure-devops>
- Microsoft Learn, authenticated Pull Request REST API and `vso.code_write` scope:
  <https://learn.microsoft.com/en-us/rest/api/azure/devops/git/pull-requests/create?view=azure-devops-rest-7.1>

## Verification

Implementation verification on 2026-07-13 passed `npm run quality:check` (204 production files and
2,019 functions), `npm run build`, `npm test` (695 tests), and `git diff --check`. `graphify update .`
rebuilt the code graph with 4,190 nodes, 8,274 edges, and 324 communities.

## Handoff Notes

Increment 1 remains intentionally URL-only and requires no new dependency or user configuration.
The release candidate still needs live Azure DevOps Services smoke for commit and Pull Request
portal routes. The shared resolver was subsequently generalized through
`project-context/2.build/features/hosted-git-provider-adapters.md`; Azure DevOps now participates as
one adapter without changing its approved URL behavior. Packaging, version changes, and Marketplace
publication remain unauthorized.
