# Secondary Webview Style Decomposition

## Goal

Reduce responsibility mixing in the monolithic Show Log and Compare Results webview renderers without changing their generated documents or runtime behavior.

## Scope

- Extract the complete Show Log CSS block into `src/showLog/webviewStyles.ts`.
- Extract the complete Compare Results CSS block into `src/compareResults/webviewStyles.ts`.
- Keep CSP, HTML structure, inline nonce script, and runtime code in the existing renderers.
- Add composition contracts proving that each shell embeds exactly one copy of its dedicated style output.

## Acceptance Criteria

- `renderShowLogWebviewHtml()` embeds the exact Show Log style module output.
- `renderCompareResultsWebviewHtml()` embeds the exact Compare Results style module output.
- Existing structural webview tests continue passing unchanged.
- CSP and nonce behavior remain unchanged.
- Build and tests pass.

## Architecture Result

- `showLogWebview.ts` decreases from 2,364 to approximately 1,465 lines.
- `compareResultsWebview.ts` decreases from 1,191 to approximately 724 lines.
- Presentation styling can now evolve independently from document/runtime orchestration.

## Follow-up Boundary

The remaining inline runtimes are still substantial. A later phase can migrate behavior into compiled typed assets, following the revision graph runtime pattern, without coupling that higher-risk change to this mechanical style extraction.
