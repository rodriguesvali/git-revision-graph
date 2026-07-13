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
- Running the graph command twice leaves one `TabInputWebview` tab titled `Git Revision Graph`.
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

The tab assertion uses the public tab input kind and title instead of requiring an exact
`TabInputWebview.viewType`. VS Code currently exposes an internal `mainThreadWebview-` prefix for
extension-created panels in that tab property even though `WebviewPanel.viewType` retains the
extension-owned value. Timeout errors include all observed tab labels and webview types so future
host/API changes are visible directly in CI output.

## Verification

- Passed: dedicated E2E TypeScript compilation.
- Passed: Node syntax validation for `scripts/run-extension-host-tests.mjs`.
- Passed: fixture prerequisites (`git` available) and dependency resolution for
  `@vscode/test-electron@2.5.2`.
- Attempted after the tab-assertion fix: `xvfb-run -a npm run test:e2e`; the extension and E2E
  TypeScript builds passed, but VS Code `1.128.0` could not start because the development container
  lacks `libatk-bridge-2.0.so.0`. The corrected host assertion therefore still requires CI evidence.
- Pending: successful execution of the new Ubuntu CI job with `xvfb`.
- Passed: `npm run quality:check` (203 production files and 2,000 functions).
- Passed: `npm run build` through the full test command.
- Passed: `npm test` (686 tests).
- Passed after the Node 24 migration: `npm run build` and `npm test` (686 tests) on Node.js
  `24.14.1`; the Extension Host E2E run remains pending a devcontainer rebuild.
- Passed: `git diff --check`.
- Passed after the fix: `graphify update .` (4,142 nodes, 8,176 edges, and 329 communities rebuilt).
- Fixed: the initial Ubuntu CI run opened the revision-graph panel but timed out because the test
  compared `TabInputWebview.viewType` with the unprefixed extension value. The assertion now uses
  `TabInputWebview` plus the stable panel title and reports observed tabs on timeout.
- Passed after the fix: dedicated E2E TypeScript compilation, `npm run quality:check` (203 production
  files and 2,000 functions), `npm test` (686 tests), and `git diff --check`.
