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

## Access
Publisher: `rodriguesvali` as declared in `package.json`. Confirm Marketplace access before publish work.

## Rollback
Prefer a follow-up patch release or republishing a corrected package. Keep previous VSIX artifacts when preparing releases.
