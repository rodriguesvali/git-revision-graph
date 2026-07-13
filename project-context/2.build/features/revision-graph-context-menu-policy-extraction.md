# Revision graph context menu policy extraction

## Goal

Reduce the largest browser interaction hotspot without changing the revision graph context-menu behavior or the surrounding VS Code host workflows.

## Scope

- Extract context-menu action policy from the legacy DOM interaction script into a typed, browser-safe runtime module.
- Keep DOM rendering, Flow Governance forms, and host message dispatch in `interactions.ts`.
- Add an isolated strict typecheck for the extracted policy.
- Replace source-shape assertions for menu policy with behavioral plan tests.
- Ratchet the reviewed file-size baseline and remove the former `openContextMenu` complexity exception.

## Acceptance criteria

- `openContextMenu` is below the default complexity limit of 15.
- The extracted module is below the default 500-line file limit and has no complexity exceptions.
- Comparison, checkout, reset, stash, publish, tag, delete, merge, focus, and conflicted-merge actions preserve their prior availability rules.
- The webview bundle and isolated typecheck compile successfully.
- Build, quality gates, and automated tests pass.

## Design notes

The extracted module returns an immutable menu plan containing sections, labels, semantic action identifiers, and presentation flags. It does not access the DOM, VS Code API, or mutable browser state. The legacy interaction layer supplies a snapshot of current state, renders the plan, and maps semantic actions to existing message-posting functions.

## Verification

- `npm run build` — passed, including the strict isolated context-menu typecheck and complete webview source coverage.
- `npm run quality:check -- --report` — passed (`203` files, `2000` functions); `openContextMenu` no longer appears above the default complexity threshold.
- `npm test` — passed (`686` tests).
- `git diff --check` — passed.
- Extension Development Host verification was not run. Recommended smoke path: open the graph and inspect context menus for a commit, local branch, remote branch, tag, stash, current `HEAD`, two selected revisions, dirty workspace, and conflicted merge.
