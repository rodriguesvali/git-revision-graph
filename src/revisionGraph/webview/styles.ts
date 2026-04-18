import {
  NODE_MIN_WIDTH,
  STRUCTURAL_NODE_MIN_WIDTH,
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
      --panel: color-mix(in srgb, var(--vscode-editor-background) 95%, white 5%);
      --panel-strong: color-mix(in srgb, var(--panel) 92%, black 8%);
      --border: var(--vscode-panel-border);
      --muted: var(--vscode-descriptionForeground);
      --text: var(--vscode-editor-foreground);
      --accent: var(--vscode-focusBorder);
      --edge: color-mix(in srgb, var(--text) 84%, black 12%);
      --node-branch: #19d60f;
      --node-head: #d62828;
      --node-tag: #f7f300;
      --node-remote: #f6d8a8;
      --node-stash: #8c8f97;
      --node-mixed: color-mix(in srgb, var(--panel) 98%, white 2%);
      --node-text-dark: #181818;
      --workspace-clean: #2dff63;
      --workspace-dirty: #ff3b30;
      --toolbar-top-offset: 14px;
      --toolbar-safe-height: 108px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--text);
      background:
        linear-gradient(90deg, color-mix(in srgb, var(--text) 6%, transparent) 1px, transparent 1px) 0 0/52px 52px,
        linear-gradient(color-mix(in srgb, var(--text) 6%, transparent) 1px, transparent 1px) 0 0/52px 52px,
        var(--bg);
      font-family: var(--vscode-font-family);
      overflow: hidden;
    }
    body.loading {
      cursor: progress;
    }
    body.loading-subtle {
      cursor: progress;
    }
    button, select, input {
      border: 1px solid var(--border);
      background: var(--panel);
      color: var(--text);
      border-radius: 8px;
      padding: 6px 10px;
      transition:
        background 120ms ease,
        border-color 120ms ease,
        box-shadow 120ms ease,
        transform 80ms ease,
        opacity 120ms ease;
    }
    button, select {
      cursor: pointer;
    }
    button:disabled,
    select:disabled,
    input:disabled {
      opacity: 0.45;
      cursor: default;
    }
    button:not(:disabled):hover,
    select:not(:disabled):hover {
      border-color: color-mix(in srgb, var(--accent) 24%, var(--border));
      background: color-mix(in srgb, var(--panel-strong) 74%, var(--panel));
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    }
    button:not(:disabled):active,
    select:not(:disabled):active,
    [data-pending="true"] {
      transform: translateY(1px) scale(0.985);
      border-color: color-mix(in srgb, var(--accent) 38%, var(--border));
      background: color-mix(in srgb, var(--panel-strong) 86%, black 6%);
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.22);
    }
    button:focus-visible,
    select:focus-visible,
    input:focus-visible {
      outline: 2px solid color-mix(in srgb, var(--accent) 78%, white 8%);
      outline-offset: 2px;
    }
    [data-pending="true"] {
      opacity: 0.7;
      cursor: progress;
    }
    input::placeholder {
      color: color-mix(in srgb, var(--muted) 88%, transparent);
    }
    .viewport {
      position: relative;
      height: 100vh;
      overflow: auto;
      padding:
        calc(var(--toolbar-safe-height) + ${VIEWPORT_PADDING_TOP}px)
        ${VIEWPORT_PADDING_RIGHT}px
        ${VIEWPORT_PADDING_BOTTOM}px
        ${VIEWPORT_PADDING_LEFT}px;
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
      border-radius: 10px;
      padding: 18px 20px;
      background: color-mix(in srgb, var(--panel) 94%, var(--bg));
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.16);
      color: var(--text);
      z-index: 3;
    }
    .status-card[hidden] { display: none; }
    .status-card.error {
      border-color: color-mix(in srgb, #d62828 42%, var(--border));
    }
    .node {
      position: absolute; min-width: ${NODE_MIN_WIDTH}px; border-radius: 6px;
      border: 1px solid rgba(0, 0, 0, 0.22); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.16);
      color: var(--node-text-dark); cursor: inherit; user-select: none; overflow: hidden;
      transition: box-shadow 120ms ease, border-color 120ms ease, outline-color 120ms ease;
    }
    .viewport.dragging .node { cursor: grabbing; }
    .node.selected {
      outline: 3px solid color-mix(in srgb, var(--accent) 88%, white 10%);
      outline-offset: 2px;
      border-color: color-mix(in srgb, var(--accent) 62%, rgba(0, 0, 0, 0.18));
      box-shadow:
        0 0 0 3px color-mix(in srgb, var(--accent) 24%, transparent),
        0 8px 20px rgba(0, 0, 0, 0.24);
    }
    .node.related {
      outline-offset: 1px;
      border-color: color-mix(in srgb, var(--accent) 28%, rgba(0, 0, 0, 0.18));
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 16%, transparent);
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
    .node.search-match {
      border-color: color-mix(in srgb, var(--accent) 34%, rgba(0, 0, 0, 0.18));
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 16%, transparent);
    }
    .node.search-active {
      outline: 2px solid color-mix(in srgb, var(--accent) 88%, white 8%);
      outline-offset: 1px;
      border-color: color-mix(in srgb, var(--accent) 44%, rgba(0, 0, 0, 0.18));
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 18%, transparent);
    }
    .node.compare-target {
      outline: 3px dashed color-mix(in srgb, var(--accent) 82%, white 8%);
      outline-offset: 2px;
      box-shadow:
        0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent),
        0 8px 18px rgba(0, 0, 0, 0.2);
    }
    .node.selected.compare-target {
      outline-style: solid;
      outline-color: color-mix(in srgb, var(--accent) 92%, white 14%);
      box-shadow:
        0 0 0 4px color-mix(in srgb, var(--accent) 30%, transparent),
        0 10px 22px rgba(0, 0, 0, 0.26);
    }
    .node-head { background: var(--node-head); color: white; }
    .node-branch { background: var(--node-branch); }
    .node-tag { background: var(--node-tag); }
    .node-remote { background: var(--node-remote); }
    .node-stash { background: var(--node-stash); color: white; }
    .node-mixed { background: var(--node-mixed); }
    .graph-edge {
      transition: stroke 120ms ease, stroke-width 120ms ease, opacity 120ms ease;
      opacity: 0.96;
    }
    .graph-edge.related {
      stroke: color-mix(in srgb, var(--accent) 66%, white 10%);
      stroke-width: 2.6;
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
      padding: 6px 10px;
      font-family: var(--vscode-editor-font-family, monospace); font-size: 11px; line-height: 1.15;
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
    .ref-line.kind-stash {
      background: color-mix(in srgb, var(--node-stash) 92%, white 8%);
      color: white;
      font-weight: 700;
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
    body.loading-subtle .loading-overlay {
      opacity: 1;
      pointer-events: none;
      align-items: flex-start;
      justify-content: flex-end;
      padding:
        calc(var(--toolbar-safe-height) + 22px)
        24px
        24px
        24px;
      background: transparent;
      backdrop-filter: none;
    }
    .loading-card {
      min-width: 240px;
      max-width: min(360px, calc(100vw - 48px));
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: color-mix(in srgb, var(--panel) 94%, var(--bg));
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.16);
    }
    .loading-overlay[data-mode="subtle"] .loading-card {
      min-width: auto;
      max-width: min(320px, calc(100vw - 48px));
      padding: 10px 12px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--panel) 88%, transparent);
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
    }
    .loading-overlay[data-mode="subtle"] .loading-message {
      font-size: 12px;
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
      box-shadow: 0 3px 12px rgba(0, 0, 0, 0.18);
    }
    .node-grip {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 16px;
      height: 16px;
      border: 1px solid rgba(0, 0, 0, 0.12);
      border-radius: 5px;
      background: rgba(255, 255, 255, 0.08);
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
      opacity: 0;
      transition: opacity 120ms ease, background 120ms ease;
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
    .node:hover .node-grip,
    .node.selected .node-grip,
    .node.compare-target .node-grip,
    .node.dragging .node-grip {
      opacity: 1;
    }
    .node.selected .node-grip,
    .node.compare-target .node-grip {
      background: color-mix(in srgb, var(--accent) 16%, rgba(255, 255, 255, 0.08));
      border-color: color-mix(in srgb, var(--accent) 34%, rgba(0, 0, 0, 0.12));
    }
    .node-grip:hover {
      background: rgba(255, 255, 255, 0.16);
    }
    .node-grip:active,
    .node.dragging .node-grip {
      cursor: grabbing;
    }
    .workspace-led {
      position: relative;
      z-index: 1;
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
      top: var(--toolbar-top-offset);
      left: 14px;
      right: 14px;
      z-index: 70;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      width: auto;
      max-width: none;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: color-mix(in srgb, var(--panel) 94%, var(--bg));
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.14);
      backdrop-filter: blur(2px);
    }
    .view-controls label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--text);
      font-size: 12px;
      line-height: 1.2;
      flex: 0 1 auto;
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
    .view-controls .search-controls {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      flex: 1 1 360px;
      min-width: min(100%, 320px);
    }
    .view-controls .search-field {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex: 1 1 auto;
      min-width: 0;
    }
    .view-controls .search-input {
      min-width: 0;
      width: min(100%, 320px);
      flex: 1 1 auto;
      height: 32px;
      padding: 0 10px;
      font-size: 12px;
      line-height: 1;
    }
    .view-controls .search-result-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 68px;
      height: 32px;
      padding: 0 10px;
      border: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
      border-radius: 9px;
      background: color-mix(in srgb, var(--panel-strong) 76%, transparent);
      color: var(--muted);
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }
    .view-controls .toolbar-actions {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-left: auto;
      flex: 0 0 auto;
      max-width: 100%;
      flex-wrap: wrap;
      justify-content: flex-end;
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
    @media (max-width: 1100px) {
      :root {
        --toolbar-safe-height: 124px;
      }
    }
    @media (max-width: 820px) {
      :root {
        --toolbar-safe-height: 156px;
      }
    }
    .node-summary {
      padding: 5px 10px 6px;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 10.5px;
      line-height: 1.15;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: color-mix(in srgb, var(--node-text-dark) 88%, black 12%);
      font-weight: 600;
    }
    .node-base-badge {
      display: none;
      position: absolute;
      top: 50%;
      right: -8px;
      transform: translate(100%, -50%);
      align-items: center;
      padding: 2px 6px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--accent) 28%, white 72%);
      color: color-mix(in srgb, var(--text) 82%, black 18%);
      font-size: 9px;
      line-height: 1;
      font-weight: 700;
      pointer-events: none;
    }
    .node-structural {
      min-width: ${STRUCTURAL_NODE_MIN_WIDTH}px;
      background: color-mix(in srgb, var(--panel) 92%, #c6ccd8 8%);
      color: var(--node-text-dark);
      cursor: pointer;
      overflow: visible;
    }
    .node-structural.base-target.has-compare .node-base-badge {
      display: inline-flex;
    }
    .node-structural .node-summary {
      border-top: 0;
      padding-right: 24px;
    }
  </style>`;
}
