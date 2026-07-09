# Deployment

Status: Active
Last consolidated: 2026-07-09

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

## Published Release: 1.5.9

- Package version is `1.5.9`.
- Automated verification is recorded in `project-context/3.deliver/release.md`.
- VSIX packaging and Marketplace publication were confirmed by the maintainer on 2026-07-09.
- Publication evidence still to record if supplied later: VSIX filename, checksum, size,
  Marketplace publication timestamp, clean-profile installation result, and manual smoke evidence.

Historical deployment notes are archived in `project-context/archive/deliver/deployment.md`.
