/**
 * The VS Code bridge is the only browser global not supplied by the standard
 * DOM library. Keeping it here prevents VS Code extension-host types from
 * leaking into the webview runtime.
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
  readonly sceneLayoutKey?: string;
  readonly nodeOffsets?: Record<string, number>;
}

type RevisionGraphRuntimeVsCodeApi = RevisionGraphWebviewApi<
  RevisionGraphWebviewPersistentState,
  RevisionGraphWebviewMessage
>;

declare function acquireVsCodeApi(): RevisionGraphRuntimeVsCodeApi;
