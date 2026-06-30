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
- Latest published release recorded in the release notes: `1.5.4`.
- Marketplace publication for `1.5.4` was confirmed by the maintainer on 2026-06-30 while
  opening the `1.5.5` cycle.
- Exact VSIX filename, checksum, and Marketplace publication metadata were not supplied and
  are not inferred.
- Post-release monitoring should follow `project-context/3.deliver/release.md`.

## Current Release State
- Published package baseline: `1.5.4`.
- Target patch: `1.5.5`.
- The `1.5.5` cycle is open with `Focus Descendants` as its initial approved scope.
- Package metadata reports `1.5.5` after explicit maintainer approval.
- Focus Descendants implementation and automated behavior verification are complete locally.
- Manual smoke validation, scope closure, packaging, and publication are pending.
- Dependency declarations, commands, views, and Marketplace contribution points are unchanged.
- `README.md` and `CHANGELOG.md` describe the implemented `1.5.5` feature behavior.
- Codex executed the approved `1.5.5` version bump. Codex has not executed packaging or
  publication commands for `1.5.5`.

## Access
Publisher: `rodriguesvali` as declared in `package.json`. Confirm Marketplace access before publish work.

## Rollback
Prefer a follow-up patch release and keep previous VSIX artifacts when preparing releases.
Do not attempt to overwrite or reuse an existing Marketplace version number.
