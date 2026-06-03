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
- `0.0.35` release package exists locally as `git-revision-graph-0.0.35.vsix`.
- Marketplace publication status should be confirmed by the maintainer before publishing a newer version.
- Post-release monitoring should follow `project-context/3.deliver/release.md`.

## Current Release Preparation
- Target release: `0.0.36`.
- Source baseline: `c4746ffe2b55a130183def5e95d366efaa4e17fd`.
- Package metadata has been bumped to `0.0.36`.
- Documentation is updated for the `d3-dag` layout, virtualized graph rendering, worker-thread layout calculation, and stale render guard release scope.
- VSIX packaging generated `git-revision-graph-0.0.36.vsix`.
- Generated VSIX SHA-256: `4813c8615967142931cb38b3163a6464b5c5d2237082bff39d66b09b12cff876`.
- Marketplace publishing remains pending explicit maintainer approval.

## Access
Publisher: `rodriguesvali` as declared in `package.json`. Confirm Marketplace access before publish work.

## Rollback
Prefer a follow-up patch release or republishing a corrected package. Keep previous VSIX artifacts when preparing releases.
