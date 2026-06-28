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
- Latest published release recorded in the release notes: `1.5.2`.
- Marketplace publication for `1.5.2` was confirmed by the maintainer on 2026-06-28.
- Exact VSIX filename, checksum, and Marketplace publication metadata were not supplied and
  are not inferred.
- Post-release monitoring should follow `project-context/3.deliver/release.md`.

## Current Release State
- Published package baseline: `1.5.1`.
- Target hotfix: `1.5.2`.
- The Windows test-runner and test-portability hotfixes are implemented and verified locally.
- The maintainer reported on 2026-06-28 that the Node 20 GitHub Actions matrix passed on
  Ubuntu, Windows, and macOS.
- Package metadata reports `1.5.2` after explicit maintainer approval on 2026-06-28.
- Dependency declarations, commands, views, and Marketplace surface are unchanged.
- Post-bump local verification passed on 2026-06-28: `npm run build`, `npm test`,
  `npm run test:platform`, and `git diff --check`.
- Marketplace publication of `1.5.2` is complete by maintainer confirmation on 2026-06-28.
- Codex did not execute packaging or publication commands.

## Access
Publisher: `rodriguesvali` as declared in `package.json`. Confirm Marketplace access before publish work.

## Rollback
Prefer a follow-up patch release and keep previous VSIX artifacts when preparing releases.
Do not attempt to overwrite or reuse an existing Marketplace version number.
