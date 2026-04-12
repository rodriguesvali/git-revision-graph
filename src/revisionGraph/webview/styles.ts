import {
  NODE_MIN_WIDTH,
  VIEWPORT_PADDING_BOTTOM,
  VIEWPORT_PADDING_LEFT,
  VIEWPORT_PADDING_RIGHT,
  VIEWPORT_PADDING_TOP
} from './shared';

const DEFAULT_CANVAS_WIDTH = 880;
const DEFAULT_CANVAS_HEIGHT = 480;

export function renderRevisionGraphStyles(): string {
  return `<style>
    :root {
      color-scheme: light dark;
      --bg: var(--vscode-editor-background);
      --panel: color-mix(in srgb, var(--vscode-editor-background) 92%, var(--vscode-sideBar-background));
      --panel-strong: color-mix(in srgb, var(--panel) 80%, black 6%);
      --border: var(--vscode-panel-border);
      --muted: var(--vscode-descriptionForeground);
      --text: var(--vscode-editor-foreground);
      --accent: var(--vscode-focusBorder);
      --edge: color-mix(in srgb, var(--text) 55%, transparent);
      --node-branch: #ffd79a;
      --node-head: #d62828;
      --node-tag: #f7f300;
      --node-remote: #f6d8a8;
      --node-mixed: color-mix(in srgb, var(--panel) 94%, white 6%);
      --node-text-dark: #181818;
      --workspace-clean: #2dff63;
      --workspace-dirty: #ff3b30;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--text);
      background:
        linear-gradient(90deg, color-mix(in srgb, var(--accent) 5%, transparent) 1px, transparent 1px) 0 0/44px 44px,
        linear-gradient(color-mix(in srgb, var(--accent) 5%, transparent) 1px, transparent 1px) 0 0/44px 44px,
        radial-gradient(circle at top left, color-mix(in srgb, var(--accent) 12%, transparent), transparent 28%),
        var(--bg);
      font-family: var(--vscode-font-family);
      overflow: hidden;
    }
    body.loading {
      cursor: progress;
    }
    button, select {
      border: 1px solid var(--border);
      background: var(--panel);
      color: var(--text);
      border-radius: 8px;
      padding: 6px 10px;
      cursor: pointer;
    }
    button:disabled { opacity: 0.45; cursor: default; }
    .viewport {
      position: relative;
      height: 100vh;
      overflow: auto;
      padding: ${VIEWPORT_PADDING_TOP}px ${VIEWPORT_PADDING_RIGHT}px ${VIEWPORT_PADDING_BOTTOM}px ${VIEWPORT_PADDING_LEFT}px;
      cursor: grab;
    }
    .viewport.dragging {
      cursor: grabbing;
      user-select: none;
    }
    body.node-dragging,
    body.node-dragging * {
      cursor: grabbing !important;
    }
    .canvas { position: relative; width: ${DEFAULT_CANVAS_WIDTH}px; height: ${DEFAULT_CANVAS_HEIGHT}px; transform-origin: top left; }
    .scene-layer { position: absolute; width: ${DEFAULT_CANVAS_WIDTH}px; height: ${DEFAULT_CANVAS_HEIGHT}px; transform-origin: top left; }
    svg { position: absolute; inset: 0; overflow: visible; }
    .node-layer { position: absolute; inset: 0; }
    .status-card {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      min-width: min(420px, calc(100vw - 48px));
      max-width: min(520px, calc(100vw - 48px));
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 18px 20px;
      background: color-mix(in srgb, var(--panel) 94%, var(--bg));
      box-shadow: 0 18px 36px rgba(0, 0, 0, 0.22);
      color: var(--text);
      z-index: 3;
    }
    .status-card[hidden] { display: none; }
    .status-card.error {
      border-color: color-mix(in srgb, #d62828 42%, var(--border));
    }
    .node {
      position: absolute; min-width: ${NODE_MIN_WIDTH}px; border-radius: 10px;
      border: 1px solid rgba(0, 0, 0, 0.18); box-shadow: 0 7px 18px rgba(0, 0, 0, 0.12);
      color: var(--node-text-dark); cursor: inherit; user-select: none; overflow: hidden;
      transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease, outline-color 120ms ease;
    }
    .viewport.dragging .node { cursor: grabbing; }
    .node:hover { transform: translateY(-1px); }
    .node.selected {
      outline: 3px solid color-mix(in srgb, var(--accent) 60%, transparent);
      outline-offset: 1px;
      border-color: color-mix(in srgb, var(--accent) 42%, rgba(0, 0, 0, 0.18));
      box-shadow: 0 12px 26px rgba(0, 0, 0, 0.18), 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
    }
    .node.related {
      outline-offset: 1px;
      border-color: color-mix(in srgb, var(--accent) 28%, rgba(0, 0, 0, 0.18));
      box-shadow: 0 10px 22px rgba(0, 0, 0, 0.15), 0 0 0 2px color-mix(in srgb, var(--accent) 14%, transparent);
    }
    .node.related.ancestor-related {
      outline: 2px solid color-mix(in srgb, var(--accent) 46%, var(--text) 18%);
    }
    .node.related.descendant-related {
      outline: 2px solid color-mix(in srgb, var(--accent) 68%, white 10%);
    }
    .node.related.ancestor-related.descendant-related {
      outline: 2px solid color-mix(in srgb, var(--accent) 58%, white 12%);
    }
    .node-head { background: var(--node-head); color: white; }
    .node-branch { background: var(--node-branch); }
    .node-tag { background: var(--node-tag); }
    .node-remote { background: var(--node-remote); }
    .node-mixed { background: var(--node-mixed); }
    .graph-edge {
      transition: stroke 120ms ease, stroke-width 120ms ease, opacity 120ms ease;
    }
    .graph-edge.related {
      stroke: color-mix(in srgb, var(--accent) 66%, white 10%);
      stroke-width: 3.4;
      opacity: 1;
    }
    .graph-edge.related.ancestor-path {
      stroke: color-mix(in srgb, var(--accent) 58%, var(--text) 16%);
    }
    .graph-edge.related.descendant-path {
      stroke: color-mix(in srgb, var(--accent) 78%, white 8%);
    }
    .graph-edge.muted {
      opacity: 0.18;
    }
    .ref-line {
      padding: 8px 12px;
      font-family: var(--vscode-editor-font-family, monospace); font-size: 12px; line-height: 1.25;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;
    }
    .ref-line + .ref-line {
      border-top: 1px solid rgba(0, 0, 0, 0.08);
    }
    .ref-line.kind-head {
      background: color-mix(in srgb, var(--node-head) 92%, white 8%);
      color: white;
      font-weight: 700;
    }
    .ref-line.kind-branch {
      background: color-mix(in srgb, var(--node-branch) 88%, white 12%);
    }
    .ref-line.kind-tag {
      background: color-mix(in srgb, var(--node-tag) 90%, white 10%);
      font-weight: 700;
    }
    .ref-line.kind-remote {
      background: color-mix(in srgb, var(--node-remote) 88%, white 12%);
    }
    .ref-line.base { box-shadow: inset 4px 0 0 rgba(0, 0, 0, 0.55); font-weight: 700; }
    .ref-line.compare { box-shadow: inset 4px 0 0 rgba(0, 0, 0, 0.25); text-decoration: underline; }
    .base-suffix { display: none; }
    .ref-line.base.has-compare .base-suffix { display: inline; }
    .context-menu {
      position: fixed;
      z-index: 60;
      min-width: 220px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: color-mix(in srgb, var(--bg) 96%, var(--panel));
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
      padding: 6px;
      display: none;
    }
    .context-menu.open { display: block; }
    .context-item {
      width: 100%;
      text-align: left;
      border: 0;
      background: transparent;
      color: var(--text);
      border-radius: 8px;
      padding: 8px 10px;
      cursor: pointer;
    }
    .context-item:hover { background: color-mix(in srgb, var(--accent) 12%, transparent); }
    .context-item:disabled { opacity: 0.45; cursor: default; }
    .loading-overlay {
      position: fixed;
      inset: 0;
      z-index: 80;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: color-mix(in srgb, var(--bg) 72%, transparent);
      backdrop-filter: blur(3px);
      opacity: 0;
      pointer-events: none;
      transition: opacity 120ms ease;
    }
    body.loading .loading-overlay {
      opacity: 1;
      pointer-events: auto;
    }
    .loading-card {
      min-width: 240px;
      max-width: min(360px, calc(100vw - 48px));
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: color-mix(in srgb, var(--panel) 94%, var(--bg));
      box-shadow: 0 16px 32px rgba(0, 0, 0, 0.22);
    }
    .loading-spinner {
      width: 18px;
      height: 18px;
      flex: 0 0 auto;
      border-radius: 999px;
      border: 2px solid color-mix(in srgb, var(--accent) 18%, transparent);
      border-top-color: var(--accent);
      border-right-color: color-mix(in srgb, var(--accent) 74%, transparent);
      animation: graph-spin 0.78s linear infinite;
    }
    .loading-message {
      color: var(--text);
      font-size: 13px;
      line-height: 1.35;
    }
    @keyframes graph-spin {
      to { transform: rotate(360deg); }
    }
    .node.dragging {
      box-shadow: 0 14px 30px rgba(0, 0, 0, 0.18);
      transform: translateY(-1px);
    }
    .node-grip {
      position: absolute;
      top: 6px;
      right: 6px;
      width: 22px;
      height: 22px;
      border: 1px solid rgba(0, 0, 0, 0.12);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.18);
      color: inherit;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      padding: 0;
      line-height: 0;
      appearance: none;
      -webkit-appearance: none;
      z-index: 2;
    }
    .node-grip::before {
      content: '';
      width: 2px;
      height: 2px;
      border-radius: 999px;
      opacity: 0.55;
      box-shadow:
        -3px -4px 0 currentColor,
        3px -4px 0 currentColor,
        -3px 0 0 currentColor,
        3px 0 0 currentColor,
        -3px 4px 0 currentColor,
        3px 4px 0 currentColor;
    }
    .node-grip:hover {
      background: rgba(255, 255, 255, 0.28);
    }
    .node-grip:active,
    .node.dragging .node-grip {
      cursor: grabbing;
    }
    .workspace-led {
      position: fixed;
      top: 14px;
      right: 44px;
      z-index: 70;
      width: 30px;
      height: 30px;
      padding: 0;
      border-radius: 999px;
      border: 1px solid color-mix(in srgb, var(--bg) 30%, black 28%);
      background: var(--workspace-clean);
      box-shadow:
        0 0 0 2px color-mix(in srgb, var(--bg) 78%, transparent),
        0 0 20px color-mix(in srgb, var(--workspace-clean) 62%, transparent),
        inset 0 1px 2px rgba(255, 255, 255, 0.35);
      appearance: none;
      -webkit-appearance: none;
      transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
    }
    .workspace-led.clean {
      cursor: default;
    }
    .workspace-led.dirty {
      background: var(--workspace-dirty);
      box-shadow:
        0 0 0 2px color-mix(in srgb, var(--bg) 78%, transparent),
        0 0 22px color-mix(in srgb, var(--workspace-dirty) 68%, transparent),
        inset 0 1px 2px rgba(255, 255, 255, 0.25);
      cursor: pointer;
      animation: workspace-led-pulse 1.7s ease-in-out infinite;
    }
    .workspace-led.dirty:hover {
      transform: scale(1.08);
    }
    .workspace-led:focus-visible {
      outline: 2px solid color-mix(in srgb, var(--accent) 78%, white 8%);
      outline-offset: 3px;
    }
    @keyframes workspace-led-pulse {
      0%, 100% {
        box-shadow:
          0 0 0 2px color-mix(in srgb, var(--bg) 78%, transparent),
          0 0 18px color-mix(in srgb, var(--workspace-dirty) 58%, transparent),
          inset 0 1px 2px rgba(255, 255, 255, 0.24);
      }
      50% {
        box-shadow:
          0 0 0 2px color-mix(in srgb, var(--bg) 78%, transparent),
          0 0 30px color-mix(in srgb, var(--workspace-dirty) 82%, transparent),
        inset 0 1px 2px rgba(255, 255, 255, 0.32);
      }
    }
    .view-controls {
      position: fixed;
      top: 14px;
      left: 14px;
      z-index: 70;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      max-width: min(calc(100vw - 108px), 860px);
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: color-mix(in srgb, var(--panel) 94%, var(--bg));
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.22);
      backdrop-filter: blur(4px);
    }
    .view-controls label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--text);
      font-size: 12px;
      line-height: 1.2;
    }
    .view-controls .control-caption {
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-size: 10px;
      font-weight: 700;
    }
    .view-controls select {
      min-width: 152px;
      padding-right: 28px;
    }
    .view-controls input[type="checkbox"] {
      margin: 0;
    }
    .view-controls .toolbar-actions {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-left: auto;
    }
    .view-controls .toolbar-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-width: 32px;
      height: 32px;
      padding: 0 10px;
      border-radius: 9px;
      font-size: 12px;
      line-height: 1;
      font-weight: 600;
    }
    .view-controls .toolbar-button.icon-only {
      width: 32px;
      min-width: 32px;
      padding: 0;
      font-size: 16px;
      font-weight: 700;
    }
    .view-controls .toolbar-button .button-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 12px;
      font-size: 15px;
      line-height: 1;
    }
    .node-summary {
      padding: 10px 12px 12px;
      border-top: 1px solid rgba(0, 0, 0, 0.08);
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 11px;
      line-height: 1.35;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: color-mix(in srgb, var(--node-text-dark) 88%, black 12%);
    }
    .node-structural {
      background: color-mix(in srgb, var(--panel) 88%, white 10%);
      color: var(--node-text-dark);
    }
  </style>`;
}
