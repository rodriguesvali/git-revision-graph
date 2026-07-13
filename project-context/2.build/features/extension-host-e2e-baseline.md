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
- Running the graph command twice leaves one `TabInputWebview` whose view type resolves to
  `gitRefs.revisionGraphEditorPanel`.
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

The tab assertion uses the public `TabInputWebview` kind and accepts either the extension-owned
view type or the same value with a host-added prefix. VS Code 1.128.0 exposed
`mainThreadWebview-gitRefs.revisionGraphEditorPanel` through `TabInputWebview.viewType`, while
`WebviewPanel.viewType` retained the extension-owned value. The assertion does not use the panel
title because production intentionally changes it to `No Repository` or
`<repository>: Branch: <branch>`. Timeout errors include all observed tab labels and webview types
so future host/API changes are visible directly in CI output.

## Verification

- Passed: dedicated E2E TypeScript compilation.
- Passed: Node syntax validation for `scripts/run-extension-host-tests.mjs`.
- Passed: fixture prerequisites (`git` available) and dependency resolution for
  `@vscode/test-electron@2.5.2`.
- Attempted after the first tab-assertion fix: the Ubuntu CI host started VS Code `1.128.0`, opened
  the revision-graph panel, and reported its dynamic `No Repository` title. The test still timed out
  because it incorrectly treated `Git Revision Graph` as a stable title.
- Pending: successful execution of the new Ubuntu CI job with `xvfb`.
- Passed: `npm run quality:check` (203 production files and 2,000 functions).
- Passed: `npm run build` through the full test command.
- Passed: `npm test` (686 tests).
- Passed after the Node 24 migration: `npm run build` and `npm test` (686 tests) on Node.js
  `24.14.1`; the Extension Host E2E run remains pending a devcontainer rebuild.
- Passed: `git diff --check`.
- Passed after the fix: `graphify update .` (4,142 nodes, 8,176 edges, and 329 communities rebuilt).
- Fixed: the initial Ubuntu CI run exposed the host-added webview type prefix, and the follow-up run
  exposed the dynamic panel title. The assertion now recognizes the extension view type with or
  without a host prefix and reports observed tabs on timeout.
- Passed after the view-type matcher correction: dedicated regression tests for exact, host-prefixed,
  and unrelated view types; E2E TypeScript compilation; `npm run quality:check` (203 production files
  and 2,000 functions); `npm run build`; `npm test` (689 tests); `git diff --check`; and
  `graphify update .` (4,146 nodes, 8,184 edges, and 337 communities rebuilt).
- Attempted after the view-type matcher correction: `xvfb-run -a npm run test:e2e` rebuilt the
  extension and E2E runner, but the local VS Code executable could not start because the container
  lacks `libatk-bridge-2.0.so.0`. A successful Ubuntu CI rerun remains required.
