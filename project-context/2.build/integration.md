# Integration

## Scope
Cross-component wiring between `package.json`, activation, command handlers, webview messages, Git repositories, compare/log views, README, tests, and release artifacts.

## Inputs
Use feature artifacts, manifest contributions, command registrations, README feature descriptions, and test coverage.

## Changes
Record integration decisions when a feature touches more than one surface.

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

## Known Gaps
Automated tests do not fully replace Extension Development Host validation.
