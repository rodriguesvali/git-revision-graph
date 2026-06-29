# Deployment

## Environment
Visual Studio Marketplace for the published VS Code extension.

## Configuration
No runtime secrets should be stored in the repository. Marketplace publishing requires external credentials or authenticated `vsce` access handled outside project artifacts.

## Steps
- Confirm release scope and version target.
- Run required verification.
- Update release notes or README when user-visible behavior changes.
- Package with `npm run package:vsix` only after approval.
- Publish with the appropriate `npm run publish:*` command only after approval.

## Latest Deployment
- Latest published release recorded in the release notes: `1.5.3`.
- Marketplace publication for `1.5.3` was confirmed by the maintainer on 2026-06-28.
- Exact VSIX filename, checksum, and Marketplace publication metadata were not supplied and
  are not inferred.
- Post-release monitoring should follow `project-context/3.deliver/release.md`.

## Current Release State
- Published package baseline: `1.5.3`.
- Target patch: `1.5.4`.
- The remote permission modal-alert UX safety patch is implemented and verified locally.
- Package metadata reports `1.5.4` after explicit maintainer approval.
- Dependency declarations, commands, views, and Marketplace contribution points are unchanged.
- Local verification passed: `npm run build`, `npm test` with 508 tests, and `git diff --check`.
- `CHANGELOG.md` includes the `1.5.4` candidate notes for Marketplace-facing release notes.
- Manual Extension Development Host smoke validation, VSIX packaging, and Marketplace
  publication remain pending explicit maintainer approval.
- Codex executed the approved version bump. Codex did not execute packaging or publication
  commands for `1.5.4`.

## Access
Publisher: `rodriguesvali` as declared in `package.json`. Confirm Marketplace access before publish work.

## Rollback
Prefer a follow-up patch release and keep previous VSIX artifacts when preparing releases.
Do not attempt to overwrite or reuse an existing Marketplace version number.
