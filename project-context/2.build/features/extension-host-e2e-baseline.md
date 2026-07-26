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
- Run the baseline against both the minimum supported VS Code version and the current stable release.
- Keep all fixtures temporary and all exercised workflows non-destructive.

## Acceptance Criteria

- `npm run test:e2e` compiles a dedicated Extension Host test runner.
- The empty scenario observes zero repositories and opens the graph without an activation failure.
- The repository scenario creates one disposable commit, observes exactly that repository through
  `vscode.git`, and opens the graph.
- Running the graph command twice leaves one `TabInputWebview` whose view type resolves to
  `gitRefs.revisionGraphEditorPanel`.
- The runner uses isolated user-data and extension directories for each scenario.
- CI runs the baseline on Ubuntu with Node 24 and `xvfb` for VS Code `1.90.0` and `stable`.
- The devcontainer installs the desktop Electron libraries required to reproduce both runs locally.
- The runner accepts only `stable` or an exact `x.y.z` version and rejects ambiguous values before
  downloading or launching VS Code.

## Design Notes

`@vscode/test-electron` remains at the installed `2.5.2`; upgrading that dependency is outside this
change. Its installed declarations and Microsoft documentation confirm that
`downloadAndUnzipVSCode` accepts `stable` or an exact release such as `1.90.0`. The custom runner
downloads the requested VS Code release once, reuses that executable for both scenarios, and accepts
the cross-platform `--vscode-version`, `VSCODE_E2E_VERSION`, or `VSCODE_E2E_EXECUTABLE_PATH`
overrides. The command-line version takes precedence over the environment.

The workflow's static matrix is protected by a compiled regression test that derives the minimum
version from `engines.vscode` and requires the same version plus `stable` in CI. The same test checks
the devcontainer's direct Electron runtime packages and ensures the runner removes the inherited
`ELECTRON_RUN_AS_NODE` flag so a manifest or environment change cannot silently reduce coverage.

The VS Code `1.90.0` `vscode.git` contract exposes `Repository.state.onDidChange` but not the newer
`Repository.onDidCheckout` event. The repository lifecycle therefore treats `onDidCheckout` as an
optional optimization: newer hosts retain the checkout-specific refresh signal, while 1.90 uses the
existing state-change signal. A focused lifecycle test constructs the 1.90 contract without
`onDidCheckout` and verifies activation-safe attachment and disposal. Contract evidence:

- `@vscode/test-electron`: https://github.com/microsoft/vscode-test/blob/main/README.md
- VS Code 1.90 Git API: https://github.com/microsoft/vscode/blob/1.90.0/extensions/git/src/api/git.d.ts

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
- Implemented on 2026-07-26: the Ubuntu E2E job now has independent `1.90.0` and `stable` matrix
  entries; the runner validates exact requested versions; and the devcontainer installs GTK,
  NSS, GBM, ALSA, and Xvfb prerequisites. Configuration regression tests keep the VS Code engine,
  CI matrix, and Linux prerequisites aligned.
- Fixed during local matrix verification: the devcontainer's Extension Host environment exported
  `ELECTRON_RUN_AS_NODE=1`, which made the downloaded VS Code binary interpret the workspace path as
  a Node module. The standalone runner now removes that inherited flag before spawning desktop
  Electron, and the configuration regression test protects the normalization.
- Found by the first real VS Code `1.90.0` repository scenario: extension activation failed because
  `Repository.onDidCheckout` was added after the declared engine baseline. The minimal Git contract
  and repository lifecycle now treat that event as optional and preserve state-change refresh as the
  1.90-compatible fallback.
- Passed on 2026-07-26: `xvfb-run -a npm run test:e2e -- --vscode-version 1.90.0`.
  Both the empty and disposable-repository scenarios passed activation, real `vscode.git` discovery,
  and singleton revision-graph panel checks.
- Passed on 2026-07-26: `xvfb-run -a npm run test:e2e -- --vscode-version stable`.
  `@vscode/test-electron` resolved stable to VS Code `1.130.0`; both scenarios passed.
- Passed on 2026-07-26: `npm run quality:check` (251 production files and 2,388 functions).
- Passed on 2026-07-26: `npm test` (792 tests).
- Passed on 2026-07-26: `npm run test:platform` (31 tests), `npm audit --omit=dev`,
  `npm audit`, and `git diff --check`.
- Passed after source changes: `graphify update .` (4,918 nodes, 9,663 edges, and 380
  communities).
