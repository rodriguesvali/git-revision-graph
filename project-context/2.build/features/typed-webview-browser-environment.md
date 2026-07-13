# Typed Webview Browser Environment

## Goal

Restore compile-time safety for browser globals used by the revision graph webview without leaking extension-host or Node.js types into the runtime.

## Scope

- Remove ambient `any` declarations for standard browser globals.
- Use TypeScript's standard `DOM` library types for window, document, events, animation frames, timers, console, and performance.
- Retain a narrow ambient declaration only for VS Code's `acquireVsCodeApi()` bridge.
- Keep the existing required-element assertion localized in its DOM adapter.

## Acceptance Criteria

- The complete webview runtime compiles against `ES2022` and `DOM` with strict mode.
- API-only and state-only type-check targets continue compiling without DOM dependencies.
- No standard browser global is redeclared in `environment.d.ts`.
- `acquireVsCodeApi()` remains typed with the revision graph message and persistent-state contracts.
- Build and tests pass.

## Risk

The stronger types may expose assumptions in future browser-runtime changes. This is intentional: new DOM capabilities should be represented by the standard library or a narrow adapter instead of an ambient `any` escape hatch.
