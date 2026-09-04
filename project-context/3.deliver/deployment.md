# Deployment

Status: Active
Last consolidated: 2026-09-04

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

## Published Release: 1.7.0

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
