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
- Latest published release recorded in the release notes: `1.0.1`.
- VSIX package generated for the release: `git-revision-graph-1.0.1.vsix`.
- Marketplace publication for `1.0.1` is complete.
- Post-release monitoring should follow `project-context/3.deliver/release.md`.

## Current Release State
- Target release: `1.0.1`.
- Current package baseline: `1.0.0`.
- Package metadata has been bumped to `1.0.1`.
- Release definition is closed as a narrow hotfix release with exactly two fixes: current-branch force-push Git API routing and current-branch pull error loading cleanup.
- Automated verification is complete for `1.0.1`.
- VSIX packaging has been run for `1.0.1`.
- Marketplace publishing is complete for `1.0.1`.

## Access
Publisher: `rodriguesvali` as declared in `package.json`. Confirm Marketplace access before publish work.

## Rollback
Prefer a follow-up patch release or republishing a corrected package. Keep previous VSIX artifacts when preparing releases.
