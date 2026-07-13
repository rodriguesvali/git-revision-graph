# Hosted Git Provider Adapters

Status: Implemented; live provider smoke pending
Last updated: 2026-07-13
Baseline: `2.0.0`

## Goal

Make hosted Git URL handoff extensible beyond GitHub and Azure DevOps, then add a conservative
URL-only integration for GitLab.com, AWS CodeCommit, and Google Cloud Secure Source Manager.

The extension remains a Git client and browser handoff. It does not acquire provider credentials,
call hosting APIs, create review requests automatically, or add runtime dependencies.

## Provider Capability Matrix

| Provider | Remote formats | Commit destination | Review-request destination |
| --- | --- | --- | --- |
| GitHub | Hosted HTTPS/SSH/git | Exact commit | Prefilled compare/Pull Request page |
| Azure DevOps Services | Current and recognized legacy HTTPS/SSH | Exact commit | Prefilled Pull Request page |
| GitLab.com | HTTPS/SSH with nested namespaces | Exact commit | Prefilled Merge Request page |
| AWS CodeCommit | Regional HTTPS/SSH, including FIPS and China endpoints | Exact commit | Repository Pull Requests area; branches remain manual |
| Google Secure Source Manager | Default `sourcemanager.dev` HTTPS/SSH hosts | Deferred until a documented exact route exists | Repository page; Pull Request navigation and branches remain manual |

GitLab Self-Managed, Secure Source Manager custom domains, Cloud Source Repositories, CodeCommit's
`codecommit://` remote helper, and authenticated provider APIs remain deferred. Arbitrary hosts must
not be classified by heuristics because browser URL reconstruction is a security boundary.

## Architecture

Replace provider conditionals in `src/hostedGitRemote.ts` with a small ordered adapter registry.
Each adapter owns:

- recognition of its trusted clone hosts and URL shapes;
- canonical, credential-free repository web URL construction;
- logical repository identity for fetch/push equivalence;
- exact commit URL construction when verified;
- review-request handoff construction and its supported prefill level.

The generic resolver continues to own origin-first selection, fetch/push identity validation,
read-only state, branch/hash normalization, and capability-aware dispatch. Controllers, webviews,
Show Log, and Flow Governance remain provider-neutral.

## Security And Correctness Constraints

- Reconstruct browser URLs from validated components and never forward clone URL credentials,
  queries, or fragments.
- Match only explicit hosted domains and documented regional host patterns.
- Reject empty, traversal-like, slash-containing, control-character, or malformed encoded path
  components.
- Treat the AWS region and partition as part of repository identity.
- Treat the Secure Source Manager instance host, project, and repository as identity components.
- Fail closed when fetch and push URLs identify different repositories or providers.
- Do not invent undocumented commit or review-request query routes. A provider adapter may expose
  only the capabilities supported by verified destinations.

## Acceptance Criteria

- Existing GitHub and Azure DevOps tests and behavior remain unchanged.
- GitLab.com HTTPS/SSH remotes with nested groups open exact commits and a prefilled Merge Request.
- CodeCommit regional HTTPS/SSH remotes open exact commits and the repository Pull Requests area.
- Secure Source Manager default HTTPS/SSH remotes normalize to the documented HTML repository URL
  and participate in Pull Request handoff without claiming an exact commit deep link.
- Mixed fetch/push providers, repositories, regions, partitions, or SSM instances fail closed.
- Provider-specific capabilities are implemented through adapters rather than a growing provider
  conditional in the shared resolver.
- README, changelog, smoke matrix, SAD, and release notes describe the actual capability levels.
- `npm run quality:check`, `npm run build`, `npm test`, and `git diff --check` pass.

## Manual Validation

- GitLab.com: open a commit from Revision Graph and Show Log; open a governed Merge Request and
  verify source, target, title, and description.
- CodeCommit: open a commit in the correct AWS region; verify the Pull Requests area opens only
  after the existing Flow Governance preflight.
- Secure Source Manager: verify HTTPS and SSH remotes resolve to the HTML repository, then navigate
  through the Pull Requests tab using the copied Flow Governance context.
- For every provider, verify credentials and clone URL queries/fragments never reach the browser.

## Sources

- GitLab merge-request URL generation in the official `glab` implementation:
  <https://gitlab.com/gitlab-org/cli/-/blob/v1.82.0/internal/commands/mr/create/mr_create.go>
- GitLab nested namespaces and hosted clone formats:
  <https://docs.gitlab.com/user/namespace/> and <https://docs.gitlab.com/topics/git/clone/>
- AWS regional Git endpoints:
  <https://docs.aws.amazon.com/codecommit/latest/userguide/regions.html>
- AWS documented CodeCommit commit console URL:
  <https://docs.aws.amazon.com/codepipeline/latest/userguide/tutorials-lambda-variables.html>
- AWS Pull Request console workflow:
  <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-create-pull-request.html>
- Secure Source Manager repository HTML/Git URI mapping:
  <https://docs.cloud.google.com/secure-source-manager/docs/create-repository>
- Secure Source Manager Pull Request workflow:
  <https://docs.cloud.google.com/secure-source-manager/docs/work-with-issues-pull-requests>

## Verification

Implementation verification on 2026-07-13 passed `npm run quality:check` (212 production files and
2,041 functions), `npm run build`, `npm test` (703 tests), and `git diff --check`. `graphify update .`
rebuilt the code graph with 4,228 nodes, 8,396 edges, and 317 communities.

Automated coverage includes existing GitHub/Azure behavior, GitLab nested namespaces and
credential stripping, CodeCommit HTTPS/SSH/FIPS/China routes and regional identity, Secure Source
Manager HTTPS/SSH equivalence, unsupported custom hosts/helpers, capability-aware commit feedback,
and fetch/push mismatch rejection.

## Handoff Notes

Live Extension Development Host smoke remains pending for the three newly added providers. Secure
Source Manager exact commit linking remains deliberately deferred, and CodeCommit/Secure Source
Manager Pull Request destinations deliberately do not claim branch prefill. Packaging, version
changes, and Marketplace publication remain unauthorized.
