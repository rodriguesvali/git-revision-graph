/**
 * Browser globals are deliberately isolated from the extension-host target.
 * The runtime progressively replaces these compatibility surfaces with narrow
 * DOM adapters; no Node.js or VS Code extension API types leak into this build.
 */
interface RevisionGraphWebviewApi<
  State extends Record<string, unknown> = Record<string, unknown>,
  OutboundMessage = RevisionGraphWebviewMessage
> {
  getState(): State | undefined;
  setState(state: State): void;
  postMessage(message: OutboundMessage): boolean;
}

interface RevisionGraphWebviewPersistentState extends Record<string, unknown> {
  readonly showMinimap?: boolean;
  readonly nodeOffsets?: Record<string, { readonly x: number; readonly y: number }>;
}

type RevisionGraphRuntimeVsCodeApi = RevisionGraphWebviewApi<
  RevisionGraphWebviewPersistentState,
  RevisionGraphWebviewMessage
>;

declare function acquireVsCodeApi(): RevisionGraphRuntimeVsCodeApi;
declare const window: any;
declare const document: any;
declare const console: any;
declare const performance: any;
declare const requestAnimationFrame: any;
declare const cancelAnimationFrame: any;
declare const setTimeout: any;
declare const clearTimeout: any;
