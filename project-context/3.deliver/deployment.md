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
- Latest published release recorded in the release notes: `1.5.0`.
- Marketplace publication for `1.5.0` was confirmed by the maintainer on 2026-06-28.
- Exact VSIX filename, checksum, and Marketplace publication metadata were not supplied and
  are not inferred.
- Post-release monitoring should follow `project-context/3.deliver/release.md`.

## Current Release State
- Published package baseline: `1.5.0`.
- Corrective release target: `1.5.1`.
- Package metadata reports `1.5.1` after explicit maintainer approval on 2026-06-28.
- Corrected changelog and delivery artifacts are prepared for a documentation-only patch.
- The `1.5.1` candidate passed the build and all 495 tests after the version bump; read-only
  `vsce` inspection confirmed that the corrected changelog is included.
- Runtime smoke validation remains valid from the unchanged `1.5.0` implementation and was
  reported complete by the maintainer.
- `1.5.1` VSIX packaging and Marketplace publication have not been performed by Codex.

## Access
Publisher: `rodriguesvali` as declared in `package.json`. Confirm Marketplace access before publish work.

## Rollback
Prefer a follow-up patch release and keep previous VSIX artifacts when preparing releases.
Do not attempt to overwrite or reuse an existing Marketplace version number.
