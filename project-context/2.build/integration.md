# Integration

## Scope
Cross-component wiring between `package.json`, activation, command handlers, webview messages, Git repositories, compare/log views, README, tests, and release artifacts.

## Inputs
Use feature artifacts, manifest contributions, command registrations, README feature descriptions, and test coverage.

## Changes
Record integration decisions when a feature touches more than one surface.

- 2026-05-01 `0.0.27` stabilization hardening touched extension host Git command execution, revision graph backend, graph/show-log/compare webview message validators, ref content provider, compare restore, and regression tests.
- No `package.json` contribution changes were needed.
- No README or CHANGELOG release-note update was made yet because versioning/release packaging has not been approved.

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
- Automated verification complete: `npm run build`, `npm test`, production audit.
- Manual smoke-test coverage is still pending.

## Known Gaps
Automated tests do not fully replace Extension Development Host validation.
