# Release 1.0.1 Hotfix Prioritization

## Objective

Version `1.0.1` is opened as a narrow hotfix release after the published `1.0.0` release.

The release should fix the current-branch force-push authentication regression while preserving the shipped `1.0.0` product surface.

## Context

- Current package baseline: `1.0.0`.
- Target release: `1.0.1`.
- `1.0.0` is published and remains the latest Marketplace release.
- A user reported that `Push with Force` fails with `fatal: could not read Username for 'https://github.com': terminal prompts disabled`.
- Investigation confirmed that normal current-branch push uses the built-in VS Code Git API, while force modes currently run a direct `git push --force...` command through the extension process.
- Context7 and the official VS Code Git API source confirmed that the supported `Repository.push` signature includes a fourth `force?: ForcePushMode` parameter in the `1.90.0` API baseline used by this extension.

## Release Direction

Primary hotfix item:

- Fix current-branch force push and force-with-lease push to use the built-in VS Code Git API force parameter instead of the direct non-interactive Git CLI path.

Supporting work:

- Update the local `src/git.ts` API contract to include `ForcePushMode` and the fourth `Repository.push` parameter.
- Preserve the existing push-mode QuickPick labels, destructive confirmation, upstream normalization, refresh behavior, and success/error messaging.
- Add focused regression coverage for force and force-with-lease dispatch through the Git API contract.
- Run full automated verification before packaging.

## Exclusions

- No new push modes or broad push workflow redesign.
- No changes to normal push, pull, sync, publish branch, tag push, or remote delete behavior unless required by the force-push fix.
- No new command, menu, view, setting, dependency, or contribution point.
- No Marketplace publication without explicit maintainer approval after verification and package review.

## Acceptance Criteria

- `package.json` and `package-lock.json` are bumped to `1.0.1`.
- `project-context/3.deliver/release.md` records the opened `1.0.1` readiness state.
- The force-push bug is tracked as the first planned launch item for `1.0.1`.
- Force push and force-with-lease use `repository.push(..., ForcePushMode.*)` from the built-in VS Code Git API after implementation.
- The extension no longer uses direct Git CLI push for current-branch force modes after implementation.
- Automated verification includes `npm run build`, `npm test`, and `git diff --check` before release preparation.

## Verification Plan

Automated:

- `npm run build`
- `npm test`
- `git diff --check`

Focused checks after implementation:

- Current-branch normal push still uses the existing Git API path.
- Current-branch force-with-lease maps to `ForcePushMode.ForceWithLease`.
- Current-branch force maps to `ForcePushMode.Force`.
- Existing force confirmation and refresh cancellation behavior remains intact.

Manual Extension Development Host smoke test:

- Open a Git workspace and launch `View Git Revision Graph` from Source Control.
- Run current-branch normal push, force-with-lease push, and force push against a test remote where safe.
- Confirm force modes use VS Code Git authentication/Source Control behavior rather than failing with non-interactive terminal prompt errors.
- Confirm graph refresh and success/error feedback remain coherent after push.

## Risks

- The local Git API contract has drifted from the official `vscode.git` API, so the fix must update types without broadening unrelated API usage.
- Force-push behavior is destructive; preserve the existing modal confirmation and upstream targeting.
- Some authentication behavior depends on the user environment and remote provider, so manual smoke validation should include an HTTPS remote when possible.

## Marketplace Notes

- Frame `1.0.1` as a hotfix for current-branch force-push authentication behavior.
- Do not imply broader push workflow changes or new Git provider support.
- Review generated VSIX contents before publication and keep internal AAMAD artifacts out of the package.
