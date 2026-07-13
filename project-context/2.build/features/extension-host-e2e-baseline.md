# Extension Host E2E Baseline

## Goal

Close the release-assurance gap between Node tests with VS Code fakes and the real Extension Host
without replacing the existing manual smoke matrix.

## Scope

- Run the published extension entrypoint inside a downloaded VS Code desktop instance.
- Exercise isolated empty and single-repository workspaces.
- Use the built-in `vscode.git` extension rather than a fake API.
- Verify extension activation and singleton revision-graph editor launch.
- Run the baseline in Linux CI through `xvfb`.
- Keep all fixtures temporary and all exercised workflows non-destructive.

## Acceptance Criteria

- `npm run test:e2e` compiles a dedicated Extension Host test runner.
- The empty scenario observes zero repositories and opens the graph without an activation failure.
- The repository scenario creates one disposable commit, observes exactly that repository through
  `vscode.git`, and opens the graph.
- Running the graph command twice leaves one webview tab with view type
  `gitRefs.revisionGraphEditorPanel` and title `Git Revision Graph`.
- The runner uses isolated user-data and extension directories for each scenario.
- CI runs the baseline on Ubuntu with Node 24 and `xvfb`.

## Design Notes

`@vscode/test-electron` remains on the compatible `2.x` line used by the implemented baseline;
upgrading that dependency is a separate change from the Node 24 runtime migration. The custom
runner downloads the stable VS Code release once, reuses that executable for both scenarios, and
accepts `VSCODE_E2E_VERSION` or `VSCODE_E2E_EXECUTABLE_PATH` overrides.

The baseline intentionally stops at host integration boundaries. It does not automate rendered
webview pixels, native pickers and confirmations, remote authentication, multi-repository choices,
or Git mutations; those remain in the manual release matrix.

## Verification

- Passed: dedicated E2E TypeScript compilation.
- Passed: Node syntax validation for `scripts/run-extension-host-tests.mjs`.
- Passed: fixture prerequisites (`git` available) and dependency resolution for
  `@vscode/test-electron@2.5.2`.
- Attempted: `npm run test:e2e`; VS Code `1.128.0` downloaded successfully, but Electron could not
  start because the development container lacks `libatk-1.0.so.0`.
- Pending: successful execution of the new Ubuntu CI job with `xvfb`.
- Passed: `npm run quality:check` (203 production files and 2,000 functions).
- Passed: `npm run build` through the full test command.
- Passed: `npm test` (686 tests).
- Passed after the Node 24 migration: `npm run build` and `npm test` (686 tests) on Node.js
  `24.14.1`; the Extension Host E2E run remains pending a devcontainer rebuild.
- Passed: `git diff --check`.
- Passed: `graphify update .` (3,908 nodes, 7,941 edges, and 337 communities rebuilt).
