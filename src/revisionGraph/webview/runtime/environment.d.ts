/**
 * Browser globals are deliberately isolated from the extension-host target.
 * The runtime progressively replaces these compatibility surfaces with narrow
 * DOM adapters; no Node.js or VS Code extension API types leak into this build.
 */
interface RevisionGraphWebviewApi {
  getState(): Record<string, unknown> | undefined;
  setState(state: Record<string, unknown>): void;
  postMessage(message: unknown): void;
}

declare function acquireVsCodeApi(): RevisionGraphWebviewApi;
declare const window: any;
declare const document: any;
declare const console: any;
declare const performance: any;
declare const requestAnimationFrame: any;
declare const cancelAnimationFrame: any;
declare const setTimeout: any;
declare const clearTimeout: any;
