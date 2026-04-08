# Publishing

This project is ready to be distributed either as a local `.vsix` package or through the Visual Studio Marketplace.

## Before the first publish

1. Create a Marketplace publisher at `https://marketplace.visualstudio.com/manage/publishers/`.
2. Confirm that the `"publisher"` field in `package.json` matches your real Marketplace publisher ID.
3. Create an Azure DevOps Personal Access Token with Marketplace `Manage` scope.
4. Log in locally:

```bash
npx vsce login <publisher-id>
```

## Package a VSIX

```bash
npm install
npm test
npm run package:vsix
```

The generated `.vsix` can be installed in VS Code via `Extensions: Install from VSIX...`.

## Publish to Marketplace

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

- `vsce publish` updates the extension version and, inside a Git repository, can create a version commit and tag.
- The Marketplace does not allow user-provided SVGs as the extension icon in `package.json`. This project currently does not declare an extension icon yet.
- Images referenced by `README.md` and `CHANGELOG.md` must use `https`.
