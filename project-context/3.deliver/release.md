# Release Readiness

Status: `1.6.9` development cycle opened; functional scope pending
Last consolidated: 2026-08-25

## Current State

- Current package version: `1.6.9` in `package.json` and the root `package-lock.json`.
- Latest recorded Marketplace-published release: `1.6.8`, by maintainer confirmation on 2026-08-25.
- Release cycle status: `1.6.9` was opened from the published `1.6.8` baseline on 2026-08-25.
  No functional scope, verification, packaging, tag, or Marketplace action is implied by this
  opening.
- Release cycle status: `1.6.8` was opened from the published `1.6.7` baseline on 2026-08-22. Its
  candidate scope contains exact-branch Show Log opening, nonblocking Fetch/Pull/Push feedback and
  refresh, readable long reference badges in commit tooltips, compact Show Log commit rows, and a
  rebranded Marketplace Overview with approved video and screenshot media.
  Local verification, GitHub Actions Verify run `#211`, Extension Development Host smoke by
  maintainer confirmation, VSIX packaging, isolated installation, and Marketplace publication are
  complete. Hosted media preview evidence remains unrecorded.
- Release cycle status: `1.6.7` implementation, local automated verification, Extension Development
  Host smoke, and Marketplace publication are complete. Focused feature artifacts and release notes
  are synchronized. Exact publication timestamp, VSIX identity and inspection, clean-profile
  installation, source tag, and installed-version evidence were not supplied and are not inferred.
- Latest tagged source baseline: `1.6.3` at `c620e35` on 2026-08-01. VSIX and Marketplace
  publication evidence for that tag was not supplied and is not inferred.
- Release cycle status: `1.6.4` was published on 2026-08-08 by maintainer confirmation after a
  patch release focused on measured,
  staged revision-graph loading performance improvements. The first slice parallelizes
  independent ready-state metadata and skips unnecessary Flow Governance Git metadata while Flow
  is disabled. The second slice reuses one healthy idle layout worker across sequential cache
  misses while preserving concurrent isolation and failure disposal. The third sends repository
  status-only changes as scene-bound deltas without structural webview rebuilding. The fourth uses
  count-only projection analysis for adaptive snapshot limits instead of constructing discarded
  projected nodes and edges. The fifth shares one runtime-protected canonical layout result across
  cache hits instead of cloning positions, routes, and route points repeatedly. The existing
  `d3-dag` dependency is now `1.2.2`; layout-quality changes remain deferred. The cycle also
  corrects Azure DevOps Services Pull Request portal deep links to use short branch names and
  reports a failed external browser launch. It also stabilizes shared-modal-warning contracts used
  by CI and remediates the development-only `js-yaml` audit finding. Exact Marketplace timestamp,
  tagged-source, VSIX inspection, clean-profile installation, hosted rerun, and manual-smoke
  evidence were not supplied and are intentionally not inferred.
- The preceding `1.6.3` cycle scope was package
  creation from synchronized feature branches with exact package-to-feature Pull Request targeting,
  `Focus Descendants` projection and virtual-scene rendering performance corrections for large
  merge-heavy histories, consistent delayed custom tooltips that do not obstruct context menus, and
  shared simplicity, cohesion, and organization guidance for extension-authored AI prompts. Show Log
  also exposes guarded local-branch checkout from exact commits, local tag creation, compact
  expanded file lists, and all-branch target histories by default. Packaging and publication remain
  subject to maintainer approval.
- Publication evidence reconciliation for `1.6.4`: Marketplace publication was confirmed by the
  maintainer. Exact publication timestamp, installed-version, tagged-source, VSIX inspection,
  clean-profile installation, hosted validation, and manual-smoke evidence remain unrecorded.
- Published-baseline reconciliation: the exact `1.6.2` Marketplace timestamp, installed-version
  evidence, final smoke record, and VSIX inspection record have not yet been supplied for that
  release artifact.
- Historical release readiness notes are archived at `project-context/archive/releases/release-readiness-history.md`.

## Planned Release: 1.6.9

Status: Cycle opened; functional scope pending
Opened: 2026-08-25
Published baseline version: `1.6.8`
Target version: `1.6.9`

Focused build artifact:

- `project-context/2.build/features/1.6.9-release-cycle-opening.md`

### Release Gate Summary

| Gate | Status | Evidence / next action |
| --- | --- | --- |
| Published baseline | Complete | `1.6.8` was published by maintainer confirmation on 2026-08-25. |
| Release scope | Pending | Define and approve focused feature artifacts before implementation. |
| Package metadata | Complete | `package.json` and the root `package-lock.json` declare `1.6.9`. |
| Release notes | Pending | Add only after user-visible scope is approved and delivered. |
| Automated verification | Pending | Run feature-proportional checks after implementation. |
| Extension Development Host smoke | Pending | Select scenarios once user-visible scope is approved. |
| VSIX package inspection | Pending | Requires a separately authorized release-candidate package. |
| Marketplace publication | Not started | Requires separate explicit maintainer authorization. |
| Rollback readiness | Documented | Before publication, revert metadata and approved scoped changes; after publication, use a later patch or maintainer-approved Marketplace action. |

Opening record:

- Version metadata was aligned to `1.6.9` on 2026-08-25 to start the development cycle.
- The published `1.6.8` baseline was confirmed by the maintainer on 2026-08-25; exact publication
  timestamp, tag, VSIX identity, and installed-version evidence were not supplied and are not
  inferred.
- No runtime source, dependency, contribution point, release note, VSIX package, Git tag,
  publication command, or Marketplace action was included in the cycle opening.

### Release Constraints And Risks

- Preserve the published extension architecture and `1.6.8` behavior until focused scope is approved.
- Keep package metadata synchronized and do not present the open cycle as release-ready.
- Do not add dependencies, create a release tag, or publish without explicit maintainer approval.

### Planned Verification

- `npm run build` for the package-surface change.
- `git diff --check` before the cycle-opening handoff.
- Feature-proportional tests and Extension Development Host smoke after scope approval.

## Published Release: 1.6.8

Status: Published by maintainer confirmation; post-publication evidence reconciliation pending
Opened: 2026-08-22
Published baseline version: `1.6.7`
Target version: `1.6.8`

Focused build artifact:

- `project-context/2.build/features/1.6.8-release-cycle-opening.md`
- `project-context/2.build/features/1.6.8-show-log-target-scope.md`
- `project-context/2.build/features/1.6.8-nonblocking-remote-refresh.md`
- `project-context/2.build/features/1.6.8-show-log-reference-badge-readability.md`
- `project-context/2.build/features/1.6.8-show-log-compact-commit-rows.md`
- `project-context/2.build/features/1.6.8-ci-cross-platform-path-reliability.md`
- `project-context/2.build/features/1.6.8-marketplace-overview-rebrand.md`

### Release Gate Summary

| Gate | Status | Evidence / next action |
| --- | --- | --- |
| Published baseline | Complete | `1.6.7` was published by maintainer confirmation on 2026-08-15. |
| Release scope | Complete for candidate | Exact-branch Show Log opening, nonblocking Fetch/Pull/Push refresh, long-reference tooltip readability, compact commit rows, and the Marketplace Overview rebrand are implemented. |
| Package metadata | Complete | `package.json` and the root `package-lock.json` declare `1.6.8`. |
| Release notes | Complete | `CHANGELOG.md` and the candidate notes below describe the reviewed user-visible `1.6.8` scope. |
| Automated verification | Complete | All 838 tests and all 39 platform tests passed locally. GitHub Actions Verify run `#211` passed on Ubuntu, Windows, macOS, VS Code `1.90.0`, and VS Code stable. Quality, build, audit, benchmark, whitespace, and Graphify gates are recorded. |
| Extension Development Host smoke | Complete by maintainer confirmation | The maintainer confirmed completion on 2026-08-23. Exact VS Code version, platform, operator identity, and scenario-level results were not supplied and are not inferred. |
| VSIX package inspection | Complete | `git-revision-graph-1.6.8.vsix` contains 651 files (1,119,436 bytes); ZIP integrity, embedded identity/version, required runtime assets, and expected exclusions passed. SHA-256: `1b5eb3b75b47d76a1e119022057a8d1c7bed3d316401cf2308a88cf577a5a1ac`. |
| Clean-profile installation | Complete | VS Code Server `1.129.0` installed the package in isolated temporary data and extension directories and listed `rodriguesvali.git-revision-graph@1.6.8`; the installed manifest retained `./out/extension.js`. |
| Marketplace publication | Complete by maintainer confirmation | Publication was reported complete on 2026-08-25. Exact Marketplace timestamp and installed-version evidence were not supplied. |
| Rollback readiness | Documented | Before publication, revert the metadata and scoped feature changes; after publication, use a later patch or maintainer-approved Marketplace action. |

Opening record:

- Version metadata was aligned to `1.6.8` on 2026-08-22 to start the development cycle.
- Manifest consistency, `npm run build`, and `git diff --check` passed; `graphify update .`
  refreshed the repository knowledge graph.
- No runtime source, dependency, contribution point, release note, VSIX package, Git tag,
  publication command, or Marketplace action was included in the cycle opening.
- `1.7.0` is not implied; any larger scope or version change requires maintainer approval.

Implemented scope:

- Show Log invoked from a graph branch reference now starts with `Show All Branches` disabled, so
  the initial Git log remains scoped to the exact selected reference. The existing toggle remains
  available for explicit expansion to all branches.
- Fetch, Pull, and Push now use subtle progress so the graph is not covered by a pointer-blocking
  overlay. Fetch prepares event suppression before Git to avoid a competing rebuild; Pull retains
  a full topology rebuild; Push uses snapshot-backed projection refresh with safe full fallback.
- Show Log commit tooltips now let reference badges use the available tooltip width and wrap long
  unbroken names, while the commit-row badges retain their compact ellipsis behavior.
- Show Log commit rows no longer repeat file-change totals beneath the subject. Commits without
  references use a compact single line, while the existing tooltip retains the full statistics.
- The Flow Governance configuration-opening contract now compares canonical filesystem paths, so
  Windows 8.3 aliases and the macOS `/var` symlink no longer fail the hosted verification matrix.
- The Marketplace Overview now leads with a concise value proposition and approved VP8/WebM demo,
  then presents Revision Graph, Compare Results, Show Log, Git actions, Flow Governance, safety,
  and current boundaries in grouped sections. Contributor setup and validation moved to
  `CONTRIBUTING.md`, and externally hosted Marketplace media remains outside the VSIX.

Verification record:

- `npm test` passed all 835 tests, including the regression that preserves the exact
  `feature/demo` target, initially loads it with `showAllBranches: false`, and reloads only after
  explicit opt-in with `showAllBranches: true`.
- `npm run build` passed as part of the full test gate.
- `npm run quality:check` passed for 252 production files and 2,406 functions.
- `graphify update .` refreshed the repository knowledge graph.
- `git diff --check` passed.
- After the remote-refresh slice, `npm test` passed all 838 tests and `npm run quality:check`
  passed for 252 production files and 2,410 functions.
- `npm run benchmark:ci` passed with 192 projected nodes, 112.01 ms initial layout, 2.49 ms cache
  hit, and 21.41 ms descendant-focus layout in the recorded environment.
- `graphify update .` refreshed the code knowledge graph after the remote-refresh source changes.
- For Show Log reference readability on 2026-08-23, `npm run quality:check` passed for 252
  production files and 2,410 functions; `npm run build` and all 838 tests passed.
- `graphify update .` refreshed the code knowledge graph after the Show Log style change.
- For compact Show Log commit rows on 2026-08-23, `npm run quality:check` passed for 252 production
  files and 2,410 functions; `npm run build` and all 838 tests passed after the 26 px compact height
  was propagated through row, SVG, and marker geometry. The reduced-file line-count quality
  ratchets were aligned to their reviewed values.
- For the cross-platform Flow Governance path contract correction on 2026-08-23, `npm test`
  passed all 838 tests and `npm run test:platform` passed all 39 tests. The expected editor path is
  now resolved with `realpath()`, matching the production safety boundary on Linux, Windows, and
  macOS without changing runtime behavior.
- GitHub Actions Verify run `#211` completed successfully on commit `4c8f34d`: the Node 24 jobs on
  Ubuntu, Windows, and macOS passed, as did the Extension Host E2E jobs on VS Code `1.90.0` and
  VS Code stable. The hosted jobs also completed the configured quality, build, unit, platform,
  benchmark, whitespace, and dependency-audit gates.
- During publication-artifact review on 2026-08-23, `npm run quality:check`, `npm test`,
  `npm audit --omit=dev`, and `npm audit` passed. `npx vsce ls` confirmed that `CHANGELOG.md` is in
  the package surface and `.codex` development configuration is excluded; `git diff --check`
  passed. No VSIX was created.
- For the Marketplace Overview rebrand on 2026-08-23, the three 1600x900 screenshots, branded
  poster, and 41.68-second VP8/WebM demo passed local format and full-decoding checks.
  `npm test` passed all 838 tests, including the active README regression contract, and its build
  stage completed successfully. `npx vsce ls` confirmed that the README and extension icon remain
  in the package while externally hosted Marketplace media, `CONTRIBUTING.md`, and
  `project-context/**` remain excluded. A hosted Marketplace and VS Code Extensions preview remains
  pending until the candidate assets are pushed. No VSIX was created.
- The maintainer confirmed the Extension Development Host smoke complete on 2026-08-23. Exact VS
  Code version, platform, operator identity, and scenario-level evidence were not supplied and are
  intentionally not inferred.
- For final candidate packaging on 2026-08-23, `npm ci` completed with zero vulnerabilities and
  `npm test` passed all 838 tests before `npm run package:vsix` created
  `git-revision-graph-1.6.8.vsix`. The package contains 651 files and is 1,119,436 bytes
  (approximately 1.1 MiB), with SHA-256
  `1b5eb3b75b47d76a1e119022057a8d1c7bed3d316401cf2308a88cf577a5a1ac`. ZIP integrity passed;
  the embedded VSIX and extension manifests identify publisher `rodriguesvali`, extension
  `git-revision-graph`, version `1.6.8`, VS Code engine `^1.90.0`, and entrypoint
  `./out/extension.js`. README, changelog, license, icon, extension entrypoint, and revision-graph
  webview runtime are present. Marketplace media, `CONTRIBUTING.md`, `project-context/**`, source,
  tests, source maps, and `.env` files are excluded as intended. VS Code Server `1.129.0` then
  installed and listed `rodriguesvali.git-revision-graph@1.6.8` from isolated temporary data and
  extension directories. No Git tag or Marketplace publication was performed.
- `graphify update .` refreshed the code knowledge graph after the compact-row change, with the
  existing zero-node and stale-community-label warnings recorded in the focused artifact.

### Release Constraints And Risks

- Preserve the published extension architecture and the `1.6.7` behavior until focused scope is
  approved.
- Keep package metadata synchronized and do not present the open cycle as release-ready.
- Do not add dependencies, create a release tag, or publish without explicit maintainer approval.

### Planned Verification

- `npm run build` for the package-surface change.
- Feature-proportional focused tests and `npm test` when behavior changes land.
- `git diff --check` before each implementation handoff and release-candidate packaging.
- Extension Development Host smoke selected from the standard matrix for approved user-visible
  changes.

### Candidate Release Notes

- Show Log opens on the exact branch selected in the revision graph instead of initially mixing in
  other branch histories. `Show All Branches` remains available as an explicit option.
- Fetch, Pull, and Push keep the graph interactive while remote work and graph updates run. Fetch
  avoids a competing rebuild, while Push reuses the loaded graph snapshot when safe.
- Show Log commit tooltips reveal complete long branch, tag, and remote-reference names without
  widening commit rows.
- Show Log uses compact single-line rows for commits without references; file, insertion, and
  deletion totals remain available in the commit tooltip.
- The Marketplace Overview adds a short product demo, branded poster, focused screenshots, and a
  concise tour of the extension's graph, review, Git workflow, and Flow Governance capabilities.

### Marketplace Impact And Rollback

- The current Marketplace impact corrects initial Show Log branch scope, improves long-reference
  readability and commit-row density, improves remote-action loading/refresh behavior, and replaces
  the documentation-heavy Overview with a media-led product narrative; no command, setting,
  contribution point, or dependency changed.
- Before publication, rollback is a focused revert of the `1.6.8` metadata and any separately
  approved feature slices.
- After publication, never reuse `1.6.8`; correct issues through a later patch or an explicitly
  approved Marketplace action.

## Published Release: 1.6.7

Status: Published by maintainer confirmation; post-publication evidence reconciliation pending
Opened: 2026-08-15
Published: 2026-08-15 (maintainer confirmation)
Published baseline version: `1.6.6`
Target version: `1.6.7`

### Release Gate Summary

| Gate | Status | Evidence / next action |
| --- | --- | --- |
| Published baseline | Complete | `1.6.6` was published by maintainer confirmation on 2026-08-10. |
| Release scope | Implemented | Removed the low-value `Promotion PR Context` workflow; added repository-file-backed Flow Governance state, selectable revision-graph layouts, compact keyboard-accessible graph search, and Show Log marker refinements. |
| Package metadata | Complete | `package.json` and root `package-lock.json` declare `1.6.7`. |
| Automated verification | Complete for implementation | `npm test` passed 835 tests, including compact graph search, automatic layout-profile presentation, repository-file toggle creation/state coverage, retained Flow Governance, orchestration, message boundaries, and webview behavior; build, quality, whitespace, and CI graph benchmark gates passed. |
| Extension Development Host smoke | Complete | Passed by maintainer confirmation on 2026-08-15 for Flow config creation/editor reveal, retained governance menus, absence of Promotion PR Context, layout strategies, compact search, and Show Log markers. Platform, VS Code version, fixture, and per-scenario evidence were not supplied and are not inferred. |
| VSIX package inspection | Evidence not recorded | Publication implies a package was produced, but its filename, checksum, size, embedded-version inspection, runtime-asset inspection, and clean-profile installation result were not supplied. |
| Marketplace publication | Complete by maintainer confirmation | Publication was reported complete on 2026-08-15. The exact Marketplace timestamp and installed-version evidence were not supplied. |
| Rollback readiness | Documented | Before publication, revert scoped source and metadata changes; after publication, correct through a later patch or maintainer-approved Marketplace action. |

Opening record:

- Version metadata was aligned to `1.6.7` on 2026-08-15 to start the development cycle.
- At cycle opening, no release scope, dependency change, VSIX package, Git tag, publication command,
  or Marketplace action had been performed.
- The published `1.6.6` baseline and its outstanding post-publication evidence remain recorded below.
- `Promotion PR Context` was removed after user feedback that its review, preflight, and provider-handoff flow causes more friction than value. No replacement Pull Request workflow was introduced.
- The deconstruction also removes the unused Pull Request URL contract and implementations from hosted Git provider adapters while retaining remote parsing and verified commit links.
- Flow Governance now exposes an always-visible repository-file-backed checkbox. Missing config is
  treated as disabled; enabling creates the default file, and existing files persist `enabled`.
- Revision Graph search now opens from an icon-only toolbar action or `Ctrl+F`/`Cmd+F` in a floating
  panel, preserving active queries while recovering horizontal toolbar space. Automatic layout mode
  identifies the adaptive profile selected for the current projection.

### Candidate Release Notes

- Flow Governance is now always visible and follows the repository configuration file. Enabling it
  without a file creates the safe default and opens the file for review.
- The low-value `Promotion PR Context` dialog and provider handoff were removed. Existing branch,
  equalization, description, hosted-commit, and repository-native Pull Request workflows remain.
- Revision Graph adds user-selectable layout strategies. Automatic mode explains which adaptive
  profile it selected without changing the existing default behavior.
- Find moves into a compact floating panel available from the toolbar or `Ctrl+F`/`Cmd+F`, leaving
  more horizontal space for graph controls while preserving active results.
- Show Log commit markers now distinguish outgoing, regular, and merge commits more consistently,
  with centered and symmetric hover states.

### Implementation And Verification Record

- The final review against baseline `2c8eab8fa266832d57257205e93771de69058a57` found no functional
  or release-blocking source issues. The worktree and whitespace validation were clean.
- `npm test` passed all `835` tests. `npm run build` and `npm run quality:check` passed; the quality
  gate covered 252 production files and 2,406 functions.
- `npm run benchmark:ci` passed with the deterministic 1,200-commit fixture: 192 projected nodes,
  `121.33 ms` initial layout, `3.39 ms` cache hit, and `24.09 ms` descendant-focus layout in the
  recorded environment.
- `graphify update .` refreshed the architectural graph after the final source changes.
- The final Extension Development Host smoke was confirmed complete by the maintainer on
  2026-08-15. Platform, VS Code version, fixture, and granular scenario evidence were not supplied
  and are not inferred.
- Marketplace publication was confirmed complete by the maintainer on 2026-08-15. Exact
  publication timestamp, VSIX identity and inspection, clean-profile installation, source tag, and
  installed-version evidence were not supplied and are not inferred.
- No runtime dependency, VS Code engine, activation, or package version changed as part of final
  documentation preparation.

### Rollback Notes

- Before publication, revert each focused 1.6.7 slice with its tests and documentation. The Flow
  Governance rollback must not delete repository-owned configuration files created by users.
- After publication, correct behavior through a later patch or an explicitly approved Marketplace
  action; never reuse the published `1.6.7` version.

## Published Release: 1.6.6

Status: Published by maintainer confirmation; post-publication evidence reconciliation pending
Opened: 2026-08-10
Published: 2026-08-10 (maintainer confirmation)
Published baseline version: `1.6.4`
Target version: `1.6.6`

### Release Gate Summary

| Gate | Status | Evidence / next action |
| --- | --- | --- |
| Published baseline | Complete | `1.6.4` was published by maintainer confirmation on 2026-08-08. |
| Release scope | Implemented | #12 refines Azure DevOps browser handoff; #13 removes the redundant Compare Results Actions column; #14 centralizes tooltip/submenu hover scheduling. |
| Package metadata | Complete | `package.json` and root `package-lock.json` declare `1.6.6`. |
| Automated verification | Local gates passed; final release run pending | #12 and #13 passed quality, full tests, graph refresh, and whitespace validation. #14 passed quality; run one consolidated full test and graph refresh before packaging. |
| Extension Development Host smoke | Pending | Validate Azure DevOps title/description copy, Compare Results context-menu actions, and tooltip/submenu hover transitions. |
| VSIX package inspection | Evidence not recorded | VSIX filename, checksum, size, embedded-version inspection, and clean-profile installation evidence were not supplied. |
| Marketplace publication | Complete by maintainer confirmation | Publication was reported complete on 2026-08-10; exact timestamp and installed-version evidence were not supplied. |
| Rollback readiness | Documented | Before publication, revert scoped source and metadata changes; after publication, correct through a later patch or maintainer-approved Marketplace action. |

Opening record:

- Version metadata was aligned to `1.6.6` on 2026-08-10.
- The focused feature artifacts are `project-context/2.build/features/1.6.6-azure-devops-pr-handoff.md`, `project-context/2.build/features/1.6.6-compare-results-actions-column.md`, and `project-context/2.build/features/1.6.6-hover-intent-policy.md`.
- Marketplace publication was confirmed by the maintainer on 2026-08-10. Exact tag, VSIX, checksum, installation, and timestamp evidence remain unrecorded.

Implementation record:

- #12 keeps remote eligibility checks before presenting Pull Request context, removes repeated
  remote validation during browser handoff, and makes Azure DevOps title/description transfer
  explicit through copy actions. Build, quality, full tests, graph refresh, and whitespace
  validation passed; Extension Development Host smoke remains pending.
- #13 removes the Compare Results Actions column and its per-row overflow button. The existing
  mouse and keyboard context menu remains the single action surface. Quality, full tests, graph
  refresh, and whitespace validation passed; manual layout/accessibility smoke remains pending.
- #14 extracts shared delayed-action scheduling for reference tooltips and Flow Governance
  submenus while preserving their established delay values and focus cancellation behavior.
  Quality passed; final full-test and graph-refresh evidence is pending.

- #4 now normalizes documented GitLab.com SSH host aliases to canonical GitLab.com commit and
  Merge Request URLs. HTTPS remains restricted to the literal hosted domain; GitLab Self-Managed
  and arbitrary SSH hosts remain unsupported. Local quality, full test, focused URL, graph-update,
  and whitespace gates passed; manual Extension Development Host validation remains pending.
- #5 now derives GovCloud CodeCommit browser URLs through the documented regional
  `console.amazonaws-us-gov.com` hosts, including FIPS HTTPS remotes. Commercial and China
  partition behavior is unchanged. Local quality, full test, focused URL, graph-update, and
  whitespace gates passed; manual Extension Development Host validation remains pending.
- #6 now detects documented `codecommit://` helper remotes and explains that their URL has no AWS
  Region, so a regional HTTPS or SSH remote is required for browser links. It does not read AWS
  credentials or profiles, infer a region, or add settings/dependencies. Build, quality, and full
  test gates passed; graph refresh and final whitespace verification are pending.
- #7 allows `Flow Governance > Start New Package` from a classified release. The existing
  exact-sync preflight, configured naming, collision protection, guarded mutation, optional
  publication, refresh, and persisted source target are reused. Build, quality, full tests,
  focused Flow Governance coverage, graph refresh, and whitespace verification passed; manual
  Extension Development Host validation remains pending.
- #8 allows `Flow Governance > Start New Task` from a classified release while retaining the
  existing synchronization, naming, collision, mutation, publication, refresh, and source-target
  guards. Build, quality, full tests, focused Flow Governance coverage, graph refresh, and
  whitespace verification passed; manual Extension Development Host validation remains pending.
- #9 completes Pull Request handoff for release-origin package and task branches. Their persisted
  release is now a governed target, and package promotions require the same remote target
  synchronization as other guarded non-production promotions. Build, quality, full tests, focused
  flow coverage, and whitespace verification passed; the issue is closed.
- #10 makes Pull Request handoff destination-neutral and provider-aware. The dialog identifies
  prefilled versus manual provider paths, shows target readiness, copies source/target references
  for manual paths, and prevents duplicate opens. Build, quality, full tests, and whitespace
  verification passed; manual Extension Development Host smoke remains pending.

## Published Release: 1.6.4

Status: Published by maintainer confirmation; post-publication evidence reconciliation pending
Opened: 2026-08-06
Published: 2026-08-08 (maintainer confirmation)
Source baseline version: `1.6.3`
Target version: `1.6.4`

### Release Gate Summary

| Gate                             | Status     | Evidence / next action |
| -------------------------------- | ---------- | ---------------------- |
| Source baseline                  | Complete   | Repository tag `1.6.3` resolves to `c620e35`. Marketplace publication is not inferred from the source tag. |
| Release scope                    | Complete   | The release includes staged revision-graph loading performance work in `project-context/2.build/features/1.6.4-revision-graph-load-performance.md`, the Azure DevOps Services portal handoff correction in `project-context/2.build/features/1.6.4-azure-devops-pr-handoff.md`, and the CI reliability correction in `project-context/2.build/features/1.6.4-ci-verification-reliability.md`. Further changes require a new release version. |
| Package metadata                 | Complete   | `package.json` and the root `package-lock.json` declare `1.6.4`. |
| Automated verification           | Local gates passed; hosted rerun evidence not recorded | Item 1 passed `npm run quality:check` (261 files, 2,531 functions), `npm test` (860 tests), `npm run test:platform` (34 tests), `npm run benchmark:ci`, `graphify update .`, and `git diff --check`. Item 2 passed quality (262 files, 2,543 functions), tests (865), platform tests (39), and the CI benchmark. Item 3 passed focused coverage (100 tests), quality (263 files, 2,547 functions), tests (866), and the CI benchmark; its synthetic 1,200-node serialization probe reduced the status message from 548,373 to 294 bytes. Item 4 passed focused coverage (87 tests), quality (263 files, 2,548 functions), tests (868), and the CI benchmark on 2026-08-06; count-only visibility took 2.10 ms versus 5.31 ms for full projection in that gate. Item 5 passed focused cache coverage (4 tests), quality (263 files, 2,556 functions), tests (870), platform tests (39), and the CI benchmark; its maximum persisted-cache probe reduced average cache-hit duration from 12.29 ms to 9.36 ms. The Azure correction passed a focused URL/browser-failure regression, quality (263 files, 2,558 functions), `npm test` (871 tests), `graphify update .`, and `git diff --check` on 2026-08-08. The CI correction passed its focused warning contracts twenty consecutive times, both audits with zero findings, quality (263 files, 2,558 functions), unit tests, platform tests, the CI benchmark, graph update, and whitespace check on 2026-08-08. A hosted rerun for the correction was not supplied before publication confirmation. |
| Dependency maintenance           | Complete   | `d3-dag` `1.2.2` passed quality (263 files, 2,556 functions), `npm test` (870 tests), platform tests (39), the CI benchmark (`107.66 ms` initial layout, `2.13 ms` cache hit, `18.17 ms` descendant-focus layout), and `npm audit --omit=dev` (0 production vulnerabilities). Existing operators, profiles, worker bootstrap, and layout cache identity are unchanged. |
| Extension Development Host smoke | Evidence not recorded | Operator, VS Code version, platform, fixture details, and final result were not supplied and are not inferred. |
| VSIX package inspection          | Evidence not recorded | VSIX filename, SHA-256 checksum, size, embedded version, runtime-asset inspection, and clean-profile installation result were not supplied. |
| Marketplace publication          | Complete by maintainer confirmation | Publication was reported complete on 2026-08-08. The exact Marketplace timestamp and installed-version evidence were not supplied. |
| Rollback readiness               | Documented | Never reuse `1.6.4`; correct published behavior through a new patch or a maintainer-approved Marketplace action. |

Opening record:

- Version metadata was aligned to `1.6.4` on 2026-08-06.
- The cycle starts from repository tag `1.6.3` at `c620e35`; no unrecorded VSIX or Marketplace
  evidence is assumed.
- The initial feature artifact defines an evidence-first sequence for Git enrichment, layout-worker
  startup, projection and copy costs, status-only updates, and duplicate webview work.
- No runtime implementation, dependency change, VSIX package, publication command, or Marketplace
  action occurred while opening the cycle.

Implementation record:

- Flow Governance task, bug, and hotfix forms now reject Git-invalid Short name values before
  submitting branch creation. The extension-host configured-pattern and Git branch validation remain
  the final safety boundary; no webview protocol or Git mutation behavior changed.
- Ready-state merge analysis, Flow Governance state, and branch-description metadata now load
  concurrently behind one cancelable join before state delivery.
- Disabled or invalid Flow Governance no longer invokes branch-target or Pull Request readiness Git
  metadata, while repository-configured disabled state retains its classified references for
  reactivation.
- Trace output now reports `state.flowGovernance` independently alongside merge-blocked target and
  branch-description durations. No webview protocol or graph/layout output changed.
- Sequential layout cache misses now reuse at most one healthy idle worker through an explicit
  request-ID protocol. Concurrent calculations still use separate workers; abort, timeout, fatal
  failure, and disposal terminate affected workers. A direct two-node startup probe changed from a
  `49.55 ms` one-shot average to `55.54 ms` cold and `0.86 ms` warm average in this environment.
- Repository status-only events now send a typed delta bound to the active repository path and
  scene layout key. The webview updates HEAD/worktree/conflict state and toolbar chrome without
  rebuilding graph DOM, topology, virtual indexes, minimap, search, selection, or viewport state.
  A synthetic 1,200-node serialization probe reduced the message from `548,373` to `294` bytes
  (`99.95%`); deterministic tests cover malformed and stale deltas plus the no-render boundary.
- Adaptive snapshot limits now count visible major-operation nodes through the projection's shared
  selection rules without constructing projected node payloads, compressed edges, or hidden-path
  routes. The benchmark asserts exact count equivalence and reports the count phase independently;
  the CI gate measured `2.10 ms` count-only versus `5.31 ms` full projection for `192` nodes.
- Layout cache misses now publish one canonical result through runtime read-only maps and frozen
  positions, routes, arrays, and points. Later hits reuse the same protected snapshot; persisted
  input is defensively copied once during restore. A 2,500-position/5,000-route probe reduced the
  post-warm-up hit average from `12.29 ms` to `9.36 ms` (`23.8%`), while the CI benchmark recorded
  `2.15 ms` for its 192-node/195-edge cache hit and verifies exact result counts.
- The existing `d3-dag` runtime dependency was updated from `1.2.1` to `1.2.2` with maintainer
  approval. Current Sugiyama operators, adaptive profiles, worker bootstrap, and layout cache
  identity remain unchanged; layout-quality experimentation is explicitly deferred.
- Azure DevOps Services Pull Request portal links now send encoded short source and target branch
  names instead of Azure DevOps REST `refs/heads/*` values. Flow Governance retains all existing
  target, source-publication, remote-identity, and no-force-push guards. If VS Code returns `false`
  from `vscode.env.openExternal`, the user receives a concise retry/manual-navigation message.
- Shared modal-warning contract tests now wait for the warning request itself instead of assuming
  that one event-loop turn reaches the asynchronous Flow configuration lookup. The development-only
  transitive `js-yaml` lockfile entry is `4.3.1`, resolving the CI audit finding; production
  dependencies and extension runtime behavior are unchanged.

Focused build artifacts:

- `project-context/2.build/features/1.6.4-azure-devops-pr-handoff.md`
- `project-context/2.build/features/1.6.4-ci-verification-reliability.md`
- `project-context/2.build/features/1.6.4-revision-graph-load-performance.md`

Publication closure:

- The maintainer reported Marketplace publication of `1.6.4` complete on 2026-08-08. No packaging
  or publication command was run by Codex for this reconciliation.
- `CHANGELOG.md` is dated 2026-08-08 and this release record is closed as published.
- Exact Marketplace timestamp, installed-version, tagged-source, VSIX inspection, clean-profile,
  hosted-verification, and final manual-smoke evidence was not supplied and remains intentionally
  unrecorded.
- Future source or Marketplace corrections require a new version; never reuse `1.6.4`.

## Tagged Source Release: 1.6.3

Status: Source release tagged; VSIX and Marketplace evidence reconciliation pending
Opened: 2026-08-01
Tagged: 2026-08-01 (`1.6.3` at `c620e35`)
Published baseline version: `1.6.2`
Target version: `1.6.3`

### Release Gate Summary

| Gate                             | Status                      | Evidence / next action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Published baseline               | Complete                    | `1.6.2` was published by maintainer confirmation on 2026-08-01.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Release scope                    | Complete for current demand | `Start New Package` is available only from a classified `feature`, requires exact source synchronization, and retains that exact feature for one `package -> feature` Pull Request. `Focus Descendants` now bounds projected-edge traversal to the descendant scope and memoizes shared ancestry. Virtual viewport frames no longer rebuild graph-wide topology, regenerate full minimap content, or reapply search highlights. The first ready scene collects rendered-element caches only in its virtual commit, and long edges are stored once in a balanced interval index rather than every crossed vertical bucket. Revision Graph reference and Show Log commit tooltips now use a 500 ms custom activation standard and are cancelled before context menus open. Every extension-authored Flow Governance and Compare Results AI prompt now requests simple, cohesive, and logically organized text. Show Log single-commit context menus now support guarded creation and checkout of an editable, suggested local branch from the exact hash, plus validated local tag creation, and refresh the affected commit references after either mutation. Expanded commit file rows use fixed continuation sizing so intrinsic SVG height cannot create blank space proportional to the artifact count. Target histories now start with `Show All Branches` enabled while retaining the existing toggle.                                                                                                                                                                                                                  |
| Package metadata                 | Complete                    | Release metadata declared `1.6.3` before the source tag; the current workspace now opens `1.6.4`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Automated verification           | Complete                    | On 2026-08-01, `npm run quality:check` (260 files, 2,524 functions), `npm run build`, `npm test` (858 tests), the focused Show Log commit-action and orchestration suites (146 tests), the focused AI prompt suites (12 tests), the focused Revision Graph and Show Log webview suites (87 tests), `npm run benchmark:ci`, the retained same-cycle `npm run benchmark:rc`, `graphify update .`, and `git diff --check` passed. Show Log regressions verify menu visibility and messages, bounded validation and dispatch, exact loaded-commit resolution, stale-target rejection, unavailable services, same-repository mutation exclusion, editable suggested branch naming, branch creation and checkout at the selected commit, immediate commit-reference reload after branch and tag creation, and an enabled all-branches state on the initial target load. AI prompt regressions verify simplicity, cohesion, and organization guidance across every branch form, Pull Request title, all Pull Request description families, and AI Briefing. Tooltip regressions verify the explicit 500 ms delay, pointer and focus scheduling, pending-show cancellation, and context-menu dismissal. Virtual-scene regressions verify that viewport frames cannot rebuild graph-wide topology, regenerate full minimap content, apply search highlights twice, repeat the first-ready rendered-element cache refresh, or replicate a long edge by its vertical span. In the deterministic 12,000-commit RC fixture, non-root descendant-focus projection completed in 49.89 ms and layout in 195.13 ms. The unchanged platform subset retains the 34-test `1.6.2` baseline recorded on 2026-07-30. A local `npm run test:e2e` attempt rebuilt successfully but could not launch VS Code `1.131.0` because the environment has no X server or `DISPLAY`, so no E2E assertion ran. |
| Extension Development Host smoke | Complete by maintainer confirmation | Passed on 2026-08-01 for the applicable `1.6.3` Flow Governance, Revision Graph performance, tooltip, AI Assistance, and Show Log scenarios. Operator name, VS Code version, platform, and fixture details were not supplied and are not inferred; see `extension-host-smoke-matrix.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| VSIX package inspection          | Evidence not recorded       | VSIX filename, checksum, size, embedded version, runtime-asset inspection, and clean-profile installation evidence were not supplied.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Marketplace publication          | Evidence not recorded       | A repository source tag exists, but Marketplace publication evidence was not supplied and is not inferred.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Rollback readiness               | Documented                  | Never reuse `1.6.3`; restore behavior through `1.6.4` or a later patch, or take a Marketplace action according to maintainer decision.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

Opening record:

- Version metadata was aligned to `1.6.3` on 2026-08-01.
- No dependency change, VSIX package, publication command, or Marketplace action occurred while
  opening the cycle.
- Flow Governance now exposes `Start New Package` only on classified feature branches. Package
  preflight requires an exactly synchronized feature; creation persists that feature as the package
  promotion target; and the mapped package exposes one guarded `package -> feature` Pull Request
  handoff. No package-description AI surface, command, setting, dependency, VSIX, or Marketplace
  action was added.
- Revision-graph projection now stops hidden-parent traversal at the selected descendant scope and
  resolves shared hidden ancestry once per projection. The deterministic benchmark includes a
  non-root descendant-focus scenario with merge commits hidden, matching the reported performance
  failure mode. No Git-loading, layout-worker, protocol, contribution-point, dependency, or
  Marketplace surface changed.
- The webview now separates graph-wide topology from rendered-element caches. A new state builds
  edge lookup, parent/child adjacency, and HEAD-distance maps once; virtual scrolling and zooming
  update only the rendered-element portion of that cache. The initial ready render also no longer
  repeats the post-commit DOM cache scan. Existing selection, search, relationship highlighting,
  minimap, edge routing, and node-offset behavior remain intact.
- Virtual viewport commits now synchronize rendered selection, relationship, and search highlights
  once while explicitly skipping full minimap regeneration. Scroll events retain the lightweight
  minimap viewport update, while selection, ready-state, and geometry-changing paths retain their
  existing full synchronization behavior.
- The first ready-scene render now has integrated lifecycle coverage proving that the outer scene
  performs no rendered-element cache scan and the virtual post-commit performs exactly one. The
  non-ready clear path retains its required cache refresh.
- Virtual node and edge candidates now use centered interval trees. Each valid entry is assigned to
  one tree node regardless of vertical span; queries prune by top or bottom ordering, preserve input
  order, and retain the final viewport visibility checks. The obsolete bucket-size constant and
  per-intermediate-bucket edge replication were removed.
- Extension-controlled Revision Graph reference and Show Log commit tooltips now share an explicit
  500 ms activation standard. Pending activation is cancelled on exit and before context menus open;
  native HTML `title` tooltip timing remains controlled by Chromium.
- Flow Governance branch and Pull Request prompts and the Compare Results AI Briefing now share
  explicit writing guidance for simple language, cohesive ideas, consistent terminology, and logical
  organization. Existing factual, untrusted-context, evidence, output-format, and Git-safety
  instructions remain unchanged.
- Show Log single-commit context menus now expose `Checkout to this` and `Create Tag`. The host
  resolves only loaded commit hashes, suggests an editable local branch name for checkout, reuses
  existing branch and tag validation, and serializes both operations through the repository mutation
  coordinator. Checkout creates the local branch at the exact commit instead of entering detached
  HEAD; tag creation remains local until explicitly pushed. After either successful mutation, the
  current Show Log source is reloaded with stale-result protection so the new reference is displayed
  without reopening the panel.
- Show Log expanded commits now assign definite 24 px file continuation rows, with explicit search
  and status heights. Percentage-height SVGs no longer contribute their intrinsic height once per
  artifact, so the next commit follows the file list without a proportional blank area.
- Show Log target histories now initialize `Show All Branches` as enabled. The existing toggle,
  request cancellation, filtering, paging, and refresh paths continue to use the current state.

Focused build artifacts:

- `project-context/2.build/features/1.6.3-show-log-all-branches-default.md`
- `project-context/2.build/features/1.6.3-show-log-expanded-file-spacing.md`
- `project-context/2.build/features/1.6.3-show-log-commit-checkout-tag.md`
- `project-context/2.build/features/1.6.3-ai-prompt-writing-quality.md`
- `project-context/2.build/features/1.6.3-package-start-from-feature.md`
- `project-context/2.build/features/1.6.3-focus-descendants-performance.md`
- `project-context/2.build/features/1.6.3-virtual-scene-topology-cache.md`
- `project-context/2.build/features/1.6.3-virtual-scene-minimap-refresh.md`
- `project-context/2.build/features/1.6.3-initial-scene-cache-refresh.md`
- `project-context/2.build/features/1.6.3-virtual-interval-index.md`
- `project-context/2.build/features/1.6.3-tooltip-delay.md`

## Published Release: 1.6.2

Status: Published by maintainer confirmation; post-publication evidence reconciliation pending
Opened: 2026-07-30
Published: 2026-08-01 (maintainer confirmation)
Published baseline version: `1.6.1`
Target version: `1.6.2`

### Release Gate Summary

| Gate                                   | Status                              | Evidence / next action                                                                                                                                                                                       |
| -------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Published baseline                     | Complete                            | `1.6.1` was published by maintainer confirmation on 2026-07-29.                                                                                                                                              |
| Release scope                          | Complete                            | `Start New Feature` is available from a classified `release`. Ordered ASCII case pairs define canonical governed creation for the five startable Flow branch kinds, with case-only collision protection.     |
| Package metadata                       | Complete                            | Release metadata declared `1.6.2` before closure; the current workspace now opens `1.6.3`.                                                                                                                   |
| Automated verification                 | Complete                            | On 2026-07-30, `npm run quality:check` (257 files, 2,479 functions), `npm test`, 10 focused canonical-pattern tests, `npm run test:platform` (34 tests), `graphify update .`, and `git diff --check` passed. |
| Final Extension Development Host smoke | Evidence not recorded               | Operator, VS Code version, platform, fixture details, and final result were not supplied and are not inferred.                                                                                               |
| VSIX package inspection                | Evidence not recorded               | VSIX filename, SHA-256 checksum, size, embedded version, runtime-asset inspection, and clean-profile installation result were not supplied.                                                                  |
| Marketplace publication                | Complete by maintainer confirmation | Publication was reported complete on 2026-08-01. The exact Marketplace timestamp and installed-version evidence were not supplied.                                                                           |
| Rollback readiness                     | Documented                          | Never reuse `1.6.2`; restore behavior through a new patch or take a Marketplace action according to maintainer decision.                                                                                     |

Focused build artifacts:

- `project-context/2.build/features/1.6.2-feature-start-from-release.md`
- `project-context/2.build/features/1.6.2-flow-pattern-canonicalization.md`

Publication closure:

- The maintainer reported Marketplace publication of `1.6.2` complete on 2026-08-01. No packaging
  or publication command was run by Codex for this reconciliation.
- The changelog is dated 2026-08-01 and this release record is closed as published.
- Exact publication, package-inspection, installed-version, and final manual-smoke evidence was not
  supplied and remains intentionally unrecorded.
- Future source or Marketplace corrections require a new version; never reuse `1.6.2`.

## Published Release: Reliability and Security Hardening 1.6.1

Status: Published by maintainer confirmation; post-publication evidence reconciliation pending
Opened: 2026-07-28
Published: 2026-07-29 (maintainer confirmation)
Published baseline version: `1.6.0`
Target version: `1.6.1`

### Release Gate Summary

| Gate                                   | Status                              | Evidence / next action                                                                                                                                                                                                                                                                                               |
| -------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Published baseline                     | Complete                            | `1.6.0` was published on 2026-07-27 by maintainer confirmation.                                                                                                                                                                                                                                                      |
| Patch scope                            | Complete                            | All six system-review corrections and the approved AI UX follow-ups are implemented. Any additional work belongs to a new release cycle.                                                                                                                                                                             |
| Package metadata                       | Complete                            | `package.json` and the root `package-lock.json` both declare the published `1.6.1` version.                                                                                                                                                                                                                          |
| Current automated source verification  | Complete                            | The source implementation at commit `5bf38f0` passed `npm run quality:check` (255 production files and 2,462 functions), `npm run build`, `npm test` (830 tests), and `git diff --check` on 2026-07-28. The process/filesystem subset also retains the same-cycle passing `npm run test:platform` result (34 tests). |
| Hosted macOS platform confirmation     | Evidence not recorded               | The permission-safe Unix process-group regression is present in the existing `macos-latest` verification row, while the focused suite, full suite, and platform subset passed on Linux. A passing hosted result was not supplied before the confirmed publication.                                                   |
| Automated Extension Host baseline      | Evidence not recorded               | The `1.6.1` delta does not change activation, real `vscode.git` discovery, or graph-panel launch, but a current-candidate E2E result was not supplied before the confirmed publication.                                                                                                                              |
| Final Extension Development Host smoke | Complete by maintainer confirmation | The maintainer confirmed the applicable final `1.6.1` smoke passed on 2026-07-29. Operator name, VS Code version, platform, and fixture details were not supplied and are not inferred; see `extension-host-smoke-matrix.md`.                                                                                        |
| VSIX package inspection                | Evidence not recorded               | VSIX filename, SHA-256 checksum, size, embedded version, runtime-asset inspection, and clean-profile installation result were not supplied.                                                                                                                                                                          |
| Marketplace publication                | Complete by maintainer confirmation | Publication was reported complete on 2026-07-29. The exact Marketplace timestamp and installed-version evidence were not supplied.                                                                                                                                                                                   |
| Rollback readiness                     | Documented                          | Never reuse `1.6.1`; restore the last known-good behavior through a new patch or take a Marketplace action according to maintainer decision.                                                                                                                                                                         |

Focused build artifact:

- `project-context/2.build/features/1.6.1-reliability-security-hardening.md`
- `project-context/2.build/features/1.6.1-ai-request-cancellation.md`
- `project-context/2.build/features/1.6.1-branch-ai-descriptions.md`

Release scope:

- Complete: bound repository Flow Governance configuration input and regex evaluation so malformed
  or adversarial repository content cannot stall the extension host.
- Complete: close repository-config persistence races so path validation remains true at the write
  boundary.
- Complete: prevent stale Compare Results work from replacing a newer comparison or crossing repository
  ownership boundaries.
- Complete: bound and aggregate worktree unified-diff processing for large untracked-file sets.
- Complete: make Show Log search limits explicit so valid older matches are not silently presented
  as absent.
- Complete: escalate timed-out Git process termination when graceful Unix process-group termination
  does not complete.

Release constraints:

- Preserve the current extension architecture, built-in `vscode.git` integration, multi-repository
  isolation, and targeted Git CLI model.
- Add no runtime dependency, public command, setting, menu, or contribution point unless separately
  approved.
- Treat fixes as incomplete until focused regression coverage and the required release gates pass.
- Packaging and Marketplace actions require explicit maintainer approval; future actions must use a
  new version rather than reusing `1.6.1`.

Planned verification:

- `npm run build`
- `npm test`
- `npm run test:platform` when a correction touches platform-specific Git process behavior
- `npm run test:e2e` when a correction changes extension-host orchestration or webview ownership
- Focused hostile-config, filesystem-race, stale-result, large-worktree, truncated-search, and
  timeout-termination regression tests
- Relevant manual rows from `project-context/3.deliver/extension-host-smoke-matrix.md`
- `git diff --check`

Opening record:

- Version metadata was aligned to `1.6.1` on 2026-07-28.
- The initial correction scope and release gates were recorded.
- `npm run build`, `npm test` (796 tests), the package/lockfile version consistency check, and
  `git diff --check` passed on 2026-07-28.
- No source correction, dependency change, VSIX package, version publication, or Marketplace action
  occurred while opening the cycle.

Publication closure:

- The maintainer reported Marketplace publication of `1.6.1` complete on 2026-07-29. No packaging
  or publication command was run by Codex.
- The changelog is dated 2026-07-29 and this release record is closed as published.
- The exact Marketplace timestamp, installed-version evidence, VSIX filename, SHA-256 checksum,
  size, embedded-version inspection, runtime-asset inspection, clean-profile installation result,
  hosted `macos-latest` result, and current-candidate Extension Host E2E result were not supplied and
  are intentionally left unrecorded.
- Future source or Marketplace corrections require a new version; never reuse `1.6.1`.

Implementation record:

- Flow Governance config and regex hardening completed automated verification on 2026-07-28.
  Repository files are capped at 64 KiB and JSON depth 32 before parsing; top-level fields,
  `mainBranches`, config paths, and pattern lengths are bounded during normalization.
- A shared dependency-free regex compiler now rejects backreferences, excessive or oversized
  repetitions, adjacent potentially overlapping repetitions, and nested or ambiguous repeated
  groups before classification or governed branch naming. Default and safe custom patterns remain
  supported.
- `npm run quality:check`, `npm run build`, `npm test` (803 tests), and `npm run test:platform`
  (31 tests) passed. Relevant manual Extension Development Host Flow Governance validation was
  accepted as passed by maintainer confirmation on 2026-07-29.
- Flow Governance option updates now open without truncation, compare exact device/inode identity,
  reject hard-linked writable configs, revalidate the repository path, and read/write through the
  same descriptor. Unix also uses `O_NOFOLLOW`; Windows relies on the shared identity and path
  checks because that flag is unsupported there.
- Deterministic regressions cover replacement by a regular file, replacement during the
  descriptor-bound write, a pre-open symlink, a symlinked ancestor, and a hard link. Replacement and
  external targets remain unchanged, and a moved target is not reported as a successful update.
- After item 2, `npm run quality:check` passed for 253 production files and 2,430 functions;
  `npm run build` passed; `npm test` passed with 808 tests; and `npm run test:platform` passed with
  31 tests. Manual Extension Development Host config-persistence smoke was accepted as passed by
  maintainer confirmation on 2026-07-29.
- Compare Results now assigns a monotonic, repository-bound request lease before each asynchronous
  diff from ref actions or Show Log. Only the latest lease may publish results, hide loading, or
  surface empty-result and failure messages; repository and panel closure invalidate outstanding
  ownership.
- Deterministic regressions cover same-repository out-of-order completion, cross-repository stale
  failures, stale empty-result cleanup, repository closure, and a Show Log request superseded before
  completion. Existing worktree refresh state-identity guards remain in place.
- After item 3, `npm run quality:check` passed for 254 production files and 2,437 functions;
  `npm run build` passed; and `npm test` passed all 813 tests. The platform harness was not rerun
  because no filesystem, process, worker, or platform-specific contract changed. Manual rapid-switch
  Extension Development Host smoke was accepted as passed by maintainer confirmation on 2026-07-29.
- `graphify update .` rebuilt the item 3 code graph with 5,002 nodes, 9,871 edges, and 388
  communities.
- Untracked worktree patches now use a private alternate Git index: current Git prepares every
  NUL-delimited literal pathspec in one operation and emits one aggregate diff instead of one process
  per file. Git without `add --pathspec-from-file` support falls back after exit code 129 to bounded
  batches of at most 128 paths and 16 KiB.
- The aggregate path accepts at most 4,096 normalized unique paths and 2 MiB of path data, retains
  the 15-second command timeout, caps setup output at 256 KiB, and shares the existing 32 MiB final
  diff budget with tracked changes. Temporary files are removed after completion, cancellation, and
  failure; the real repository index remains unchanged.
- Item 4 regressions cover a 1,000-path aggregate, older-Git fallback, input/output ceilings,
  cancellation cleanup, stale paths, spaces, Unicode, leading dashes, binary content, and real-index
  isolation. `npm run quality:check` passed for 255 production files and 2,443 functions;
  `npm run build` passed; `npm test` passed all 821 tests; and `npm run test:platform` passed all
  33 tests. Manual Extension Development Host large-worktree smoke was accepted as passed by
  maintainer confirmation on 2026-07-29.
- `graphify update .` rebuilt the item 4 code graph with 5,011 nodes, 9,901 edges, and 376
  communities.
- Filtered Show Log searches now request one sentinel commit at the final 2,000-commit scan batch.
  Histories beyond the ceiling produce explicit partial-result or scoped-empty-result copy; exactly
  2,000 commits remain correctly identified as a complete search.
- Item 5 regressions cover the 2,001st-position match, the exact-boundary case, normal filtered
  paging, presenter propagation, state copy, and webview rendering. `npm run quality:check` passed
  for 255 production files and 2,445 functions; `npm run build` passed; `npm test` passed all 825
  tests; and `git diff --check` passed. The platform and E2E harnesses were not rerun because this
  correction changes no platform-specific process/filesystem behavior or activation/real-Git panel
  discovery contract. Manual Show Log smoke was accepted as passed by maintainer confirmation on
  2026-07-29.
- `graphify update .` rebuilt the item 5 code graph with 5,017 nodes, 9,913 edges, and 386
  communities.
- Unix Git termination now snapshots the spawned child PID/PGID, sends group `SIGTERM`, and escalates
  to group `SIGKILL` after 250 ms only while the original leader remains active. Leader exit cancels
  escalation, failed group signaling never re-resolves a PID, and Windows retains `taskkill /T /F`.
- Item 6 focused coverage uses a timed-out leader and descendant that both ignore `SIGTERM`, then
  verifies bounded rejection and both processes' cleanup through delayed survival markers. This
  avoids permission-sensitive negative-PGID signal-0 probes that can return `EPERM` on hosted macOS
  runners without weakening the assertion: a surviving process writes its marker and fails the
  test. The verification matrix already includes `macos-latest`. `npm run quality:check`
  passed for 255 production files and 2,452 functions; `npm run build` passed; `npm test` passed all
  826 tests; `npm run test:platform` passed all 34 tests; and `git diff --check` passed. E2E was not
  rerun because activation, real `vscode.git` discovery, and graph-panel launch are unchanged.
- The 2026-07-28 macOS portability follow-up passed the freshly compiled focused Git execution suite
  (15 tests), `npm run quality:check` (255 files and 2,452 functions), `npm test` (826 tests),
  `npm run test:platform` (34 tests), and `git diff --check` on Linux. Hosted macOS confirmation is
  pending the next run of the existing `macos-latest` verification row; no workflow change was
  necessary.
- `graphify update .` rebuilt the portability-corrected test graph with 5,024 nodes, 9,925 edges,
  and 381 communities.
- Compare Results now renders its compact AI action with the same borderless `textLink` color,
  translucent hover/focus treatment, active foreground, and disabled opacity as the Flow Governance
  form AI actions. Toolbar sizing and AI briefing behavior are unchanged. The 3 focused webview
  tests, `npm run quality:check` (255 production files and 2,452 functions), `npm run build`, all
  826 tests, and `git diff --check` passed; `graphify update .` rebuilt 5,024 nodes, 9,925 edges,
  and 381 communities. Updated Extension Development Host visual confirmation was accepted as
  passed by maintainer confirmation on 2026-07-29.
- In-flight AI actions in Compare Results and Flow Governance now remain clickable and replace the
  sparkle with an accessible stop icon. Compare Results adds a validated payload-free cancellation
  intent and restores a prior ready briefing after cancelled regeneration; Flow reuses its existing
  request-ID/surface/field cancellation boundary. Both surfaces invalidate ownership immediately and
  ignore late provider output. The 118 focused tests, `npm run quality:check` (255 production files
  and 2,457 functions), `npm run build`, all 828 tests, and `git diff --check` passed. Manual
  Extension Development Host cancellation timing and visual/keyboard confirmation was accepted as
  passed by maintainer confirmation on 2026-07-29. `graphify update .` rebuilt 5,036 nodes, 9,941
  edges, and 392 communities.
- Compare Results now reflects the `hidden` attribute directly on its sparkle and stop SVG elements.
  This fixes the runtime-only case where `.hidden` changed a JavaScript property without changing
  SVG visibility, even though briefing cancellation was already wired correctly. The 37 focused
  tests, `npm run quality:check` (255 production files and 2,462 functions), `npm run build`, all
  830 tests, and `git diff --check` passed. `graphify update .` rebuilt 5,053 nodes, 9,967 edges,
  and 380 communities. Manual Extension Development Host visual/cancellation smoke was accepted as
  passed by maintainer confirmation on 2026-07-29.
- Feature, Task, Bug, and Hot Fix branch forms now enable their description AI action after their
  required name fields and description are complete. The webview sends a bounded generic
  branch-text intent, the host authorizes its `release | feature | task | bug | hotfix` kind against
  the existing governed start-source policy, and prompt construction applies type-specific guidance
  without inventing form facts. The 134 focused tests, `npm run quality:check` (255 production files
  and 2,462 functions), `npm run build`, all 830 tests, and `git diff --check` passed.
  `graphify update .` rebuilt 5,053 nodes, 9,967 edges, and 379
  communities. Manual Extension Development Host visual/interaction smoke was accepted as passed
  by maintainer confirmation on 2026-07-29; full evidence is recorded in
  `project-context/2.build/features/1.6.1-branch-ai-descriptions.md`.
- The maintainer confirmed the applicable final `1.6.1` Extension Development Host smoke passed on
  2026-07-29. Operator name, VS Code version, platform, and fixture details were not supplied and
  are intentionally left unrecorded.
- `graphify update .` rebuilt the item 6 code graph with 5,025 nodes, 9,926 edges, and 385
  communities.
- No dependency or contribution point changed in `1.6.1`. Marketplace publication was confirmed by
  the maintainer on 2026-07-29; package and installed-version evidence were not supplied.

Rollback:

- Never reuse the published `1.6.1` version.
- For a source correction, restore the last known-good behavior and prepare a new patch version.
- Marketplace rollback remains a maintainer decision: publish a corrective patch or take the
  appropriate Marketplace action.
- Repository Flow Governance configuration is user-owned and must not be deleted during rollback.

## Published Release: Flow Governance 1.6.0

Status: Published by maintainer confirmation; post-publication evidence reconciliation pending
Opened: 2026-07-01
Published: 2026-07-27 (maintainer confirmation)
Published baseline version: `1.5.9`
Target version: `1.6.0`

### Release Gate Summary

| Gate                                   | Status                              | Evidence / next action                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Published baseline                     | Complete                            | `1.5.9` was published on 2026-07-09 by maintainer confirmation.                                                                                                                                                                                                                                                                                                                                              |
| Baseline integration                   | Complete                            | The published `1.5.9` changes were integrated into the `1.6.0` candidate and verified with build, 590 tests, and `git diff --check` on 2026-07-09. This gate is not pending.                                                                                                                                                                                                                                 |
| Current automated source verification  | Complete                            | Latest verification on 2026-07-26 passed `npm run quality:check`, the clean production build, `npm test` (796 tests), and `git diff --check`. The candidate also retains the same-day passing `npm run test:platform` (31 tests), zero-vulnerability runtime/full audits, and real VSCE file-list regression.                                                                                                |
| Automated Extension Host baseline      | Complete                            | `npm run test:e2e` passed locally on 2026-07-26 against VS Code `1.90.0` and stable `1.130.0`. Each version passed activation, real `vscode.git` discovery with zero/one repository, and singleton graph-panel launch in isolated profiles. CI now enforces both entries. Minimum-version execution exposed and verified the compatibility fallback for the newer optional `Repository.onDidCheckout` event. |
| Final Extension Development Host smoke | Evidence not recorded               | The full current-candidate matrix result, including date, operator, VS Code version, platform, and pass/fail evidence, was not supplied before the confirmed publication.                                                                                                                                                                                                                                    |
| VSIX package inspection                | Evidence not recorded               | The VSIX filename, checksum, size, embedded version, and clean-profile installation result were not supplied.                                                                                                                                                                                                                                                                                                |
| Marketplace publication                | Complete by maintainer confirmation | Publication was reported complete on 2026-07-27. Record the exact Marketplace timestamp and installed-version evidence when available.                                                                                                                                                                                                                                                                       |
| Rollback readiness                     | Documented                          | Candidate-specific and standard rollback notes are recorded below; no rollback action is currently required.                                                                                                                                                                                                                                                                                                 |

Focused build artifact:

- `project-context/2.build/features/1.6.0-package-hygiene.md`
- `project-context/2.build/features/1.6.0-ai-compare-briefing.md`
- `project-context/2.build/features/1.6.0-ai-pr-release-assistant.md`
- `project-context/2.build/features/1.6.0-message-boundary-quality-ratchet.md`
- `project-context/2.build/features/1.6.0-flow-dialog-controller-extraction.md`
- `project-context/2.build/features/1.6.0-flow-governance-icon-badges.md`
- `project-context/2.build/features/1.6.0-task-promotion-pr-context.md`
- `project-context/2.build/features/1.6.0-modal-error-and-warning-policy.md`
- `project-context/2.build/features/1.6.0-flow-governance-submenu-hover.md`
- `project-context/2.build/features/1.6.0-feature-pr-target-preflight.md`
- `project-context/2.build/features/1.6.0-remote-fetch-loading-feedback.md`
- `project-context/2.build/features/1.6.0-sync-promotion-pr-context.md`
- `project-context/2.build/features/flow-governance-phase-1.md`
- `project-context/2.build/features/flow-governance-2.0.0.md`
- `project-context/2.build/features/extension-host-e2e-baseline.md`
- `project-context/2.build/features/azure-devops-remote-support.md`
- `project-context/2.build/features/hosted-git-provider-adapters.md`
- `project-context/2.build/features/flow-release-base-synchronization.md`
- `project-context/2.build/features/flow-governance-missing-config-dialog.md`
- `project-context/2.build/features/flow-governance-blocking-message-dialogs.md`
- Manual smoke matrix: `project-context/3.deliver/extension-host-smoke-matrix.md`

Release scope:

- Add optional field-level AI text improvement to Flow Governance PR title/description and new-release
  description forms. Existing deterministic/user-entered content remains the default, requests are
  explicitly initiated, improved PR context is transiently host-owned for provider handoff, and
  documentation/code evidence is exact-path filtered and content-redacted before prompt construction.
- Add an optional, explicitly invoked AI Compare Briefing to completed Compare Results panels. It uses
  an available GitHub Copilot language model through the VS Code Language Model API, sends only bounded
  path-filtered comparison context after excluding known sensitive paths and redacting
  high-confidence secret forms, renders plain text, and cancels stale requests without changing Git
  state.
- Keep Flow Governance Phase 1 as the foundation, not as the final release value.
- Add repository flow-file resolution with VS Code settings fallback and invalid-config diagnostics.
- Classify branch refs into Phase 1 kinds and attach serializable Flow Governance view state.
- Add a Flow Governance webview toggle and branch-kind badges from host-provided metadata.
- Keep all branch refs visible when Flow Governance is enabled; Phase 1 no longer includes
  branch-kind filters, production-trunk highlighting, sync hiding, or unknown-branch visibility
  controls.
- Persist supported Flow Governance webview option changes back to the repository flow file when
  the active source is a valid repository config.
- Add the `Create Flow Governance Config` Command Palette action with repository selection,
  confirmation, repository-relative path validation, existing-file protection, and default
  Phase 1 template content.
- Add PR-required transition diagnostics for governed source/target pairs.
- Add release promotion readiness checks with `ready`, `blocked`, and `inconclusive` outcomes.
- Add PR handoff through reviewable context or recognized GitHub, Azure DevOps, GitLab.com,
  AWS CodeCommit, and Google Secure Source Manager destinations.
- Open commits from Revision Graph and Show Log on supported GitHub, Azure DevOps, GitLab.com, and
  AWS CodeCommit remotes through provider-neutral actions.
- Add production-to-release equalization guidance using local `sync/*` helper branches without
  automatic push.
- Apply fetch-first source preflight to every governed branch creation action. Main-based release,
  feature, and hotfix starts require exact synchronization; task and bug starts accept ahead-only
  sources without pushing, synchronize behind-only sources after confirmation, and block
  divergence for manual reconciliation.
- Update README and CHANGELOG notes for the shipped 1.6.0 behavior.

Explicitly out of scope:

- Provider-authenticated PR creation, cleanup actions, bulk branch deletion, full release
  automation, and additional provider APIs.
- Background or unconfirmed Git mutations. Flow branch creation, optional publication, PR-source
  synchronization, and equalization remain explicit user actions protected by existing
  confirmations, clean-workspace/conflict guards, and per-repository mutation coordination.
- Automatic push, final governed direct merges, or automatic conflict resolution.
- New views, menus, activation events, runtime dependencies, packaging, publication, or version bump.

Release constraints:

- Preserve existing graph loading, projection semantics, compare, diff, checkout, branch, merge,
  sync, delete, stash, reset, Show Log, and Compare Results workflows.
- Treat Flow Governance as metadata only; it must not hide refs, alter Git history, graph ancestry,
  or repository state.
- Treat Flow Governance 1.6.0 as operational guidance: diagnostics and handoff may guide actions,
  but final governed integration remains PR-gated.
- Keep malformed/stale webview messages bounded by the existing message validation and repository
  authorization layers.
- Do not run packaging or Marketplace publication commands without explicit maintainer approval.

Planned verification before publication:

- `npm run quality:check`
- `npm run build`
- `npm test`
- `git diff --check`
- Manual Extension Development Host smoke using the Flow Governance section of
  `project-context/3.deliver/extension-host-smoke-matrix.md`.

Recorded verification:

- The maintainer reported Marketplace publication of `1.6.0` complete on 2026-07-27. No packaging
  or publication command was run by Codex. The exact Marketplace timestamp, installed-version
  evidence, final Extension Development Host smoke record, and VSIX inspection details remain to be
  added if available.

- The maintainer confirmed on 2026-07-27 that `2.0.0` was never published and approved the
  reclassification of this candidate as `1.6.0`. Package and lockfile root metadata plus active
  AAMAD release artifacts were updated; historical notes, dependency versions, and branch-name
  test fixtures remain unchanged. `npm test` and `git diff --check` passed. No VSIX or Marketplace
  action had been performed at that point.

- AI context disclosure defenses were hardened on 2026-07-26. Compare Briefing and Flow PR
  descriptions now share expanded sensitive-path exclusions plus deterministic redaction of
  high-confidence credential assignments, provider/bearer tokens, credential-bearing URLs, and
  private-key blocks before prompt construction. Flow project-document context now inventories and
  validates every changed path before loading exact patches, closing the prior broad-directory
  pathspec gap. Boundary tests verify representative secret values are absent from final prompts.
  `npm run quality:check` passed with 251 production files and 2,402 functions, the clean build and
  all 796 tests passed, and `git diff --check` passed. `graphify update .` rebuilt 4,930 nodes, 9,696
  edges, and 386 communities. The residual heuristic limitation is documented; no dependency,
  command, Git mutation, package version, VSIX, or Marketplace state changed.

- Extension Host release coverage was hardened on 2026-07-26. The Ubuntu CI job now runs the
  isolated zero/one-repository and singleton-panel baseline against both the minimum supported VS
  Code `1.90.0` and the current stable release. The runner accepts only `stable` or exact `x.y.z`
  releases and removes the inherited `ELECTRON_RUN_AS_NODE` flag before launching desktop Electron,
  while a compiled regression test keeps `engines.vscode`, the CI matrix, and required devcontainer
  Electron libraries aligned. The first minimum-version run also exposed a hard dependency on the
  newer `vscode.git` `Repository.onDidCheckout` event; the lifecycle now treats it as optional and
  falls back to the state-change event available in 1.90. Local matrix execution passed both
  scenarios on VS Code `1.90.0` and stable `1.130.0`; `npm run quality:check` passed with 251
  production files and 2,388 functions, and all 792 tests passed. Verification details are recorded
  in the focused Extension Host E2E artifact. No dependency, minimum VS Code version, package
  version, VSIX, or Marketplace state changed.

- Package hygiene was hardened on 2026-07-26. VSCE now runs the clean production build through
  `vscode:prepublish` before package or direct publish commands. `.vscodeignore` excludes E2E output,
  TypeScript build configurations, and the repository's Flow Governance configuration. The package
  output test executes the real VSCE file listing, requires both production runtime entrypoints, and
  rejects those development-only artifacts. `npm run vscode:prepublish` passed, `npm test` passed all
  789 tests, both runtime-only and full `npm audit` reported zero vulnerabilities, and VSCE listed
  649 files with no forbidden package entries. `git diff --check` passed. No VSIX was created and no
  Marketplace action was performed.

- The AI PR and Release Assistant was implemented on 2026-07-17 as optional icon actions beside PR
  title, PR description, and new-release description. It uses the VS Code Language Model API only after
  a field-level user action, bounds and delimits untrusted input, forbids invented release claims, and
  cancels superseded, closed-form, target-change, and repository-change requests. Improved PR text is
  held transiently by the host so supported provider URLs use the reviewed value. The follow-up
  keeps PR title/description editable, validates the exact bounded visible values on explicit actions,
  and grounds description improvement in a cancellable diff restricted to `README.md`, `CHANGELOG.md`,
  and approved `project-context` paths. Adaptive fitting now tries the complete prompt across available
  Copilot models and, when required, progressively reduces only optional documentation using each
  model's tokenizer; form values and instructions remain intact. Protocol, authorization, prompt/output,
  document-context, token-fitting, host orchestration, URL override, and webview composition tests were
  added. Manual Copilot consent/model and visual smoke remain pending. `npm run quality:check` passed with
  240 production files and 2,356 functions, `npm run build` passed, all 781 tests passed, `git diff
--check` passed, and Graphify was refreshed. The styles and interaction-controller ceilings were
  reduced and an obsolete host-message complexity exception was removed. No command, setting,
  dependency, Git mutation, version, package, or publication changed.

- The context-aware AI PR follow-up was completed on 2026-07-17. The extension host now derives a
  trusted Flow transition and selects typed title/delivery/defect/hotfix/release/synchronization
  prompts. Delivery and release descriptions retain allowlisted project-document context; bug,
  hotfix, and synchronization descriptions use at most 80 safe changed files after both sides of
  rename/copy records are filtered for environment files, credentials, keys, and certificates before
  loading a bounded diff. Bug branches now persist their exact feature/release source, expose guarded
  Promotion PR Context only for that mapped target, and verify the remote target before handoff.
  Optional document or code context remains model-fitted without dropping form content or shared
  safety rules. `npm run quality:check` passed with 251 production files and 2,392 functions;
  `npm run build`, 113 focused tests, all 788 compiled tests, and `git diff --check` passed.
  `graphify update .` rebuilt 4,905 nodes, 9,651 edges, and 384 communities. Manual Copilot output and
  visual Extension Development Host smoke remain pending. No command, setting, dependency, minimum
  VS Code version, package version, packaging, or Marketplace publication changed.

- The Promotion PR Context UX follow-up removed the Title and Description copy-icon actions and
  widened the responsive form exactly 30%, from 560 px to 728 px. The fields remain editable and the
  optional AI actions plus hosted-provider handoff are unchanged. The introduction now directs users
  to review and improve the generated context. `npm run quality:check`, `npm run build`, all 788 tests,
  and `git diff --check` passed; `graphify update .` rebuilt 4,905 nodes, 9,651 edges, and 382
  communities. Manual visual Extension Development Host smoke remains pending. No protocol, command,
  setting, dependency, Git mutation, version, packaging, or publication changed.

- AI Compare Briefing was implemented on 2026-07-17 as an optional, user-initiated Compare Results
  action backed by the VS Code Language Model API and an available GitHub Copilot model. Context is
  built from a bounded path-filtered diff after known sensitive paths are excluded before Git loading;
  output is plain text, and cancellation plus exact-state guards prevent stale completion. The existing
  Compare Results webview file ceiling was reduced from 725 to 717 after extracting the action UI.
  Focused tests passed 47/47; `npm run quality:check` passed with 232 production files and 2,274
  functions; `npm run build`, all 763 tests, and `git diff --check` passed. `graphify update .` rebuilt
  4,737 nodes, 9,220 edges, and 376 communities. Manual Copilot consent/model and visual smoke remain
  pending. A visual-review follow-up replaced the textual action with an icon-only AI action whose
  tooltip and accessible label track its state, added close and Escape affordances to the result panel,
  and lets a dismissed result reopen without a new model request. The 3 focused webview tests,
  `npm run quality:check`, `npm run build`, all 763 tests, and `git diff --check` passed; `graphify
update .` rebuilt 4,737 nodes, 9,220 edges, and 377 communities. No command contribution, setting,
  dependency, minimum VS Code version, Git mutation, package version, packaging, or Marketplace
  publication changed.
  A subsequent UX follow-up bounds the briefing body to `min(45vh, 420px)` with vertical scrolling and
  adds a ready-only copy icon with the `Copy to clipboard` tooltip. Its no-payload protocol message is
  validated and the host copies only the current ready briefing. The 28 affected tests, `npm run
quality:check` (232 production files and 2,277 functions), `npm run build`, all 765 tests, and `git
diff --check` passed. `graphify update .` rebuilt 4,739 nodes, 9,228 edges, and 381 communities.
  Updated visual confirmation remains pending.

- The revision graph message boundary and quality ratchet were hardened on 2026-07-17. Exhaustive
  typed registries now own structural validation, state/repository authorization policy, and host
  handler routing without the previous high-complexity switches. Projection and Flow option
  validation moved to a focused module. Five message-boundary complexity exceptions were removed.
  The quality gate now rejects explicit baselines above current measurements; three file ceilings
  were reduced, one obsolete function exception was removed, and one remaining exception was
  reduced to its measured value. Focused boundary tests passed 21/21; `npm run quality:check`
  passed with 227 production files and 2,226 functions; `npm run build`, all 755 tests, and
  `git diff --check` passed. `graphify update .` completed successfully. No protocol, command,
  dependency, Git workflow, version, packaging, or Marketplace behavior changed.

- The Flow Governance webview dialogs were extracted from the central interaction script on
  2026-07-17. Typed branch, Pull Request context, and equalization controllers now own their DOM,
  local state, validation, and event handling behind injected host callbacks. The interaction
  script decreased from 1,756 to 1,040 lines by the quality gate's counting convention, and its
  baseline was ratcheted accordingly.
  Pure tests cover branch validation, Pull Request warnings, and equalization-origin selection.
  `npm run quality:check` passed with 226 production files and 2,114 functions; `npm run build`,
  all 754 tests, and `git diff --check` passed. `graphify update .` completed successfully. No
  command, protocol, dependency, version, packaging, or Marketplace behavior changed.

- Flow Governance icon badges were completed on 2026-07-17. Graph cards now use compact Codicon
  glyphs with theme-adaptive tonal containers and accessible branch-type labels; Flow Governance
  reference tooltips reuse the same icon treatment while non-governed kinds keep neutral textual
  chips. The SVGs remain inline and CSP-safe without a runtime dependency, and
  their source is attributed in `THIRD_PARTY_NOTICES.md`. Focused webview tests passed 76/76;
  `npm run quality:check` passed with 223 production files and 2,110 functions; `npm run build`, all
  751 tests, and `git diff --check` passed. `graphify update .` rebuilt 4,514 nodes, 8,865 edges,
  and 360 communities. A visual-review correction now prevents the graph's absolute SVG rule from
  positioning badge glyphs outside their inline-flex containers. A UX refinement subsequently
  removed the button-like border and saturated per-kind backgrounds from graph badges, reduced
  their footprint to 18px, added high-contrast outlines, kept only subdued kind accents in textual
  tooltip chips, and changed Release/Feature to the clearer `rocket`/`lightbulb` glyphs. A follow-up
  carries the same tonal icon badge into Flow Governance tooltips. A subsequent learnability
  refinement briefly displayed every complete `<kind> branch` label beside its tooltip icon, but
  maintainer review found that redundant for known kinds. The final behavior keeps known tooltips
  icon-only with accessible branch-type labels and displays `Unknown branch` only when the
  question-mark icon cannot provide a classification. The refinement passed
  `npm run quality:check` with 223 production files and 2,110 functions, `npm run build`, all 751
  tests, and `git diff --check`; `graphify update .` rebuilt 4,515 nodes, 8,866 edges, and 361
  communities. The original icon treatment received targeted visual Extension Development Host
  confirmation on 2026-07-17; the unknown-label follow-up and release-wide final Extension
  Development Host smoke remain pending gates. A final neutral-reference refinement reuses the
  Show Log target, branch, cloud, tag, and archive shapes as icon-only tonal badges for HEAD,
  branch, remote, tag, and stash tooltips, with accessible labels and a textual fallback for
  unexpected kinds. It passed `npm run quality:check` with 224 production files and 2,111
  functions, `npm run build`, all 753 tests, and `git diff --check`; `graphify update .` rebuilt
  4,521 nodes, 8,870 edges, and 362 communities. Maintainer visual review on 2026-07-17 confirmed
  that the cloud icon is appropriate for Remote references; the remaining targeted tooltip smoke
  remains pending. A subsequent review found that the two-node diagonal Branch shape resembled a
  tilted telephone at tooltip size. The approved replacement uses the VS Code-aligned
  `git-branch` silhouette: a vertical trunk, one lateral branch, and three smaller outline nodes in
  both the reference tooltip and Show Log. The refinement passed `npm run quality:check` with 224
  production files and 2,111 functions, `npm run build`, all 753 tests, and `git diff --check`;
  `graphify update .` rebuilt 4,521 nodes, 8,870 edges, and 362 communities. Targeted visual
  confirmation of the revised shape remains pending.

- Task promotion context was completed on 2026-07-17. Tasks created through Flow Governance now
  persist their exact source feature, expose a single authorized `task -> feature` handoff, verify
  the remote feature before the ahead check, and reuse confirmed source publication/push with
  post-push revalidation. Legacy tasks without metadata remain fail-closed. Manual Extension
  Development Host validation remains pending. `npm run quality:check` passed with 222 production
  files and 2,107 functions; `npm run build`, all 750 tests, all 31 platform tests, and
  `git diff --check` passed. `graphify update .` rebuilt 4,495 nodes, 8,848 edges, and 352
  communities.

- Equalization source synchronization was hardened on 2026-07-16. Both the requested target and
  selected origin now reuse the fetch-first branch-source preflight before `sync/*` creation.
  Ahead-only local commits continue without push, behind-only branches require confirmation and
  can be fast-forwarded safely, and divergence or fetch failure prevents branch creation and merge.
  Automatic fetches use the blocking `Fetching remotes...` lifecycle. `npm run quality:check`
  passed with 222 production files and 2,100 functions; `npm run build`, all 746 tests, all 31
  platform tests, and `git diff --check` passed. `graphify update .` rebuilt 4,479 nodes, 8,825
  edges, and 359 communities. Manual Extension Development Host validation remains pending.

- Equalization sync promotion was implemented on 2026-07-16. New sync branches persist the release
  or feature from which equalization was requested before merging the selected origin. Graph state
  restores the mapping, exposes one guarded PR target, supports `sync -> release` and
  `sync -> feature`, rejects alternate webview targets, and blocks handoff while `MERGE_HEAD`
  remains. `npm run quality:check` passed with 220 production files and 2,094 functions without a
  hotspot-baseline increase; `npm run build`, all 740 tests, all 31 platform tests, and
  `git diff --check` passed. `graphify update .` rebuilt 4,468 nodes, 8,790 edges, and 355
  communities. Manual Extension Development Host conflict-resolution validation remains pending.
  A same-day compatibility correction restores the Flow Governance submenu for pre-metadata sync
  branches when deterministic naming identifies exactly one visible release or feature; ambiguous
  matches remain fail-closed. The focused fallback tests and all 742 compiled tests passed;
  `graphify update .` rebuilt 4,470 nodes, 8,798 edges, and 360 communities.

- Governed branch source publication preflight was extended on 2026-07-16. A
  source without upstream is now checked when the repository has remotes; a
  missing source offers confirmed publication, sets upstream, and must pass
  post-push revalidation before the child-branch form opens. Read-only remotes,
  cancellation, unsafe remote state, push failure, and failed revalidation
  fail closed, while repositories without remotes preserve local-only creation.
  `npm run quality:check` passed with 218 production files and 2,083 functions;
  `npm run build`, all 736 tests, all 31 platform tests, and `git diff --check`
  passed. `graphify update .` rebuilt 4,450 nodes, 8,735 edges, and 351
  communities. Manual Extension Development Host validation remains pending.

- Automatic Flow Governance remote fetch feedback was completed on 2026-07-16.
  Branch-start upstream checks, non-current fast-forward synchronization, Pull
  Request target verification, source publication checks, and post-push
  revalidation now show the existing blocking `Fetching remotes...` overlay.
  Cached feature-target statuses no longer bypass the host preflight, so local
  `not-ahead` and inconclusive selections also perform the remote operation.
  A shared `finally` lifecycle clears it before confirmations, warnings, errors,
  forms, or provider URLs. `npm run quality:check` passed with 217 production
  files and 2,077 functions; `npm run build`, all 731 tests, all 31 platform
  tests, and `git diff --check` passed. `graphify update .` rebuilt 4,435 nodes,
  8,711 edges, and 347 communities. Manual Extension Development Host
  validation remains pending. The explicit release-selection follow-up passed
  `npm run quality:check` with 218 production files and 2,078 functions,
  `npm run build`, all 731 tests, all 31 platform tests, and `git diff --check`;
  `graphify update .` rebuilt 4,439 nodes, 8,716 edges, and 361 communities.

- Feature Pull Request target preflight was hardened on 2026-07-16. For
  `feature -> release`, the form now always requires explicit release selection,
  even when only one release is active, and starts no fetch merely by opening.
  Selection triggers the trusted handoff, which fetches the selected remote
  release, requires exact local/remote target synchronization, and only then
  checks commits ahead and source publication. Behind, ahead, divergent,
  missing, and inconclusive targets fail closed without pull, merge,
  equalization, checkout, or target push. Automated gate evidence is recorded
  by `npm run quality:check` (218 production files and 2,078 functions),
  `npm run build`, `npm test` (731 tests), `npm run test:platform` (31 tests),
  `git diff --check`, and `graphify update .` (4,439 nodes, 8,716 edges, 361
  communities). Manual Extension Development Host validation remains pending.

- Flow Governance submenu hover stabilization was completed on 2026-07-16. The fix removes the
  pointer dead zone and adds delayed, cancelable pointer-driven closure while preserving keyboard
  behavior. Focused webview tests passed 75/75; `npm run quality:check` passed with 216 production
  files and 2,064 functions; `npm run build` and all 727 tests passed. Manual Extension Development
  Host smoke remains pending.
- Modal notification policy was implemented on 2026-07-16. Every production error routes through
  a shared modal presenter, Flow Governance clears current loading state before error dialogs, and
  description-persistence warnings remain continuable after modal dismissal. A quality rule rejects
  direct error-message API use outside the presenter. `npm run quality:check` passed with 216
  production files and 2,059 functions; `npm test` passed all 725 tests. Manual Extension
  Development Host smoke remains pending.
- Flow Governance concurrent-repository-operation feedback was centralized on 2026-07-16 across
  branch creation, branch-start preflight, equalization, remote production verification, and Pull
  Request source publication preflight. Rejected operations now use and await the shared native
  modal warning instead of emitting a transient toast. `npm run quality:check` (215 production
  files and 2,058 functions), `npm run build`, `npm test` (721 tests), and `git diff --check`
  passed. Manual Extension Development Host validation remains pending.
- Governed branch source preflight was extended on 2026-07-16 to release, feature, hotfix, task,
  and bug creation. Every tracked source is fetched before comparison. Main-based actions require
  exact synchronization; task and bug use a not-behind policy that preserves ahead-only local
  work without pushing and blocks divergence for manual reconciliation. `npm run quality:check`
  (215 production files and 2,060 functions), `npm run build`, `npm test` (719 tests), and
  `git diff --check` passed. The maintainer confirmed targeted Extension Development Host
  validation on 2026-07-16; the full release-candidate smoke matrix remains pending.
- Hosted Git provider adapters and URL-only support for GitLab.com, AWS CodeCommit, and Google
  Secure Source Manager were implemented on 2026-07-13. GitLab.com supports exact commit and
  branch-aware Merge Request URLs; CodeCommit supports exact regional commit URLs and opens its
  Pull Requests area; Secure Source Manager maps default HTTPS/SSH clone hosts to the documented
  HTML repository and keeps exact commit links deferred. No provider authentication, API client,
  dependency, setting, command, or contribution point was added. `npm run quality:check` (212
  production files and 2,041 functions), `npm run build`, `npm test` (703 tests), and
  `git diff --check` passed. `graphify update .` rebuilt 4,228 nodes, 8,396 edges, and 317
  communities; live provider smoke remains pending.
- Azure DevOps Services URL handoff was implemented on 2026-07-13 without provider authentication,
  new dependencies, settings, commands, or contribution points. The shared resolver preserves
  GitHub HTTPS/SSH behavior, recognizes Azure DevOps current and legacy hosted URLs, strips remote
  credentials, and rejects mismatched fetch/push Pull Request destinations. `npm run quality:check`
  (204 production files and 2,019 functions), `npm run build`, `npm test` (695 tests), and
  `git diff --check` passed. `graphify update .` rebuilt 4,190 nodes, 8,274 edges, and 324
  communities; live Azure portal smoke remains pending.
- The first Ubuntu Extension Host E2E run on 2026-07-13 activated the extension, discovered the
  empty-workspace Git state, and opened the revision-graph panel, but the test filtered it out
  because VS Code exposed an internal `mainThreadWebview-` prefix through
  `TabInputWebview.viewType`. A follow-up assertion based on the presumed-stable
  `Git Revision Graph` title also produced a false negative: the production controller correctly
  changed the empty-workspace title to `No Repository`. The E2E assertion now identifies the
  isolated singleton through `TabInputWebview` and the extension view type, accepting the exact
  value or a host-prefixed value, and includes observed-tab diagnostics on timeout. Regression
  tests for exact, host-prefixed, and unrelated view types, E2E TypeScript compilation,
  `npm run quality:check` (203 production files and 2,000 functions), `npm run build`, `npm test`
  (689 tests), `git diff --check`, and `graphify update .` (4,146 nodes, 8,184 edges, and 337
  communities rebuilt) passed. A local `xvfb-run -a npm run test:e2e` attempt rebuilt successfully
  but could not start VS Code because the container lacks
  `libatk-bridge-2.0.so.0`; a successful Ubuntu CI rerun remains pending.
- The devcontainer and both GitHub Actions jobs moved to the supported Node.js 24 baseline on
  2026-07-13. Local verification on Node.js `24.14.1` passed `npm run build`, `npm test` (686
  tests), configuration syntax checks, and `git diff --check`; rebuilding the updated container
  and rerunning the Extension Host E2E baseline remain pending.
- The automated Extension Host baseline was implemented on 2026-07-13 with isolated empty and
  single-repository fixtures, real `vscode.git` discovery, activation, and graph-panel singleton
  assertions. Its TypeScript suite and runner syntax passed locally. The first full local execution
  downloaded VS Code `1.128.0` but could not start Electron because the container lacks
  `libatk-1.0.so.0`; CI evidence from the new Ubuntu `xvfb` job remains pending.
- Current automated source verification passed on 2026-07-13 with `npm run quality:check`
  (212 production files and 2,041 functions), `npm run build`, `npm test` (703 tests), and
  `git diff --check`. This closes the automated source gate only; final Extension Development Host
  smoke and approved package inspection remain pending.
- Typed revision-graph webview runtime migration completed on 2026-07-13. The external runtime is strictly checked without `noCheck` or a `noImplicitAny` override, its generated asset is enclosed by the named `initializeRevisionGraphWebviewRuntime` ownership boundary, and the revision-graph integration harness no longer uses `node:vm`. `npm run build`, `npm test` (657 tests), `npm run benchmark:ci`, and `git diff --check` passed; Extension Development Host smoke and approved package inspection remain release-delivery gates.
- Flow Governance repository-config persistence is serialized per repository as of 2026-07-12. The
  webview message boundary now awaits persistence; failed writes do not block later queued writes,
  and separate repositories retain independent queues. `npm run build`, `npm test` (619 tests),
  `npm run benchmark:ci`, and `git diff --check` passed. No additional Extension Development Host
  smoke is needed because the change is covered by deterministic persistence and boundary tests.
- Flow Governance configuration path hardening was implemented on 2026-07-12. Repository configuration reads, updates, and command creation now reject symbolic-link/junction files and ancestors; command creation revalidates after confirmation and uses exclusive creation. `npm run build`, `npm test` (614 tests), `npm run benchmark:ci`, and `git diff --check` passed. Extension Development Host validation remains pending.
- `npm run build` passed on 2026-07-01 during Flow Governance implementation.
- Focused Flow Governance config, state, manifest, message validation, dispatcher, handler,
  type-boundary, webview, and command tests passed on 2026-07-01.
- `npm test` passed with 555 tests on 2026-07-01 after the session-disable smoke feedback fix.
- `git diff --check` passed on 2026-07-01 after the session-disable smoke feedback fix.
- Repository config option persistence was added on 2026-07-02 after smoke feedback that disabling
  Flow Governance did not update `.git-revision-graph-flow.json`.
- `npm run build` passed on 2026-07-02 after repository config option persistence.
- `npm test` passed with 557 tests on 2026-07-02 after repository config option persistence.
- `git diff --check` passed on 2026-07-02 after repository config option persistence.
- Reloaded disabled repository config now keeps only the main Flow Governance toggle visible on
  2026-07-02 after smoke feedback.
- Ready graph state now preserves disabled repository Flow Governance metadata after reload on
  2026-07-02.
- `npm run build` passed on 2026-07-02 after disabled-config visibility refinement.
- `npm test` passed with 558 tests on 2026-07-02 after disabled-config reload metadata preservation.
- `git diff --check` passed on 2026-07-02 after disabled-config visibility refinement.
- Branch visibility controls were removed on 2026-07-02 after product feedback; Flow Governance now
  controls only whether branch-kind badges are shown.
- `npm run build` passed on 2026-07-02 after branch visibility simplification.
- `npm test` passed with 558 tests on 2026-07-02 after branch visibility simplification.
- `git diff --check` passed on 2026-07-02 after branch visibility simplification.
- Disabled Flow Governance state now preserves classified references so re-enabling immediately
  renders badges without reopening the graph.
- `npm run build` passed on 2026-07-02 after live re-enable badge rendering fix.
- `npm test` passed with 560 tests on 2026-07-02 after live re-enable badge rendering fix.
- `git diff --check` passed on 2026-07-02 after live re-enable badge rendering fix.
- Targeted Extension Development Host smoke for repository config option persistence was completed
  by maintainer confirmation on 2026-07-02 after live re-enable badge rendering was fixed.
- Manual Extension Development Host Flow Governance smoke completed by maintainer confirmation on
  2026-07-01. Confirmed config creation, activation, invalid-config handling with hidden inert
  controls, session disable/re-enable affordance, and normal graph usability.
- Flow Governance transition policy engine was added on 2026-07-02 with deterministic governed
  pair matching and direct merge policy outcomes.
- `npm run build` passed on 2026-07-02 after the policy engine slice.
- `npm test -- --test-name-pattern "Flow Governance"` passed with 563 compiled tests on
  2026-07-02 after the policy engine slice.
- Flow Governance release promotion readiness was added on 2026-07-02 with
  `ready`, `blocked`, and `inconclusive` outcomes backed by `git merge-base --is-ancestor`.
- `npm run build` passed on 2026-07-02 after the readiness slice.
- `npm test -- --test-name-pattern "Flow Governance"` passed with 566 compiled tests on
  2026-07-02 after the readiness slice.
- Flow Governance contextual diagnostics were expanded on 2026-07-02 for
  PR-required transitions, direct-merge blocking, and release promotion readiness outcomes.
- `npm run build` passed on 2026-07-02 after the diagnostics slice.
- `npm test -- --test-name-pattern "Flow Governance"` passed with 568 compiled tests on
  2026-07-02 after the diagnostics slice.
- Flow Governance `Validate Release Promotion` context action was added on 2026-07-02 for
  release branches in the existing graph context menu.
- `npm run build` passed on 2026-07-02 after the release promotion action slice.
- Focused message/webview/Flow Governance tests passed with 569 compiled tests on
  2026-07-02 after the release promotion action slice.
- `npm test` passed with 569 tests on 2026-07-02 after the release promotion action slice.
- `git diff --check` passed on 2026-07-02 after the release promotion action slice.
- Flow Governance PR handoff was added on 2026-07-02 for governed release-to-main promotion,
  including copyable Pull Request context and GitHub compare URL opening when an eligible remote
  is configured.
- `npm run build` passed on 2026-07-02 after the PR handoff slice.
- Focused message/webview/Flow Governance tests passed with 571 compiled tests on
  2026-07-02 after the PR handoff slice.
- `npm test` passed with 571 tests on 2026-07-02 after the PR handoff slice.
- `git diff --check` passed on 2026-07-02 after the PR handoff slice.
- Flow Governance production-to-release equalization was added on 2026-07-02
  with clean-workspace and confirmation guards, validated local `sync/*`
  naming, no automatic push, and Source Control conflict handoff.
- `npm test` passed with 575 tests on 2026-07-02 after the equalization slice.
- Published `1.5.9` changes were integrated into the `1.6.0` candidate line on 2026-07-09,
  preserving interactive reference details, lazy commit statistics, hash/GitHub actions, Show Log
  badge alignment, and paging fixes alongside Flow Governance badges and actions.
- Integration verification passed on 2026-07-09 with `npm run build`, `npm test` (590 tests), and
  `git diff --check`.
- The 2026-07-09 `main` equalization conflict resolution preserved the published `1.5.9` tooltip
  behavior alongside Flow Governance badges and actions; `npm run build`, `npm test` (590 tests),
  and `git diff --check` passed after resolution.

Marketplace impact:

- User-visible additions are a Command Palette action, new configuration settings, README text, and
  Flow Governance controls inside the existing revision graph webview when Flow Governance metadata
  is present.
- Marketplace copy should describe 1.6.0 as branch classification, PR-required diagnostics,
  URL-only handoff for supported hosted Git providers, release readiness, and safe equalization
  guidance. It must not claim branch hiding, authenticated provider APIs, or branch-prefilled
  CodeCommit/Secure Source Manager creation pages.
- No Marketplace packaging metadata has been captured yet: VSIX filename, checksum, size,
  publication timestamp, and clean-profile installed-version evidence remain pending approval.

Rollback notes:

- Before publication, revert the Flow Governance feature files, command contribution, settings,
  README/CHANGELOG entries, and release artifacts as one feature rollback.
- After publication, prefer a patch release that disables or removes Flow Governance surfaces while
  preserving existing graph workflows.
- Repository config files created by users are user-owned workspace files; rollback must not delete
  them automatically.

## Completed Release: 1.5.9

Status: Published
Opened: 2026-07-07
Published: 2026-07-09 by maintainer confirmation
Baseline: published `1.5.8`

Focused build artifact:

- `project-context/2.build/features/1.5.9-reference-tooltips.md`
- Manual smoke matrix: `project-context/3.deliver/extension-host-smoke-matrix.md`

Approved scope:

- Backport the improved reference-tooltip presentation from development baseline
  `6f3342a90618586b429bc41114231c3bfc0fd9c6`.
- Show a neutral reference kind, full name, optional local Git branch description, commit subject,
  short hash, author, date, and lazily loaded change statistics for the hovered or keyboard-focused
  reference.
- Keep the popover interactive and expose copy-hash and supported GitHub commit actions.
- Exclude the Flow Governance branch-kind badge and all other governance behavior from `1.5.9`.
- Align Show Log reference badges and commit tooltips with the graph card reference presentation,
  including kind icons, matching mixed colors, compact copy-hash actions, and consistent tooltip
  date formatting.
- Treat slash-containing local branch decorations such as `feature/teste03` and `task/1-new-task`
  as local branches when repository ref metadata confirms or fallback parsing has no remote hint.
- Keep Show Log toolbar controls coherent after incremental next-page loading.
- Preserve the published extension architecture, multi-repository behavior, empty states, and
  existing reference actions.

Release constraints and risks:

- No new commands, settings, views, dependencies, activation events, or contribution points.
- Local Git config metadata reads must fail open and remain abort-aware; commit statistics must use
  a bounded, cached, on-demand query rather than slowing the initial graph load.
- Tooltip placement, theme contrast, keyboard focus, Show Log badge contrast, and incremental
  paging require manual Extension Development Host validation.
- Do not package, publish, or bump beyond `1.5.9` without explicit maintainer approval.

Planned verification:

- Focused branch-description, short-stat, message-boundary, GitHub action, graph state, and webview
  shell tests.
- `npm run build`
- `npm test`
- `git diff --check`
- Manual smoke for local/remote/tag/stash references, multi-ref nodes, long names, descriptions,
  pointer transfer into the popover, statistics, clipboard/GitHub actions, viewport edges,
  scrolling, resizing, keyboard selection, GitHub/non-GitHub remotes, and dark/light themes.
- Manual smoke for Show Log row and tooltip badges, `Show All Branches` toggling, and automatic
  next-page loading.

Marketplace and rollback notes:

- Marketplace impact is limited to the reference tooltip, Show Log reference-badge presentation,
  and paging fix documented in README and CHANGELOG.
- No new commands, settings, views, activation events, dependencies, or Marketplace contribution
  points are included.
- Rollback is a focused revert of the reference-tooltip, branch-description metadata loading,
  Show Log badge rendering, and incremental toolbar-sync changes; no persisted extension setting,
  data migration, or contribution-point change is involved.
- VSIX packaging and Marketplace publication were confirmed by the maintainer on 2026-07-09.

Recorded verification:

- Version metadata and release artifacts opened on 2026-07-07.
- `npm run build` passed on 2026-07-07.
- `npm test` passed with 532 tests on 2026-07-07.
- `git diff --check` passed on 2026-07-07.
- SOLID/Clean Code follow-up verification passed on 2026-07-09 with `npm run build`,
  `npm test` (533 tests), and `git diff --check`.
- Show Log badge, branch-classification, color-alignment, and paging follow-up verification passed
  on 2026-07-09 with `npm run build`, focused Show Log/revision graph tests, `npm test`
  (533 tests), and `git diff --check`.
- `README.md`, `CHANGELOG.md`, the `1.5.9` feature artifact, `release.md`, `deployment.md`, and
  `operations.md` were prepared for `1.5.9` publication handoff on 2026-07-09.
- VSIX packaging and Marketplace publication were confirmed by the maintainer on 2026-07-09.
- VSIX filename, checksum, size, Marketplace publication timestamp, clean-profile install result,
  and manual Extension Development Host smoke evidence were not supplied.

## Completed Release: 1.5.8

Status: Published
Opened: 2026-07-03
Development scope closed: 2026-07-03
Published: 2026-07-03 by maintainer confirmation

Focused build artifact:

- `project-context/2.build/features/1.5.8-blocking-warning-visibility.md`
- `project-context/2.build/features/1.5.8-dead-code-cleanup.md`
- `project-context/2.build/features/1.5.8-toolbar-split-buttons.md`
- `project-context/2.build/features/1.5.8-reset-to-reference.md`
- `project-context/2.build/features/1.5.8-show-log-hover-contrast.md`
- `project-context/2.build/features/1.5.8-compare-hover-contrast.md`
- `project-context/2.build/features/1.5.8-context-menu-item-standardization.md`
- Manual smoke matrix: `project-context/3.deliver/extension-host-smoke-matrix.md`

Initial scope:

- Open `1.5.8` from the published `1.5.7` baseline.
- Replace transient warning toasts with native modal warnings when a user-requested Git mutation is
  aborted by a dirty workspace, merge conflict, missing mutation prerequisite, invalid target, or
  concurrent repository mutation.
- Preserve existing destructive confirmations, success notifications, benign no-op messages,
  Source Control reveal behavior, and Git mutation guards.
- Keep the change inside the existing native VS Code UI adapters and scoped workflow modules.
- Replace the toolbar long-press affordances introduced in `1.5.7` with explicit split buttons for
  `Push` force modes and empty-cache `Reload`.
- Expose `Reset to this` from non-HEAD graph references while resetting by the selected commit hash.
- Improve Show Log and Compare Results row/context-menu hover contrast and standardize webview menu
  item styling on `context-menu-item`.
- Remove dead code left behind by earlier graph-surface and workspace-reset changes.

Marketplace and rollback notes:

- Marketplace impact was limited to the recorded revision graph UX changes; there were no new
  commands, settings, views, activation events, or dependencies.
- Marketplace publication was confirmed by the maintainer on 2026-07-03.
- Keep improvements as small, separable rollback candidates for follow-up patches.

Recorded verification:

- `npm run build` passed on 2026-07-03.
- `npm test` passed with 526 tests on 2026-07-03.
- `git diff --check` passed on 2026-07-03.
- `CHANGELOG.md` release notes were prepared on 2026-07-03.
- VSIX packaging and Marketplace publication were confirmed by the maintainer on 2026-07-03.

## Completed Release: 1.5.7

Status: Published
Opened: 2026-07-03
Development scope closed: 2026-07-03
Published: 2026-07-03 by maintainer confirmation

Focused build artifact:

- `project-context/2.build/features/1.5.7-small-improvements.md`
- Manual smoke matrix: `project-context/3.deliver/extension-host-smoke-matrix.md`

Initial scope:

- Deliver small, independently reviewable improvements agreed with the maintainer during the
  `1.5.7` cycle.
- Remove `Reset Workspace to HEAD` and `Reset Workspace and Remove Untracked Files` from the graph
  context menu while preserving commit reset workflows.
- Make toolbar `Push` perform a normal push on short click and expose force-with-lease and force
  modes from the 500 ms long-press menu.
- Replace the ambiguous reset-zoom toolbar glyph with a `1:1` actual-size icon.
- Preserve existing extension architecture and Marketplace contribution points unless an approved
  improvement explicitly requires a change.

Recorded verification:

- `npm run build` passed on 2026-07-03.
- `npm test` passed with 528 tests on 2026-07-03.
- `git diff --check` passed on 2026-07-03.
- `CHANGELOG.md` release notes were prepared on 2026-07-03.
- VSIX packaging and Marketplace publication were confirmed by the maintainer on 2026-07-03.

## Previous Completed Release: 1.5.6

`1.5.6` was recorded as completed by maintainer confirmation on 2026-07-01.

Completed scope:

- Split native workbench reference-action services into smaller adapter modules while preserving
  existing commands, prompts, confirmations, and user-facing Git workflows.
- Narrowed selected reference-action workflow dependencies to smaller service slices.
- Separated revision graph webview payload validation from state/current-repository authorization.
- Extracted revision graph repository lifecycle and refresh coordination from
  `src/revisionGraph/controller.ts`.
- Extracted revision graph type boundaries and removed the graph parsing / webview shared import
  cycles.
- Added graph fidelity regression coverage for branch, hidden merge, tag, remote, stash, and hidden
  linear-path continuity.
- Added a fixed Extension Development Host smoke matrix for future release-candidate validation.

Recorded verification:

- Pull Request handoff usability issue #10 now uses destination-neutral wording, target readiness
  labels, provider-aware guidance, source/target copy for manual providers, and duplicate-open
  protection. `npm run build`, `npm test`, `npm run quality:check`, and `git diff --check` passed on
  2026-08-09; Extension Development Host smoke and a final graph refresh remain pending.
- Flow Governance issue #9 completed the governed Pull Request handoff for release-origin package
  and task branches on 2026-08-09. It preserves the exact persisted release target, authorizes the
  PR handoff end to end, and requires target remote synchronization for all package promotions.
- `npm run quality:check`, `npm run build`, focused flow tests, `npm test`, `graphify update .`, and
  `git diff --check` passed on 2026-08-09 for issue #9. Extension Development Host smoke remains
  pending.
- `npm run build` passed on 2026-07-01 after repository lifecycle extraction.
- Focused webview message validation/dispatcher tests passed on 2026-07-01.
- Focused repository lifecycle, repository state-change, and repository selection tests passed on
  2026-07-01.
- `npm test` passed with 528 tests on 2026-07-01 after adding the graph fidelity regression
  fixture.
- `git diff --check` passed on 2026-07-01 after the type-boundary extraction.
- Final Extension Development Host smoke completed by maintainer confirmation on 2026-07-01 after
  the type-boundary extraction.
- `CHANGELOG.md` release notes for `1.5.6` were prepared on 2026-07-01 before packaging and
  Marketplace publication.
- VSIX packaging and Marketplace publication were confirmed complete by the maintainer on
  2026-07-01.

Known missing metadata:

- VSIX filename, checksum, and size were not supplied.
- Marketplace publication timestamp and installed-version evidence were not supplied.
- Codex did not run packaging or publication commands for `1.5.6`.

## Gate For Opening The Next Release

Before implementation begins for the next release:

- Confirm the target version and baseline package version.
- Create or update a focused feature artifact under `project-context/2.build/features/`.
- Update `project-context/1.define/prd.md` or `project-context/1.define/sad.md` only for durable product or architecture decisions.
- Record release-specific risks, verification plan, manual smoke matrix, Marketplace impact, and rollback notes in this file.
- Do not bump versions, package VSIX, or publish without explicit maintainer approval.

## Completed Release: 1.5.6

Status: Published
Opened: 2026-07-01
Completed: 2026-07-01 by maintainer confirmation

Focused build artifact:

- `project-context/2.build/features/1.5.6-architecture-risk-reduction.md`
- Manual smoke matrix: `project-context/3.deliver/extension-host-smoke-matrix.md`

Completed scope:

- Split `src/workbenchRefActionServices.ts` into smaller native VS Code adapter modules while
  preserving the existing factory and user-facing behavior.
- Narrow touched ref action workflows so they depend on only the service capabilities they use.
- Separate revision graph webview message payload validation from state/current-repository
  authorization rules.
- Extract revision graph repository lifecycle and refresh coordination from
  `src/revisionGraph/controller.ts` without changing graph webview behavior.
- Extract revision graph type boundaries to remove import cycles between Git graph parsing,
  shared graph data, view-state contracts, and webview shared contracts.
- Add a graph fidelity regression fixture for branch, hidden merge, tag, remote, stash, and hidden
  linear-path continuity without changing runtime behavior.
- Add a fixed Extension Development Host smoke matrix for future release candidates.

Release constraints:

- Package baseline has been bumped to `1.5.6`; do not bump again without maintainer approval.
- Do not add commands, menus, views, activation events, settings, or runtime dependencies.
- Preserve multi-repository behavior, empty-state handling, conflict guards, and native VS Code
  workbench ergonomics.
- Preserve current revision graph behavior while changing only internal type/module ownership.
- Do not run packaging or Marketplace publication commands without explicit maintainer approval.

Planned verification:

- `npm run build`
- `npm test`
- `git diff --check`
- Manual Extension Development Host smoke using
  `project-context/3.deliver/extension-host-smoke-matrix.md`.

Recorded verification:

- `npm run build` passed on 2026-07-01 after repository lifecycle extraction.
- Focused webview message validation/dispatcher tests passed on 2026-07-01.
- Focused repository lifecycle, repository state-change, and repository selection tests passed on
  2026-07-01.
- `npm test` passed with 526 tests on 2026-07-01 after repository lifecycle extraction.
- `git diff --check` passed on 2026-07-01 after repository lifecycle extraction.
- Manual Extension Development Host smoke completed by maintainer confirmation on 2026-07-01 before
  repository lifecycle extraction.
- Final Extension Development Host smoke completed by maintainer confirmation on 2026-07-01 after
  repository lifecycle extraction.
- Focused graph type-boundary, graph state, graph model, and webview shared tests passed on
  2026-07-01.
- `npm test` passed with 527 tests on 2026-07-01 after the type-boundary extraction.
- `git diff --check` passed on 2026-07-01 after the type-boundary extraction.
- Final Extension Development Host smoke completed by maintainer confirmation on 2026-07-01 after
  the type-boundary extraction.
- `npm test` passed with 528 tests on 2026-07-01 after adding the graph fidelity regression
  fixture.
- `CHANGELOG.md` release notes for `1.5.6` were prepared on 2026-07-01 before packaging and
  Marketplace publication.
- VSIX packaging and Marketplace publication were confirmed complete by the maintainer on
  2026-07-01.

## Standard Release Verification

- Run `npm run build`.
- Run `npm test` for behavior, graph, controller, command, webview, or Git workflow changes.
- Run `git diff --check` before release-candidate packaging.
- Manually validate in an Extension Development Host for user-visible graph or Git workflows.
- For Marketplace readiness, capture VSIX filename, checksum, size, package version, publication timestamp, and clean-profile installation result when available.

## Rollback Notes

- Marketplace rollback is manual: publish a follow-up patch or unpublish/deprecate according to Marketplace policy and maintainer decision.
- Keep source changes, package metadata changes, and Marketplace publication decisions separate so a release can be stopped before deployment.
- For Git workflow regressions, prioritize disabling or reverting the affected action path over broad architecture changes.
