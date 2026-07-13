# Webview source coverage gate

## Goal

Prevent TypeScript files in the revision graph browser runtime from remaining outside both the host compilation and the explicit webview bundle.

## Scope

- Remove the orphaned `src/revisionGraph/webview/script/types.ts` declaration.
- Discover every `.ts` and `.d.ts` file below the webview `runtime` and `script` directories.
- Fail `npm run build:webview` when a discovered source is absent from `tsconfig.webview.json`.
- Expose a read-only coverage check for deterministic regression testing.

## Acceptance criteria

- The webview build fails before compilation when a new browser source is not listed in the bundle.
- The current source tree has complete bundle coverage.
- Build and automated tests remain green.

## Design notes

The bundle keeps its explicit ordering because the browser runtime uses `module: none` and a single `outFile`. The gate compares membership only; it does not reorder the configured files or weaken that ordering contract.

## Verification

- `node scripts/build-webview.mjs --check-source-coverage` — passed (`53/53`).
- `npm run build` — passed.
- `npm run quality:check` — passed (`202` files, `1985` functions).
- `npm test` — passed (`685` tests).
- `git diff --check` — passed.
- Manual Extension Development Host verification is not required because this change only removes an unused declaration and adds a pre-compilation build invariant.
