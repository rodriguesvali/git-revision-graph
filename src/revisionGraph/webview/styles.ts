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
      --workspace-dirty: #ff3b30;
      --toolbar-top-offset: 0px;
      --toolbar-safe-height: 56px;
      --graph-top-offset: calc(var(--toolbar-safe-height) + 1px);
      --viewport-scrollbar-gutter-right: 15px;
      --viewport-scrollbar-gutter-bottom: 13px;
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
      position: fixed;
      top: var(--graph-top-offset);
      right: 0;
      bottom: 0;
      left: 0;
      overflow: auto;
      padding:
        ${VIEWPORT_PADDING_TOP}px
        ${VIEWPORT_PADDING_RIGHT}px
        ${VIEWPORT_PADDING_BOTTOM}px
        ${VIEWPORT_PADDING_LEFT}px;
      cursor: default;
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
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: flex-start;
    }
    .status-card[hidden] { display: none; }
    .status-card.error {
      border-color: color-mix(in srgb, #d62828 42%, var(--border));
    }
    .status-message {
      line-height: 1.45;
    }
    .status-action {
      min-height: 30px;
      border-radius: 7px;
      padding: 5px 10px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-color: var(--vscode-button-border, transparent);
    }
    .status-action:hover {
      background: var(--vscode-button-hoverBackground);
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
      display: flex;
      align-items: center;
      gap: 6px;
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
    .ref-line .ref-name {
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .flow-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      min-width: 28px;
      height: 16px;
      padding: 0 4px;
      border-radius: 3px;
      border: 1px solid rgba(0, 0, 0, 0.24);
      background: color-mix(in srgb, var(--panel) 84%, white 16%);
      color: var(--node-text-dark);
      font-family: var(--vscode-font-family);
      font-size: 9px;
      font-weight: 700;
      line-height: 1;
      text-transform: uppercase;
    }
    .flow-badge.flow-kind-main { background: color-mix(in srgb, var(--node-head) 82%, white 18%); color: white; }
    .flow-badge.flow-kind-release { background: #42b883; color: #101414; }
    .flow-badge.flow-kind-sync { background: #8c8f97; color: white; }
    .flow-badge.flow-kind-package { background: #4aa3ff; color: #07131f; }
    .flow-badge.flow-kind-feature { background: #19d60f; color: #102010; }
    .flow-badge.flow-kind-task { background: #f0c34e; color: #1f1804; }
    .flow-badge.flow-kind-bug { background: #ff7a59; color: #1f0803; }
    .flow-badge.flow-kind-hotfix { background: #d62828; color: white; }
    .flow-badge.flow-kind-unknown { background: color-mix(in srgb, var(--muted) 82%, var(--panel)); color: var(--text); }
    .context-menu {
      position: fixed;
      z-index: 60;
      width: 250px;
      max-width: calc(100vw - 16px);
      border: 1px solid var(--border);
      border-radius: 10px;
      background: color-mix(in srgb, var(--bg) 96%, var(--panel));
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
      padding: 6px;
      display: none;
    }
    .context-menu.open { display: block; }
    .reload-cache-menu {
      position: fixed;
      z-index: 90;
      min-width: 168px;
      max-width: calc(100vw - 16px);
      padding: 4px;
      border: 1px solid var(--border);
      border-radius: 4px;
      background: color-mix(in srgb, var(--bg) 96%, var(--panel));
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
    }
    .reload-cache-menu[hidden] {
      display: none;
    }
    .reload-cache-menu-button {
      width: 100%;
      min-height: 28px;
      padding: 5px 8px;
      border: 0;
      border-radius: 3px;
      background: transparent;
      color: var(--text);
      text-align: left;
      cursor: pointer;
    }
    .reload-cache-menu-button:hover,
    .reload-cache-menu-button:focus-visible {
      outline: none;
      background: color-mix(in srgb, var(--accent) 12%, transparent);
    }
    .context-menu-item {
      width: 100%;
      text-align: left;
      border: 0;
      background: transparent;
      color: var(--text);
      border-radius: 8px;
      padding: 8px 10px;
      cursor: pointer;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .context-menu-item.primary {
      font-weight: 700;
    }
    .context-menu-item.destructive {
      color: var(--vscode-errorForeground);
    }
    .context-menu-item:not(:disabled):hover,
    .context-menu-item:not(:disabled):focus-visible {
      outline: none;
      background: color-mix(in srgb, var(--accent) 12%, transparent);
    }
    .context-menu-item:disabled { opacity: 0.45; cursor: default; }
    .context-menu-submenu {
      position: relative;
    }
    .context-submenu-trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .context-menu-label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .context-menu-chevron {
      flex: 0 0 auto;
      color: var(--muted);
    }
    .context-submenu {
      position: fixed;
      z-index: 61;
      width: 220px;
      max-width: calc(100vw - 16px);
      border: 1px solid var(--border);
      border-radius: 10px;
      background: color-mix(in srgb, var(--bg) 96%, var(--panel));
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
      padding: 6px;
      display: none;
    }
    .context-menu-submenu.open > .context-submenu {
      display: block;
    }
    .context-separator {
      height: 1px;
      margin: 6px 4px;
      background: color-mix(in srgb, var(--border) 72%, transparent);
    }
    .flow-dialog-backdrop {
      position: fixed;
      inset: 0;
      z-index: 75;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: color-mix(in srgb, var(--bg) 58%, transparent);
    }
    .flow-dialog-backdrop[hidden] {
      display: none;
    }
    .flow-dialog {
      width: min(380px, calc(100vw - 40px));
      padding: 16px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: color-mix(in srgb, var(--bg) 96%, var(--panel));
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.34);
    }
    .flow-dialog-title {
      margin: 0 0 14px;
      color: var(--text);
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0;
    }
    .flow-form-field {
      display: grid;
      gap: 6px;
      margin-bottom: 12px;
    }
    .flow-form-label {
      color: var(--muted);
      font-size: 12px;
    }
    .flow-form-input {
      width: 100%;
      min-width: 0;
      border: 1px solid var(--border);
      border-radius: 5px;
      background: var(--panel);
      color: var(--text);
      padding: 7px 8px;
      font: inherit;
    }
    .flow-form-input:focus {
      outline: 1px solid var(--accent);
      outline-offset: 1px;
    }
    .flow-form-textarea {
      min-height: 76px;
      resize: vertical;
    }
    .flow-form-error {
      margin: 0 0 12px;
      color: var(--vscode-errorForeground);
      font-size: 12px;
    }
    .flow-dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .flow-dialog-button {
      min-height: 28px;
      border: 1px solid var(--border);
      border-radius: 5px;
      background: transparent;
      color: var(--text);
      padding: 5px 10px;
      cursor: pointer;
    }
    .flow-dialog-button:hover,
    .flow-dialog-button:focus-visible {
      outline: none;
      background: color-mix(in srgb, var(--accent) 12%, transparent);
    }
    .flow-dialog-button.primary {
      border-color: color-mix(in srgb, var(--accent) 72%, var(--border));
      background: color-mix(in srgb, var(--accent) 22%, transparent);
    }
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
    .view-controls {
      position: fixed;
      top: var(--toolbar-top-offset);
      left: 0;
      right: 0;
      z-index: 70;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      width: auto;
      max-width: none;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: 0;
      background: color-mix(in srgb, var(--panel) 94%, var(--bg));
      box-shadow: none;
      backdrop-filter: none;
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
      border-radius: 0;
    }
    .view-controls input[type="checkbox"] {
      margin: 0;
    }
    .view-options {
      position: relative;
      display: inline-flex;
      flex: 0 0 auto;
    }
    .view-options-menu {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      z-index: 80;
      min-width: 220px;
      display: flex;
      flex-direction: column;
      gap: 9px;
      padding: 10px;
      border: 1px solid var(--border);
      border-radius: 9px;
      background: color-mix(in srgb, var(--bg) 96%, var(--panel));
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.24);
    }
    .view-options-menu[hidden] {
      display: none;
    }
    .view-options-menu label {
      justify-content: flex-start;
      width: 100%;
    }
    .view-options-section {
      display: flex;
      flex-direction: column;
      gap: 9px;
      margin-top: 2px;
      padding-top: 9px;
      border-top: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
    }
    .view-options-section[hidden] {
      display: none;
    }
    .view-controls .search-controls {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      flex: 1 1 360px;
      min-width: min(100%, 320px);
      max-width: 560px;
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
      border-radius: 0;
      border-color: transparent;
      background: transparent;
      font-size: 12px;
      line-height: 1;
    }
    .view-controls .search-input:not(:disabled):hover {
      border-color: color-mix(in srgb, var(--accent) 18%, transparent);
      background: color-mix(in srgb, var(--accent) 8%, transparent);
      box-shadow: none;
    }
    .view-controls .search-input:focus-visible {
      outline-offset: -2px;
      border-color: color-mix(in srgb, var(--accent) 44%, transparent);
      background: color-mix(in srgb, var(--panel) 62%, transparent);
    }
    .view-controls .search-result-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 68px;
      height: 32px;
      padding: 0 10px;
      border: 1px solid transparent;
      border-radius: 0;
      background: transparent;
      color: var(--muted);
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }
    .view-controls .range-filter {
      display: inline-flex;
      align-items: center;
      gap: 0;
      min-width: 0;
      max-width: min(320px, 100%);
      height: 34px;
      padding: 2px;
      border: 1px solid color-mix(in srgb, var(--accent) 58%, var(--border));
      border-radius: 0;
      background: color-mix(in srgb, var(--panel) 86%, var(--accent) 14%);
      box-shadow: inset 3px 0 0 color-mix(in srgb, var(--accent) 88%, var(--text) 12%);
      color: var(--text);
    }
    .view-controls .range-filter[hidden] {
      display: none;
    }
    .view-controls .range-filter-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 30px;
      width: 30px;
      height: 24px;
      color: color-mix(in srgb, var(--accent) 78%, var(--text) 22%);
    }
    .view-controls .range-filter-copy {
      display: inline-flex;
      align-items: baseline;
      gap: 6px;
      min-width: 0;
      padding-right: 8px;
    }
    .view-controls .range-filter-caption {
      flex: 0 0 auto;
      color: var(--muted);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .view-controls .range-filter-label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      font-weight: 600;
    }
    .view-controls .range-filter .toolbar-button {
      width: 28px;
      min-width: 28px;
      height: 28px;
      border-color: transparent;
      background: transparent;
      box-shadow: none;
    }
    .view-controls .range-filter .toolbar-button:not(:disabled):hover {
      border-color: color-mix(in srgb, var(--accent) 30%, transparent);
      background: color-mix(in srgb, var(--accent) 16%, transparent);
      box-shadow: none;
    }
    .view-controls .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 0 0 auto;
      max-width: 100%;
      flex-wrap: wrap;
      justify-content: flex-start;
    }
    .view-controls .toolbar-action-slot {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      height: 34px;
      padding: 2px;
      border: 1px solid color-mix(in srgb, var(--border) 86%, transparent);
      border-radius: 0;
      background: color-mix(in srgb, var(--panel-strong) 52%, transparent);
    }
    .view-controls .toolbar-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-width: 32px;
      height: 32px;
      padding: 0 10px;
      border-radius: 0;
      font-size: 12px;
      line-height: 1;
      font-weight: 600;
    }
    .view-controls .toolbar-button[hidden] {
      display: none;
    }
    .view-controls .toolbar-button.icon-only {
      width: 32px;
      min-width: 32px;
      padding: 0;
      font-size: 15px;
      font-weight: 700;
    }
    .view-controls .toolbar-split-button {
      display: inline-flex;
      align-items: center;
      height: 32px;
      gap: 0;
    }
    .view-controls .toolbar-split-button .split-primary {
      width: 30px;
      min-width: 30px;
    }
    .view-controls .toolbar-split-button .split-menu {
      width: 20px;
      min-width: 20px;
      border-left: 1px solid color-mix(in srgb, var(--border) 62%, transparent);
      color: var(--muted);
    }
    .view-controls .toolbar-split-button .split-menu .toolbar-icon {
      width: 12px;
      height: 12px;
      stroke-width: 1.65;
    }
    .view-controls .toolbar-action-slot .toolbar-button {
      border-color: transparent;
      background: transparent;
      box-shadow: none;
    }
    .view-controls .toolbar-action-slot .toolbar-split-button .split-menu {
      border-left-color: color-mix(in srgb, var(--border) 62%, transparent);
    }
    .view-controls .toolbar-action-slot .toolbar-button:not(:disabled):hover {
      border-color: color-mix(in srgb, var(--accent) 26%, transparent);
      background: color-mix(in srgb, var(--accent) 12%, transparent);
      box-shadow: none;
    }
    .view-controls .zoom-action-slot {
      flex: 0 0 auto;
    }
    .view-controls .toolbar-button .button-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 12px;
      font-size: 15px;
      line-height: 1;
    }
    .view-controls .toolbar-icon {
      position: static;
      inset: auto;
      width: 16px;
      height: 16px;
      display: block;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.35;
      overflow: visible;
    }
    .graph-minimap {
      position: fixed;
      right: calc(10px + var(--viewport-scrollbar-gutter-right));
      bottom: calc(10px + var(--viewport-scrollbar-gutter-bottom));
      z-index: 64;
      width: 180px;
      height: 240px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: color-mix(in srgb, var(--panel) 88%, var(--bg));
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      overflow: auto;
      cursor: pointer;
      backdrop-filter: blur(2px);
      scrollbar-width: thin;
      scrollbar-color: color-mix(in srgb, var(--accent) 52%, transparent) transparent;
    }
    .minimap-controls {
      position: sticky;
      top: 6px;
      left: 6px;
      z-index: 2;
      display: flex;
      justify-content: flex-start;
      gap: 4px;
      width: max-content;
      margin: 6px auto -32px 6px;
      pointer-events: auto;
    }
    .minimap-zoom-button {
      width: 24px;
      height: 24px;
      min-width: 24px;
      padding: 0;
      border-radius: 6px;
      font-weight: 700;
      line-height: 1;
      background: color-mix(in srgb, var(--panel) 94%, var(--bg));
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
    }
    .graph-minimap[hidden] {
      display: none;
    }
    .graph-minimap:focus-visible {
      outline: 2px solid color-mix(in srgb, var(--accent) 78%, white 8%);
      outline-offset: 2px;
    }
    .graph-minimap svg {
      position: static;
      display: block;
      overflow: hidden;
    }
    .minimap-edge {
      stroke: color-mix(in srgb, var(--text) 50%, transparent);
      stroke-width: 1;
      stroke-linecap: round;
      opacity: 0.56;
    }
    .minimap-node {
      fill: color-mix(in srgb, var(--accent) 68%, var(--panel));
      opacity: 0.82;
    }
    .minimap-node.head {
      fill: var(--node-head);
      opacity: 0.92;
    }
    .minimap-viewport {
      fill: color-mix(in srgb, var(--accent) 16%, transparent);
      stroke: color-mix(in srgb, var(--accent) 86%, white 8%);
      stroke-width: 1.5;
      vector-effect: non-scaling-stroke;
    }
    @media (max-width: 1100px) {
      :root {
        --toolbar-safe-height: 96px;
      }
    }
    @media (max-width: 620px) {
      .graph-minimap {
        width: 140px;
        height: 184px;
      }
    }
    @media (max-width: 820px) {
      :root {
        --toolbar-safe-height: 120px;
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
      right: -10px;
      transform: translate(100%, -50%);
      align-items: center;
      padding: 3px 8px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--accent) 28%, white 72%);
      color: color-mix(in srgb, var(--text) 82%, black 18%);
      font-size: 10.5px;
      line-height: 1.1;
      font-weight: 700;
      letter-spacing: 0.01em;
      pointer-events: none;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
    }
    .node.base-target.has-compare {
      overflow: visible;
    }
    .node-structural {
      min-width: ${STRUCTURAL_NODE_MIN_WIDTH}px;
      background: color-mix(in srgb, var(--panel) 92%, #c6ccd8 8%);
      color: var(--node-text-dark);
      cursor: pointer;
      overflow: visible;
    }
    .node.base-target.has-compare .node-base-badge {
      display: inline-flex;
    }
    .node-structural .node-summary {
      border-top: 0;
      padding-right: 24px;
    }
  </style>`;
}
