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
- Latest published release recorded in the release notes: `1.0.0`.
- VSIX package generated for the release: `git-revision-graph-1.0.0.vsix`.
- Marketplace publication for `1.0.0` is complete.
- Post-release monitoring should follow `project-context/3.deliver/release.md`.

## Current Release State
- Target release: `1.0.0`.
- Current package baseline: `0.0.39`.
- Package metadata has been bumped to `1.0.0`.
- Release definition is closed as a small polish release after the published `0.0.39` hardening cycle.
- VSIX packaging has been run for `1.0.0`.
- Marketplace publishing is complete for `1.0.0`.

## Access
Publisher: `rodriguesvali` as declared in `package.json`. Confirm Marketplace access before publish work.

## Rollback
Prefer a follow-up patch release or republishing a corrected package. Keep previous VSIX artifacts when preparing releases.
