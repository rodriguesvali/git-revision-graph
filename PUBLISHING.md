# Publishing

This project is ready to be distributed either as a local `.vsix` package or through the Visual Studio Marketplace.

## Marketplace publisher setup (one-time)

Complete these steps only when creating the publisher or renewing local Marketplace authentication.
They are not per-release gates; use the release-readiness document for the current candidate's
verification, packaging, and publication authorization.

1. Create a Marketplace publisher at `https://marketplace.visualstudio.com/manage/publishers/`.
2. Confirm that the `"publisher"` field in `package.json` matches your real Marketplace publisher ID.
3. Create an Azure DevOps Personal Access Token with Marketplace `Manage` scope.
4. Log in locally:

```bash
npx vsce login <publisher-id>
```

## Release gates before packaging

Before creating a VSIX, confirm that every required gate for the current candidate is complete in
[`project-context/3.deliver/release.md`](project-context/3.deliver/release.md), including the final
Extension Development Host smoke. Obtain explicit maintainer approval for the packaging step.

## Package the approved candidate VSIX

```bash
npm ci
npm test
npm run package:vsix
```

VSCE runs `vscode:prepublish` before packaging, which performs a clean production build even when
`out/` is missing or stale. `npm test` remains a separate required release gate.

Inspect the generated `.vsix`, record its filename, SHA-256 checksum, size, and embedded package
version in the release-readiness document, then install it in a clean VS Code profile. The generated
`.vsix` can be installed via `Extensions: Install from VSIX...`.

## Publish to Marketplace

Publish only after the VSIX inspection and clean-profile installation have passed, all release gates
are complete, and the maintainer has given separate explicit authorization for Marketplace
publication. For the approved current candidate, whose version is already set in `package.json`:

```bash
npm run publish:current
```

The publish commands use the same VSCE `vscode:prepublish` lifecycle and therefore rebuild the
production output before upload. They do not replace the required test, packaging inspection, or
release-readiness gates. Record the publication timestamp and installed-version evidence after the
Marketplace action succeeds.

## Future version increments

Do not use the commands below for an already versioned release candidate. Use them only after
the next version and release scope have been explicitly approved; each can change package metadata
and create a Git version commit or tag.

Patch release:

```bash
npm test
npm run publish:patch
```

Minor release:

```bash
npm test
npm run publish:minor
```

Major release:

```bash
npm test
npm run publish:major
```

## Notes

- `vsce publish` publishes the current version from `package.json` when no explicit version argument is provided.
- `vsce publish <patch|minor|major>` updates the extension version and, inside a Git repository, can create a version commit and tag.
- The Marketplace does not allow SVG files as the extension icon in `package.json`. This project uses `media/icon.png`.
- Images referenced by `README.md` and `CHANGELOG.md` must use `https`.
