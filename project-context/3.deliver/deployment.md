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
- `0.0.36` release package exists locally as `git-revision-graph-0.0.36.vsix`.
- Marketplace publication status should be confirmed by the maintainer before publishing a newer version.
- Post-release monitoring should follow `project-context/3.deliver/release.md`.

## Current Release Preparation
- Target release: `0.0.37`.
- Current package baseline: `0.0.36`.
- Package metadata has not been bumped for `0.0.37`.
- Release definition is opened as a post-`0.0.36` stabilization and regression-control cycle.
- VSIX packaging has not been run for `0.0.37`.
- Marketplace publishing remains pending explicit maintainer approval.

## Access
Publisher: `rodriguesvali` as declared in `package.json`. Confirm Marketplace access before publish work.

## Rollback
Prefer a follow-up patch release or republishing a corrected package. Keep previous VSIX artifacts when preparing releases.
