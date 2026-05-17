# Integration

## Scope
Cross-component wiring between `package.json`, activation, command handlers, webview messages, Git repositories, compare/log views, README, tests, and release artifacts.

## Inputs
Use feature artifacts, manifest contributions, command registrations, README feature descriptions, and test coverage.

## Changes
Record integration decisions when a feature touches more than one surface.

- 2026-05-01 `0.0.27` stabilization hardening touched extension host Git command execution, revision graph backend, graph/show-log/compare webview message validators, ref content provider, compare restore, and regression tests.
- The same stabilization slice fixed a pre-existing graph zoom viewport regression in the webview runtime.
- No `package.json` contribution changes were needed.
- No README or CHANGELOG release-note update was made yet because versioning/release packaging has not been approved.
- 2026-05-16 `0.0.31` Source Control integration touched `package.json`, activation command wiring, graph panel lifecycle, review view lifecycle, README, release docs, and manifest tests.
- The final `0.0.31` product surface removes the primary graph Activity Bar view and temporary Source Control companion graph view, then routes Source Control launch to `gitRefs.openRevisionGraphEditor`.
- Compare Results and Show Log remain on-demand review views with dedicated Activity Bar labels and explicit hide commands.
- Release documentation now treats Phase 1 companion-view artifacts as historical and Phase 3 product surface cleanup as the release-bound behavior.

## Verification
- Confirm manifest command/view IDs match implementation.
- Run `npm run build`.
- Run `npm test` for behavior changes.
- For release candidates, manually smoke test the relevant workflows in an Extension Development Host.

## Decisions
- Treat `package.json` as product surface.
- Keep README and tests aligned with user-visible features.

## Handoff Notes
Record touched surfaces, mismatches found, verification commands, and manual smoke-test coverage.

- Feature artifact: `project-context/2.build/features/0.0.27-stabilization-hardening.md`.
- Automated verification complete: `npm run build`, `npm test` with 223 tests, production audit.
- Manual smoke-test coverage is still pending.
- Feature artifacts for `0.0.31`: `project-context/2.build/features/source-control-editor-panel.md` and `project-context/2.build/features/source-control-product-surface.md`.
- Automated verification recorded during implementation: `npm run build`, `npm test` with 273 tests, and `git diff --check`.
- Manual Extension Development Host validation for the final Source Control/editor graph surface remains pending before packaging.

## Known Gaps
Automated tests do not fully replace Extension Development Host validation.
