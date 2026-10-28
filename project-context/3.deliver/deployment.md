# Deployment

Status: Active
Last consolidated: 2026-10-28

## Environment

Visual Studio Marketplace for publisher `rodriguesvali`, as declared in `package.json`.

## Rules

- Do not store Marketplace credentials or tokens in the repository.
- Do not run `npm run package:vsix` or any `npm run publish:*` command without explicit
  maintainer approval.
- Do not reuse an already published Marketplace version number.

## Deployment Steps

1. Confirm release scope and package version.
2. Run required automated verification.
3. Complete the required Extension Development Host smoke matrix.
4. Update README, CHANGELOG, and `project-context/3.deliver/release.md` when user-visible behavior
   changes.
5. Package VSIX only after approval.
6. Publish only after approval.
7. Record VSIX filename, checksum, size, Marketplace publication timestamp, and clean-profile
   install result when available.

## Development Cycle: 1.7.6

- Publication artifacts prepared on 2026-10-28 at the maintainer's request;
  the maintainer will perform publication. The latest source verification passed
  1,229 tests, 53 platform tests and the quality gate. The maintainer reported
  the three review-correction smoke tests passed without environment details.
- Manifest and both lockfile versions are 1.7.6. A read-only `vsce ls` preview
  listed 716 entries and included the host, webview, layout worker and the new
  reference/empty-tree modules. No VSIX or installation was inspected.
- Fresh `npm audit` reported two high development-only entries for
  GHSA-xcx6-jx8p-x3h5; `npm audit --omit=dev` reported no vulnerabilities.
  The prior maintainer decision to await upstream stable integration remains
  recorded in [release readiness](release.md).

- Graph [Open File at Revision…](../2.build/features/1.7.6-graph-open-file.md) is
  implemented after separate maintainer authorization. Latest source checks:
  1,171 tests including builds, 53 Linux platform tests, quality (313 files /
  2,882 functions), actual VS Code 1.100.0/stable 1.143.1 safety scenarios, graph
  refresh and whitespace checks passed. Manual/platform/package gates remain
  separate; the following opening/review-panel counts are historical checkpoints.

- Opened on 2026-10-26 with explicit maintainer authorization to prepare build
  artifacts. Manifest and both lockfile version fields target 1.7.6; CHANGELOG
  was initially marked Unreleased. Runtime/dependency/contribution baselines are unchanged.
- Published baseline is 1.7.5, confirmed by the maintainer on 2026-10-26; exact
  publication date and package/source evidence were not supplied.
- [Open File](../2.build/features/1.7.6-open-file.md) is implemented after separate
  maintainer authorization to begin implementation: current-worktree editing and
  explicit historical reading in Compare Results and Show Log, with pinned refs
  and addition/deletion/rename availability. No new dependency or contribution.
- Fresh opening verification passed: 1,136 tests with zero failures/skips, including
  clean production/webview builds; version consistency, local links and whitespace
  checks passed. Evidence is recorded in [release readiness](release.md) and
  the [cycle artifact](../2.build/features/1.7.6-release-cycle-opening.md).
  Fresh implementation verification: 1,157 tests including builds, 52 Linux
  platform tests and quality (310 files / 2,858 functions) passed. Actual minimum
  1.100.0/stable 1.143.1 host safety scenarios passed, including new opening tests.
  Manual keyboard/theme/Windows/non-text editor checks, final hosted CI/package
  checks and installation remain separate pending delivery evidence.
- No VSIX, tag, installation or Marketplace action was performed during artifact
  preparation; the maintainer retained responsibility for publication.
- Before publication, rollback restores the 1.7.5 metadata baseline and reverts only
  these planning edits, preserving user files and published fixes.

## Published Release: 1.7.5

Publication confirmed by the maintainer on 2026-10-26. Exact publication date,
uploaded bytes, source/tag and installation evidence were not supplied. The
following statements describe the earlier 2026-10-17 candidate checkpoint;
pending evidence is preserved and must not be interpreted as 1.7.6 verification.

- Opened with explicit maintainer authorization on 2026-10-17.
- Manifest, top-level lockfile and root package targeted `1.7.5`; CHANGELOG marked
  it Unreleased at that checkpoint. Approved scope included S1–S4 safety work, VS Code 1.100 minimum,
  tag-detached HEAD, B1–B3 bisect fixes, worktree-only Revert, removal of the merge
  display option and Flow Governance status-copy cleanup.
- Previous published baseline was `1.7.4`, confirmed by the maintainer on 2026-10-11.
- Build/test and structural graph verification are tracked in
  [release readiness](release.md) and the
  [cycle artifact](../2.build/features/1.7.5-release-cycle-opening.md).
- Latest source verification: 1,136 tests including builds; quality passed for
  301 files / 2,830 functions. Prior Linux platform (51) and actual minimum/stable
  host safety checks are scoped in release readiness. The latest Flow UX change
  was manually accepted; broader manual smoke remains pending.
- The [publication review](1.7.5-publication-review.md) at source `62a9807` confirms
  matching metadata, zero-vulnerability full/runtime audits and a read-only VSCE
  preview of 685 files, including required runtime/worker assets and excluding
  internal artifacts. No candidate VSIX was created or inspected.
- Packaging, installation, tags and Marketplace publication require separate
  authorization. Existing published VSIX files retain their versions.
- Before publication, rollback of cycle opening reverts its metadata/documentation
  changes to 1.7.4 while preserving unrelated work.

## Published Release: 1.7.4

- Opened with explicit maintainer authorization on 2026-10-09.
- Source candidate: `e934ca1df148d50da83077ed1c27e6ca2f4bfc3b`; publication
  artifact changes follow this source commit. Comparison baseline: `574cdb9`.
- Manifest, top-level lockfile and root package declared `1.7.4` at publication.
  CHANGELOG is dated 2026-10-11. Publication was performed by the maintainer and confirmed on
  2026-10-11 with “publicação finalizada.”
- Scope: guided bisect with visual/compact controls and ownership protection,
  expanded-file `change:` search and propagation in Show Log, Feature/Bug from
  Package and Package from Main, and one-second tooltip activation.
- Published baseline is now `1.7.4` by maintainer confirmation; previous baseline
  was `1.7.3`, confirmed on 2026-10-04. The next cycle is recorded above.
- Latest verification: 1,039 tests including builds, quality checks, prior 39 Linux
  platform checks / 119 Chromium scenarios, review-cycle CI benchmark and a fresh
  zero-vulnerability dependency audit. Local `vsce ls` preview passed with 679 files;
  required runtime/worker assets included and development paths/maps/old VSIX excluded.
  Added `tasks/**` to `.vscodeignore` after preview exposed two internal planning
  files; a fresh production build and post-build preview passed.
- [Release readiness](release.md) holds the consolidated gate status and
  [smoke matrix](extension-host-smoke-matrix.md) holds the remaining manual scenarios.
  Manual smoke completion has not been reported for this complete candidate.
- The maintainer subsequently reported VSIX generation and personally initiated
  publication. Local `git-revision-graph-1.7.4.vsix` inspection passed: 1,173,397 bytes,
  SHA-256 `e10612fb169add11683037b6b01d3f52e24f0e123aa5d27878c87a26abce7d30`,
  identity `rodriguesvali.git-revision-graph@1.7.4`, 679 extension files. Required
  runtime/worker assets match local output; internal tasks/development artifacts
  are excluded. Source HEAD observed at handoff: `04996d1`; exact release tag and
  upload byte identity are not independently established.
- Clean-profile installation, complete manual smoke, precise publication time
  and installed-version evidence remain unconfirmed. Public catalog and published
  byte equality were not independently checked. Record these separately when supplied.
- The assistant ran no packaging, installation, tag or Marketplace command during
  the artifact review or handoff. Existing published VSIX files retain their versions.

## Published Release: 1.7.3

- Publication confirmed by the maintainer on 2026-10-04 ("publicação concluída").
- Identity: `rodriguesvali.git-revision-graph@1.7.3`; observed source HEAD `4878046`.
  Exact published source/tag and public catalog evidence were not supplied.
- Opened with maintainer authorization on 2026-10-03; package/build metadata declared `1.7.3` at publication.
- Final release smoke completed by maintainer confirmation on 2026-10-04.
- Scope: responsive/keyboard-accessible reference menus, Compare Results review-context
  retention, Show Log loading/alignment and literal file/change search; VSCE 4.0.0 remediation.
- CHANGELOG is dated 2026-10-04. All three package fields declared 1.7.3 at publication; source baseline
  observed during preparation is `043bf5f`.
- Latest implementation evidence: 971 tests including build, quality, 39 Linux platform
  checks and browser scenarios recorded per feature. Fresh full/runtime audits passed.
- Previous published baseline: `1.7.2`. Scope and delivery evidence are tracked in
  [release readiness](release.md).
- Local artifact inspected: `git-revision-graph-1.7.3.vsix`, 1,146,995 bytes;
  SHA-256 `889968e620a12622b2e9dc33b85db06489afcbce1c44d69d6ea180e78078c37a`.
  Embedded identity, extension/webview runtime, query/review-context modules and
  changelog verified; development artifacts excluded. Marketplace byte equality
  was not independently checked.
- Clean-profile installation, exact publication timestamp, installed-version evidence
  and final release source/tag were not supplied. No deployment command ran during
  this documentation update. Never reuse 1.7.3 for a correction.

## Published Release: 1.7.2

- Publication confirmed by the maintainer on 2026-09-22; public catalog not independently checked.
- Identity: `rodriguesvali.git-revision-graph@1.7.2`; reviewed implementation: `b437638`.
- Scope: contextual Publish/Push, persistent Focus Descendants, Center on HEAD availability.
- Implementation verification: 937 tests/build, quality/diff checks, independent review and
  VS Code 1.90.0 automated empty/single-repository smoke passed.
- Local artifact inspected: `git-revision-graph-1.7.2.vsix`, 1,139,924 bytes, SHA-256
  `becfc7025ac92ba79396e8ae6ad84336875c7f74f2b27734a0acf3d6776412d5`.
  Embedded identity and extension/webview assets verified; development files excluded.
  Equivalence to the Marketplace upload was not checked.
- The user updated the development-only js-yaml lockfile entry to 4.3.2; fresh full npm audit
  reports zero vulnerabilities. Full tests were not rerun after that lockfile update.
- Exact publication timestamp, release commit/tag, installed-version evidence, clean-profile
  installation and final manual smoke results were not supplied.
- The next development cycle, `1.7.3`, was authorized on 2026-10-03.
  Never reuse a published version for corrections.

## Published Baseline: 1.7.1

Publication was confirmed by the maintainer on 2026-09-07. Inspection and clean-profile
installation evidence were not supplied. See [release history](release.md).

## Historical Published Release: 1.7.0

- Source delivery was finalized on 2026-09-04 from the published `1.6.9` baseline.
- `package.json`, `package-lock.json`, and the lockfile root package declare `1.7.0`.
- Release notes and focused build artifacts are complete. Local quality, build, unit, platform,
  benchmark, version-consistency, whitespace, and VSCE file-list preview gates passed.
- `npm audit` is an explicit temporary exception because registry audit connectivity is currently
  unreliable. Development-only transitive findings under `@vscode/vsce` remain follow-up work and
  are not part of the packaged extension runtime dependency tree.
- Marketplace publication was confirmed by the maintainer and independently verified on the public
  catalog at 2026-09-04 12:04:33 UTC.
- Local and Marketplace VSIX packages are byte-identical: 1,122,685 bytes, SHA-256
  `29a5db00c69a7702885293da6b782554b29e74e27237ba6a81eb61b3cbd0aa86`, with embedded identity
  `rodriguesvali.git-revision-graph@1.7.0` and the extension/webview runtime assets present.
- Clean-profile installation and final manual smoke evidence were not supplied and are not inferred.
- Local `HEAD` is `c95f0b8`; public `origin/main` remains at `f880b4e`, and no local or public
  `1.7.0` source tag exists. Main synchronization and source-tag verification remain with the
  maintainer.
- Never reuse `1.7.0`; corrections require a later patch.

## Published Baseline: 1.6.9

- Marketplace publication and the matching local, remote, and public source tag were independently
  verified on 2026-08-25.
- The reviewed VSIX identity, size, and SHA-256 are recorded in
  `project-context/3.deliver/release.md`.

## Historical Published Release: 1.6.1

- `package.json` and the root `package-lock.json` both declare `1.6.1`.
- Source implementation baseline: commit `5bf38f0` on `release/1.6.1`.
- Automated source verification and the maintainer-confirmed final Extension Development Host smoke
  are recorded in `project-context/3.deliver/release.md`.
- Marketplace publication was confirmed complete by the maintainer on 2026-07-29. No packaging or
  publication command was run by Codex.
- Exact Marketplace timestamp, installed-version evidence, VSIX filename, SHA-256 checksum, size,
  embedded-version inspection, runtime-asset inspection, clean-profile installation result, hosted
  `macos-latest` result, and current-candidate Extension Host E2E result were not supplied and are
  not inferred.
- Never reuse `1.6.1`; any corrective deployment requires a new version.

## Published Baseline: 1.6.0

- Publication was confirmed by the maintainer on 2026-07-27.
- Exact Marketplace timestamp, VSIX metadata, clean-profile installation result, and installed
  version evidence were not supplied and are not inferred.

Historical deployment notes are archived in `project-context/archive/deliver/deployment.md`.
