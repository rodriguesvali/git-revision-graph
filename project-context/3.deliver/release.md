# Release Readiness

Status: Active
Last consolidated: 2026-06-30

## Current State

- Current package version: `1.5.5` in `package.json`.
- Latest recorded published release: `1.5.5`.
- Release cycle status: no new release cycle is open in active context.
- Historical release readiness notes are archived at `project-context/archive/releases/release-readiness-history.md`.

## Last Completed Release

`1.5.5` was recorded as completed by maintainer confirmation on 2026-06-30.

Completed scope:

- Added `Focus Descendants` to single-revision graph context menus.
- Focuses the graph on one visible anchor plus all loaded descendants determined by Git ancestry.
- Keeps descendant focus bounded to the loaded snapshot.
- Reuses the existing major-operations projection, layout, minimap, search, selection, and indexed virtualization.
- Adds a removable toolbar indicator for the active descendant focus.
- Keeps Focus Descendants mutually exclusive with Focus Range.

Recorded verification:

- `npm run build` passed on 2026-06-30.
- `npm test` passed with 522 tests on 2026-06-30.
- Focused webview verification passed with 29 tests on 2026-06-30.
- `git diff --check` passed after final release-documentation synchronization.
- Extension Development Host validation, scope closure, VSIX packaging, and Marketplace publication were confirmed complete by the maintainer on 2026-06-30.

Known missing metadata:

- VSIX filename, checksum, and size were not supplied.
- Marketplace publication timestamp and installed-version evidence were not supplied.
- Codex did not run packaging or publication commands.

## Gate For Opening The Next Release

Before implementation begins for the next release:

- Confirm the target version and baseline package version.
- Create or update a focused feature artifact under `project-context/2.build/features/`.
- Update `project-context/1.define/prd.md` or `project-context/1.define/sad.md` only for durable product or architecture decisions.
- Record release-specific risks, verification plan, manual smoke matrix, Marketplace impact, and rollback notes in this file.
- Do not bump versions, package VSIX, or publish without explicit maintainer approval.

## Standard Release Verification

- Run `npm run build`.
- Run `npm test` for behavior, graph, controller, command, webview, or Git workflow changes.
- Run `git diff --check` before release-candidate packaging.
- Manually validate in an Extension Development Host for user-visible graph or Git workflows.
- For Marketplace readiness, capture VSIX filename, checksum, size, package version, publication timestamp, and clean-profile installation result when available.

## Rollback Notes

- Marketplace rollback is manual: publish a follow-up patch or unpublish/deprecate according to Marketplace policy and maintainer decision.
- Keep source changes, package metadata changes, and Marketplace publication decisions separate so a release can be stopped before deployment.
- For Git workflow regressions, prioritize disabling or reverting the affected action path over broad architecture changes.
