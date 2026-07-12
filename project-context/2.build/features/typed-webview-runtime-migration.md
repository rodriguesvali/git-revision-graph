# Typed Webview Runtime Migration

Status: In progress - external asset boundary implemented; strict runtime hardening pending
Last updated: 2026-07-12
Release target: `2.0.0`

## Goal

Move the revision-graph browser runtime out of JavaScript template strings and into strict TypeScript modules compiled as webview assets, while preserving the current panel lifecycle, CSP posture, message authorization, graph behavior, and Marketplace packaging.

## Current Structural Risk

The revision-graph runtime is currently assembled by `src/revisionGraph/webview/script.ts` from approximately 4,800 lines of JavaScript embedded in template strings across `script/bootstrap.ts`, `script/interactions.ts`, `script/layout.ts`, `script/messages.ts`, `script/graph.ts`, and `script/referenceTooltip.ts`.

Those files are compiled as TypeScript only around the string-producing functions. The browser code inside the strings receives no TypeScript checking, depends on shared mutable globals, and is tested by extracting the inline script from generated HTML and executing it through `node:vm`. Contract changes can therefore compile successfully while leaving browser-only failures for runtime.

## Architectural Decision

Use a separate TypeScript compilation target that emits one browser asset under `out/webview/`. Do not add a bundler or runtime dependency for this migration.

- Keep the extension host on its existing CommonJS `tsconfig.json` output.
- Add `tsconfig.webview.json` with `ES2022` browser output and no Node or VS Code ambient types. It will become fully strict as the compatibility surface is removed.
- Load one classic browser script from the webview HTML through a URI produced by `webview.asWebviewUri`. The legacy runtime currently relies on shared globals, so module emission is deferred until that ownership is removed.
- Limit `localResourceRoots` to the compiled webview asset directory.
- Extend the CSP helper only enough to allow the generated webview resource origin while retaining nonce protection and `default-src 'none'`.
- Keep `RevisionGraphMessage` and `RevisionGraphViewHostMessage` as the shared host/webview protocol source; split protocol-only types into a browser-safe module if compilation reveals value-level host dependencies.

## Implemented Foundation

- `npm run build` now compiles the extension host and emits `out/webview/revisionGraph.js` from a separate browser target.
- The revision graph loads that asset through `webview.asWebviewUri`; `localResourceRoots` is restricted to `out/webview`.
- The revision graph CSP now permits only its generated webview resource origin and nonce-bearing script. Other webviews retain their existing inline nonce-only policy.
- The retained-panel watch command recompiles both targets without adding a dependency.
- Existing behavioral tests execute the compiled runtime asset rather than extracting an executable string from generated HTML.
- `tsconfig.webview.messages.json` strictly checks every outbound message builder against an explicit discriminated protocol before the compatibility runtime is emitted.
- Incoming host messages now pass through a typed structural guard before the legacy state handler can apply them.
- `tsconfig.webview.dom.json` strictly checks the required-element lookup helper; bootstrap binds every shell element through that helper with a concrete element type.
- `tsconfig.webview.api.json` strictly checks the narrow VS Code webview adapter, including persisted state and the discriminated outbound-message contract.
- `tsconfig.webview.state.json` strictly checks persisted webview state. Minimap preference and manual node offsets now pass through a validated state boundary instead of directly reading and writing the VS Code API.
- `tsconfig.webview.host-state.json` strictly checks the host-state boundary. The webview now rejects malformed init/update state before the legacy hydration path can mutate runtime state.
- `tsconfig.webview.state-model.json` strictly checks the pure projection from validated host state into the browser runtime model. The legacy bootstrap now consumes that model rather than mapping host fields ad hoc.
- `tsconfig.webview.status.json` strictly checks the status-card DOM adapter. Empty-state actions and error/status presentation no longer mutate DOM elements directly from the bootstrap.
- `tsconfig.webview.loading.json` strictly checks the loading DOM adapter. Overlay mode, progress text and accessibility attributes no longer mutate DOM elements directly from the legacy interaction wrapper.
- `tsconfig.webview.toolbar-busy.json` strictly checks the toolbar pending-state adapter. The legacy interaction wrapper still decides when controls are busy, but only the selected control now receives pending and accessibility attributes through the typed DOM boundary.
- `tsconfig.webview.search.json` strictly checks the pure search query module. Query normalization, visible-reference filtering, result ordering, active-result preservation and circular navigation no longer depend on the legacy interaction implementation.
- `tsconfig.webview.search-ui.json` strictly checks the search DOM adapter. Input value, result counter and disabled-state rendering no longer mutate controls directly from the legacy interaction implementation.
- `tsconfig.webview.search-highlights.json` strictly checks search-result highlighting. The CSS state of rendered nodes no longer mutates directly from the legacy interaction implementation.
- `tsconfig.webview.selection-highlights-ui.json` strictly checks primary selection CSS state. Reference and graph-node base/compare classes no longer mutate directly from the legacy interaction implementation.
- `tsconfig.webview.relationship-highlights.json` strictly checks selection relationship calculations. Ancestor/descendant sets, edge-path keys and comparison-selection state are now explicit data instead of ad hoc interaction logic.
- `tsconfig.webview.primary-path.json` strictly checks primary-path traversal. Directional maps, HEAD distances, compact ancestor paths and candidate scoring are no longer implemented through runtime globals.
- `tsconfig.webview.minimap-viewport-ui.json` strictly checks minimap viewport state. The visible-region rectangle and its minimap auto-scroll no longer mutate DOM elements directly from the legacy layout implementation.
- `tsconfig.webview.minimap-content.json` strictly checks minimap SVG generation. Edge and node markup, including head-node decoration and missing-node edge filtering, no longer originates in the legacy layout implementation.
- `tsconfig.webview.relationship-highlights-ui.json` strictly checks relationship highlighting in the DOM. Selection, ancestor/descendant and edge-path CSS classes no longer mutate from the legacy interaction implementation.

### Compatibility Boundary

The migrated browser source currently uses TypeScript's compatibility emission (`noCheck`) because the extracted legacy runtime exposes hundreds of real strict-mode issues across implicit DOM assumptions, mutable globals, and untyped message/state data. This is intentionally recorded as incomplete: externalization removes the template-string execution path, but it does not yet satisfy the goal of strict TypeScript protection for every runtime function.

Item 3 remains open until `noCheck` is removed, the browser target uses the DOM library with strict checks, and the legacy global scripts are replaced by typed runtime modules.

## Planned Modules

- `src/revisionGraph/webview/runtime/index.ts`: browser entrypoint and initialization.
- `src/revisionGraph/webview/runtime/runtime.ts`: runtime ownership and lifecycle coordination.
- `src/revisionGraph/webview/runtime/dom.ts`: typed element lookup and DOM surface contract.
- `src/revisionGraph/webview/runtime/state.ts`: explicit mutable browser state and persistence through `getState`/`setState`.
- `src/revisionGraph/webview/runtime/messages.ts`: typed outbound message construction and host-message dispatch.
- `src/revisionGraph/webview/runtime/interactions.ts`: toolbar, selection, context-menu, drag, search, and Flow Governance events.
- `src/revisionGraph/webview/runtime/graph.ts`: graph traversal and relationship highlighting.
- `src/revisionGraph/webview/runtime/layout.ts`: canvas, edge, minimap, viewport, and virtual-render behavior.
- `src/revisionGraph/webview/runtime/referenceTooltip.ts`: reference tooltip behavior and lazy commit-stat actions.
- `src/revisionGraph/webview/runtime/display.ts`: typed display helpers required by the graph runtime.

Module boundaries may be refined during extraction, but shared mutable state must remain owned by the runtime/state boundary rather than recreated as module globals.

## Implementation Plan

### 1. Establish the browser compilation boundary

- Add `tsconfig.webview.json` and build scripts for strict type checking plus browser-script emission into `out/webview/`.
- Update `clean`, `build`, `watch`, and test compilation so host and browser targets are deterministic from a clean checkout.
- Exclude the browser entrypoint from the host CommonJS compilation while allowing tests to compile browser modules for Node.
- Add a manifest/package test proving the compiled entrypoint is included in a VSIX-shaped file set; do not run packaging without maintainer approval.

Exit criteria: a minimal typed entrypoint compiles and is present after `npm run build`, with no dependency changes.

### 2. Wire a safe external webview asset

- Pass the extension URI or resolved runtime URI into the revision-graph controller instead of letting HTML rendering assume inline code.
- Resolve the compiled entrypoint with `webview.asWebviewUri`.
- Change `createScriptOnlyWebviewOptions` to accept the narrow compiled asset root and preserve `retainContextWhenHidden` for the editor panel.
- Change `renderRevisionGraphShellHtml` to receive the runtime URI and render a nonce-bearing `<script src="...">` tag.
- Extend CSP generation for the revision graph without weakening Compare Results or Show Log, which may continue using inline nonce scripts in this scope.

Exit criteria: the panel loads the minimal external module under the intended CSP, and HTML contains no inline revision-graph executable code.

### 3. Introduce typed runtime foundations

- Define the narrow `VsCodeApi<State, OutboundMessage>` interface required by the browser instead of using `any`.
- Add typed DOM lookup helpers that fail with actionable initialization errors for required elements and return optional elements only where the UI is genuinely optional.
- Move browser state into an explicit `RevisionGraphRuntimeState` owner.
- Type `window.message` as `unknown`, validate/narrow it to `RevisionGraphViewHostMessage`, and handle every message discriminant exhaustively.
- Make outbound posting accept only `RevisionGraphMessage`; replace loose message objects with typed builders or `satisfies` expressions.

Exit criteria: host/webview protocol drift is caught by TypeScript or boundary tests, and initialization no longer relies on implicit globals.

### 4. Migrate behavior in bounded slices

Migrate in this order so each slice can be tested before removing its string implementation:

1. Display helpers and outbound message builders.
2. Host-message handling, loading/error state, and state hydration.
3. Graph traversal and pure selection/search calculations.
4. Layout, viewport, edge routing, minimap, and virtual rendering.
5. Reference tooltip and lazy commit statistics.
6. Toolbar, context menus, drag/zoom, Git actions, and Flow Governance interactions.

For each slice:

- Convert functions to strict TypeScript with explicit inputs and return types.
- Prefer pure functions for graph/layout calculations and dependency injection for DOM/VS Code effects.
- Port the corresponding tests from string assertions or `vm` globals to direct module tests.
- Keep user-visible behavior and message payloads unchanged.

Exit criteria: each migrated slice has direct typed tests and no fallback to its old string renderer.

### 5. Remove the legacy string runtime

- Delete `src/revisionGraph/webview/script.ts` and the string-producing files under `src/revisionGraph/webview/script/` after feature parity is demonstrated.
- Remove revision-graph usage of `renderWebviewDisplayHelpers`; keep Show Log behavior unchanged unless extracting a shared pure helper is safe.
- Remove the inline-script extraction and `node:vm` harness from `test/revisionGraphWebview.test.ts`.
- Keep HTML tests focused on shell structure, CSP, asset URI, and accessibility hooks.

Exit criteria: no revision-graph browser function remains inside a template string, and repository search finds no legacy renderer symbols.

### 6. Release verification and handoff

- Run `npm run build`, `npm test`, `npm run benchmark:ci`, and `git diff --check`.
- Run `graphify update .` after code changes.
- Inspect the VSIX file list or package dry-run only after maintainer approval; confirm `out/webview/**` is included and sources/tests remain excluded.
- Execute the revision-graph section of the Extension Development Host smoke matrix: initial load, retained-panel reveal, repository switching, refresh, search, scope/options, minimap, tooltip, compare/diff/log, checkout/branch/tag, pull/push/sync, stash/reset/delete/merge guards, and Flow Governance controls.
- Update `project-context/3.deliver/release.md` with results, packaging evidence, known gaps, and rollback notes.

Exit criteria: automated verification passes, manual smoke records no runtime or CSP regression, and the packaged artifact contains the compiled module graph.

## Test Plan

- Compilation test: strict browser TypeScript target builds without Node/VS Code ambient globals.
- Protocol tests: every outbound builder produces a valid `RevisionGraphMessage`; every host message is exhaustively handled or safely rejected.
- Runtime initialization test: required DOM elements and the typed VS Code API are wired once.
- State tests: init/update, loading/error, remote-tag state, commit stats, and Flow Governance state transitions.
- Pure behavior tests: selection, ancestor/descendant paths, search, edge routing, viewport preservation, minimap projection, and virtual-render indexing.
- Interaction tests: existing actions post byte-for-byte compatible message payloads.
- HTML/security tests: external module URI, nonce, CSP source, no inline revision-graph script, and narrow resource roots.
- Build/package tests: clean build creates all expected assets and the release ignore rules do not exclude them.
- Regression tests: preserve the existing full suite and deterministic graph benchmark.

## Acceptance Criteria

- All revision-graph browser runtime source is strict TypeScript outside template strings.
- `npm run build` compiles both extension-host and browser targets from a clean `out/` directory.
- The browser target has DOM types but no accidental Node or `vscode` module dependency.
- Host-to-webview and webview-to-host payloads share discriminated protocol types and retain runtime boundary validation.
- The webview loads only the compiled asset root under CSP; no broad local resource access is introduced.
- The editor panel still restores retained state and handles zero-, single-, and multi-repository workspaces.
- Existing graph behavior and action payloads remain compatible.
- Tests exercise imported TypeScript modules rather than evaluating generated JavaScript strings.
- Compiled webview assets are present in the release artifact before publication.

## Risks and Mitigations

- CSP or URI regression prevents the panel from booting: land the minimal external entrypoint and Extension Development Host smoke before migrating behavior.
- Shared-global extraction changes call order: introduce one explicit runtime/state owner and migrate by bounded behavioral slices.
- ES-module path errors appear only after packaging: verify emitted imports and the packaged file list from a clean build.
- DOM typing becomes superficially permissive through casts: centralize lookup/narrowing and forbid `any` in the browser target.
- Protocol typing creates false confidence at runtime: retain validation at both `postMessage` boundaries.
- A large rewrite obscures regressions: require parity tests and removal of each legacy slice in the same change that replaces it.
- Build/watch divergence leaves stale assets: make both targets part of the standard scripts and test clean-build behavior.

## Rollback

Before publication, revert the external-asset wiring, browser tsconfig/build scripts, runtime modules, and migrated tests as one feature rollback. Do not leave HTML pointing at compiled assets that the build no longer produces. No repository data or Git state migration is involved.
