# Deterministic Webview Build Discovery

## Goal

Remove the manually maintained webview TypeScript command chain while preserving isolated type checks and deterministic bundle generation.

## Scope

- Discover every `tsconfig.webview.*.json` isolated target automatically.
- Sort isolated targets deterministically.
- Compile `tsconfig.webview.json` last and then wrap the generated runtime.
- Invoke the repository-local TypeScript compiler through Node for cross-platform behavior.
- Replace enumerated manifest tests with discovery-completeness tests.

## Acceptance Criteria

- Adding a new isolated webview config requires no `package.json` edit.
- Every matching isolated config is compiled exactly once.
- The emitting bundle config runs after all isolated checks.
- Runtime wrapping still runs only after a successful bundle build.
- `npm run build`, `npm test`, and the config-list contract pass.

## Risk

A mistakenly named `tsconfig.webview.*.json` file becomes part of the build automatically. This is intentional and makes the naming convention an executable project contract.

## Configuration organization

The webview TypeScript configurations live in `config/webview/`. Discovery sorts isolated configurations in that directory and compiles the bundle configuration last. Paths in the configurations, source coverage check, watch script, VSIX exclusions, and build tests follow the new location. The emitted runtime remains `out/webview/revisionGraph.js`.

This is a development-only organization change with no intended user-facing behavior or release-note impact. Verification: `npm test` (includes build and VSIX file-list checks); skill metadata validation and `git diff --check`. Roll back the configuration moves together with the build and watch path changes if needed.
