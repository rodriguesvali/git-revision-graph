import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import * as vscode from 'vscode';

import { getStatusLabel } from './changePresentation';
import { Change, Repository, API, RefType } from './git';
import { EMPTY_SCHEME, REF_SCHEME } from './refContentProvider';
import { isSameRepositoryPath, reconcileCurrentRepository, sortRepositoriesByPath } from './repositorySelection';
import { getDiffChangeKinds, getDiffChangeUris } from './refCommands';
import {
  buildRevisionGraphScene,
  filterRevisionGraphCommitsToAncestors,
  getRevisionGraphGitFormat,
  parseRevisionGraphLog,
  RevisionGraphEdge,
  RevisionGraphNode,
  RevisionGraphRef,
  RevisionGraphScene
} from './revisionGraphData';

const execFile = promisify(execFileCallback);
const GRAPH_COMMIT_LIMIT = 600;
const LANE_WIDTH = 220;
const ROW_HEIGHT = 140;
const NODE_WIDTH = 180;
const NODE_PADDING_X = 26;
const NODE_PADDING_Y = 24;
const VIEWPORT_PADDING_TOP = 18;
const VIEWPORT_PADDING_RIGHT = 220;
const VIEWPORT_PADDING_BOTTOM = 18;
const VIEWPORT_PADDING_LEFT = 18;
const REVISION_GRAPH_VIEW_ID = 'gitRefs.revisionGraphView';

type RevisionGraphMessage =
  | { readonly type: 'refresh' }
  | { readonly type: 'choose-repository' }
  | { readonly type: 'filter-ancestor-refs'; readonly refName: string; readonly refKind: RevisionGraphRef['kind'] }
  | { readonly type: 'clear-ancestor-filter' }
  | { readonly type: 'compare-selected'; readonly baseRefName: string; readonly compareRefName: string }
  | { readonly type: 'show-log'; readonly baseRefName: string; readonly compareRefName: string }
  | { readonly type: 'open-unified-diff'; readonly baseRefName: string; readonly compareRefName: string }
  | { readonly type: 'compare-with-worktree'; readonly refName: string }
  | { readonly type: 'checkout'; readonly refName: string; readonly refKind: string }
  | { readonly type: 'delete'; readonly refName: string; readonly refKind: RevisionGraphRef['kind'] }
  | { readonly type: 'merge'; readonly refName: string };

interface RevisionGraphAncestorFilter {
  readonly refName: string;
  readonly refKind: RevisionGraphRef['kind'];
}

interface RevisionLogEntry {
  readonly hash: string;
  readonly shortHash: string;
  readonly author: string;
  readonly date: string;
  readonly subject: string;
}

interface RevisionLogQuickPickItem extends vscode.QuickPickItem {
  readonly entry: RevisionLogEntry;
}

export class RevisionGraphViewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  private view: vscode.WebviewView | undefined;
  private currentRepository: Repository | undefined;
  private ancestorFilter: RevisionGraphAncestorFilter | undefined;
  private readonly repoSubscriptions = new Map<string, vscode.Disposable>();
  private readonly disposables: vscode.Disposable[] = [];

  constructor(
    private readonly git: API
  ) {
    this.setCurrentRepository(reconcileCurrentRepository(git.repositories, undefined));
    this.attachToRepositories(git.repositories);

    this.disposables.push(
      git.onDidOpenRepository((repository) => {
        this.attachRepository(repository);
        this.handleRepositorySetChanged();
      }),
      git.onDidCloseRepository((repository) => {
        this.detachRepository(repository);
        this.handleRepositorySetChanged();
      })
    );
  }

  dispose(): void {
    for (const disposable of this.repoSubscriptions.values()) {
      disposable.dispose();
    }

    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  async resolveWebviewView(view: vscode.WebviewView): Promise<void> {
    this.view = view;
    view.webview.options = {
      enableScripts: true
    };

    view.onDidDispose(() => {
      if (this.view === view) {
        this.view = undefined;
      }
    });

    this.setCurrentRepository(reconcileCurrentRepository(this.git.repositories, this.currentRepository));

    if (!this.currentRepository) {
      this.setCurrentRepository(await pickRepository(this.git, false));
    }

    view.webview.onDidReceiveMessage(async (message: RevisionGraphMessage) => {
      switch (message.type) {
        case 'refresh':
          await this.render();
          return;
        case 'choose-repository':
          this.setCurrentRepository(await pickRepository(this.git, true));
          await this.render();
          return;
        case 'filter-ancestor-refs':
          this.ancestorFilter = {
            refName: message.refName,
            refKind: message.refKind
          };
          await this.render();
          return;
        case 'clear-ancestor-filter':
          this.ancestorFilter = undefined;
          await this.render();
          return;
        case 'compare-selected':
          if (this.currentRepository) {
            await compareRevisions(this.currentRepository, message.baseRefName, message.compareRefName);
          }
          return;
        case 'show-log':
          if (this.currentRepository) {
            await showRevisionLog(this.currentRepository, message.baseRefName, message.compareRefName);
          }
          return;
        case 'open-unified-diff':
          if (this.currentRepository) {
            await openUnifiedDiff(this.currentRepository, message.baseRefName, message.compareRefName);
          }
          return;
        case 'compare-with-worktree':
          if (this.currentRepository) {
            await compareRevisionWithWorktree(this.currentRepository, message.refName);
          }
          return;
        case 'checkout':
          if (this.currentRepository) {
            await checkoutReference(this.currentRepository, message.refName, message.refKind);
            await this.render();
          }
          return;
        case 'delete':
          if (this.currentRepository) {
            await deleteReference(this.currentRepository, message.refName, message.refKind);
            if (this.ancestorFilter?.refName === message.refName && this.ancestorFilter.refKind === message.refKind) {
              this.ancestorFilter = undefined;
            }
            await this.render();
          }
          return;
        case 'merge':
          if (this.currentRepository) {
            await mergeReferenceIntoHead(this.currentRepository, message.refName);
            await this.render();
          }
          return;
      }
    });

    await this.render();
  }

  async open(): Promise<void> {
    await vscode.commands.executeCommand(`${REVISION_GRAPH_VIEW_ID}.focus`);
    this.setCurrentRepository(reconcileCurrentRepository(this.git.repositories, this.currentRepository));
    if (!this.currentRepository) {
      this.setCurrentRepository(await pickRepository(this.git, false));
    }
    await this.render();
  }

  async chooseRepository(): Promise<void> {
    this.setCurrentRepository(await pickRepository(this.git, true));
    await this.open();
  }

  async refresh(): Promise<void> {
    await this.render();
  }

  private async render(): Promise<void> {
    if (!this.view) {
      return;
    }

    if (!this.currentRepository) {
      this.view.webview.html = renderEmptyHtml(this.git.repositories.length > 0);
      return;
    }

    try {
      const commits = await loadRevisionGraphCommits(this.currentRepository.rootUri.fsPath, GRAPH_COMMIT_LIMIT);
      const visibleCommits = this.ancestorFilter
        ? filterRevisionGraphCommitsToAncestors(commits, this.ancestorFilter.refName, this.ancestorFilter.refKind)
        : commits;
      const scene = buildRevisionGraphScene(visibleCommits.length > 0 ? visibleCommits : commits);
      this.view.webview.html = renderRevisionGraphHtml(
        vscode.workspace.asRelativePath(this.currentRepository.rootUri, false),
        scene,
        this.currentRepository.state.HEAD?.name,
        this.ancestorFilter
      );
    } catch (error) {
      this.view.webview.html = renderErrorHtml(toErrorMessage(error));
    }
  }

  private attachToRepositories(repositories: readonly Repository[]): void {
    for (const repository of repositories) {
      this.attachRepository(repository);
    }
  }

  private attachRepository(repository: Repository): void {
    const key = repository.rootUri.toString();
    if (this.repoSubscriptions.has(key)) {
      return;
    }

    this.repoSubscriptions.set(
      key,
      vscode.Disposable.from(
        repository.state.onDidChange(() => this.handleRepositoryStateChange(repository)),
        repository.onDidCheckout(() => this.handleRepositoryStateChange(repository))
      )
    );
  }

  private detachRepository(repository: Repository): void {
    const key = repository.rootUri.toString();
    this.repoSubscriptions.get(key)?.dispose();
    this.repoSubscriptions.delete(key);
  }

  private handleRepositorySetChanged(): void {
    this.setCurrentRepository(reconcileCurrentRepository(this.git.repositories, this.currentRepository));
    void this.render();
  }

  private handleRepositoryStateChange(repository: Repository): void {
    const previousRepository = this.currentRepository;
    this.setCurrentRepository(reconcileCurrentRepository(this.git.repositories, this.currentRepository));

    if (isSameRepositoryPath(repository, this.currentRepository) || (!previousRepository && this.currentRepository)) {
      void this.render();
    }
  }

  private setCurrentRepository(repository: Repository | undefined): void {
    if (!isSameRepositoryPath(this.currentRepository, repository)) {
      this.ancestorFilter = undefined;
    }

    this.currentRepository = repository;
  }
}

export { REVISION_GRAPH_VIEW_ID };

async function loadRevisionGraphCommits(repositoryPath: string, limit: number) {
  const { stdout } = await execFile(
    'git',
    [
      'log',
      '--all',
      '--topo-order',
      '--decorate=short',
      '--date=short',
      `--max-count=${limit}`,
      `--pretty=format:${getRevisionGraphGitFormat()}`
    ],
    {
      cwd: repositoryPath,
      maxBuffer: 8 * 1024 * 1024
    }
  );

  return parseRevisionGraphLog(stdout);
}

async function pickRepository(git: API, alwaysPrompt: boolean): Promise<Repository | undefined> {
  if (!alwaysPrompt && git.repositories.length === 1) {
    return git.repositories[0];
  }

  if (git.repositories.length === 0) {
    void vscode.window.showInformationMessage('No Git repository is open in the workspace.');
    return undefined;
  }

  const picked = await vscode.window.showQuickPick(
    sortRepositoriesByPath(git.repositories)
      .map((repository) => ({
        label: vscode.workspace.asRelativePath(repository.rootUri, false),
        description: repository.rootUri.fsPath,
        repository
      }))
      .sort((left, right) => left.label.localeCompare(right.label)),
    {
      placeHolder: 'Choose the Repository for the Revision Graph'
    }
  );

  return picked?.repository;
}

function renderRevisionGraphHtml(
  repositoryLabel: string,
  scene: RevisionGraphScene,
  currentHeadName: string | undefined,
  ancestorFilter: RevisionGraphAncestorFilter | undefined
): string {
  const nonce = createNonce();
  const width = Math.max(880, scene.laneCount * LANE_WIDTH + NODE_WIDTH + NODE_PADDING_X * 2);
  const height = Math.max(480, scene.rowCount * ROW_HEIGHT + NODE_PADDING_Y * 2);
  const zoomLevels = [0.6, 0.8, 1, 1.25, 1.5];
  const referenceData = JSON.stringify(
    scene.nodes.flatMap((node) =>
      node.refs.map((ref) => ({
        id: createReferenceId(node.hash, ref.kind, ref.name),
        hash: node.hash,
        name: ref.name,
        kind: ref.kind,
        title: ref.name
      }))
    )
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GIT Revision Graph</title>
  <style>
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
      --node-mixed: #f0e6c8;
      --node-text-dark: #181818;
      --minimap-border: color-mix(in srgb, var(--border) 80%, transparent);
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
    .canvas { position: relative; width: ${width}px; height: ${height}px; transform-origin: top left; }
    svg { position: absolute; inset: 0; overflow: visible; }
    .node {
      position: absolute; width: ${NODE_WIDTH}px; min-height: 54px; border-radius: 10px;
      border: 1px solid rgba(0, 0, 0, 0.18); box-shadow: 0 7px 18px rgba(0, 0, 0, 0.12);
      color: var(--node-text-dark); cursor: inherit; user-select: none; overflow: hidden;
    }
    .viewport.dragging .node { cursor: grabbing; }
    .node:hover { transform: translateY(-1px); }
    .node.selected { outline: 3px solid color-mix(in srgb, var(--accent) 60%, transparent); }
    .node-head { background: var(--node-head); color: white; }
    .node-branch { background: var(--node-branch); }
    .node-tag { background: var(--node-tag); }
    .node-remote { background: var(--node-remote); }
    .node-mixed { background: var(--node-mixed); }
    .ref-line {
      padding: 8px 12px; border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      font-family: var(--vscode-editor-font-family, monospace); font-size: 12px; line-height: 1.25;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;
    }
    .ref-line.head { background: rgba(0,0,0,0.1); font-weight: 700; }
    .ref-line.base { box-shadow: inset 4px 0 0 rgba(0, 0, 0, 0.55); font-weight: 700; }
    .ref-line.compare { box-shadow: inset 4px 0 0 rgba(0, 0, 0, 0.25); text-decoration: underline; }
    .base-suffix { display: none; }
    .ref-line.base.has-compare .base-suffix { display: inline; }
    .minimap {
      position: fixed; right: 18px; bottom: 18px; width: 150px; height: 210px; border: 1px solid var(--minimap-border);
      border-radius: 10px; background: color-mix(in srgb, var(--bg) 92%, var(--panel)); overflow: hidden; z-index: 25;
    }
    .minimap svg { width: 100%; height: 100%; }
    .minimap-frame { fill: transparent; stroke: color-mix(in srgb, var(--accent) 65%, transparent); stroke-width: 2; }
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
  </style>
</head>
<body>
  <div class="viewport" id="viewport">
    <div class="canvas" id="canvas">
      <svg viewBox="0 0 ${width} ${height}" aria-hidden="true">
        ${scene.edges.map((edge) => renderEdge(edge)).join('')}
      </svg>
      ${scene.nodes.map((node) => renderNode(node)).join('')}
    </div>
  </div>
  <div class="minimap" aria-hidden="true">
    <svg viewBox="0 0 ${width} ${height}">
      ${scene.edges.map((edge) => renderEdge(edge, true)).join('')}
      ${scene.nodes.map((node) => renderMiniNode(node)).join('')}
      <rect id="minimapFrame" class="minimap-frame" x="0" y="0" width="0" height="0"></rect>
    </svg>
  </div>
  <div class="context-menu" id="contextMenu"></div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const references = ${referenceData};
    const currentHeadName = ${JSON.stringify(currentHeadName ?? null)};
    const activeAncestorFilter = ${JSON.stringify(ancestorFilter ?? null)};
    const zoomLevels = ${JSON.stringify(zoomLevels)};
    const selected = [];
    const viewport = document.getElementById('viewport');
    const canvas = document.getElementById('canvas');
    const minimapFrame = document.getElementById('minimapFrame');
    const contextMenu = document.getElementById('contextMenu');
    let currentZoom = 1;
    let dragState = null;
    let suppressNodeClick = false;
    for (const element of document.querySelectorAll('[data-ref-id]')) {
      element.addEventListener('click', (event) => {
        if (suppressNodeClick) {
          suppressNodeClick = false;
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        const refId = element.getAttribute('data-ref-id');
        const additive = event.ctrlKey || event.metaKey;
        if (!refId) return;
        const existingIndex = selected.indexOf(refId);
        if (!additive) {
          selected.splice(0, selected.length, refId);
        } else if (existingIndex >= 0) {
          selected.splice(existingIndex, 1);
        } else if (selected.length < 2) {
          selected.push(refId);
        } else {
          selected.splice(0, selected.length, selected[1], refId);
        }
        closeContextMenu();
        syncSelection();
      });
      element.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        const refId = element.getAttribute('data-ref-id');
        if (!refId) return;
        const target = getReference(refId);
        if (!target) return;
        openContextMenu(event.clientX, event.clientY, target);
      });
    }

    viewport.addEventListener('mousedown', (event) => {
      if (event.button !== 0) {
        return;
      }
      dragState = {
        startX: event.clientX,
        startY: event.clientY,
        scrollLeft: viewport.scrollLeft,
        scrollTop: viewport.scrollTop,
        moved: false
      };
      viewport.classList.add('dragging');
      closeContextMenu();
      event.preventDefault();
    });
    viewport.addEventListener('scroll', syncMinimap);
    viewport.addEventListener('scroll', closeContextMenu);
    window.addEventListener('resize', syncMinimap);
    window.addEventListener('resize', closeContextMenu);
    window.addEventListener('mousemove', (event) => {
      if (!dragState) {
        return;
      }
      const dx = event.clientX - dragState.startX;
      const dy = event.clientY - dragState.startY;
      if (!dragState.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        dragState.moved = true;
        suppressNodeClick = true;
      }
      viewport.scrollLeft = dragState.scrollLeft - dx;
      viewport.scrollTop = dragState.scrollTop - dy;
      syncMinimap();
    });
    window.addEventListener('mouseup', () => {
      if (!dragState) {
        return;
      }
      viewport.classList.remove('dragging');
      if (!dragState.moved) {
        suppressNodeClick = false;
      } else {
        setTimeout(() => {
          suppressNodeClick = false;
        }, 0);
      }
      dragState = null;
    });
    window.addEventListener('click', (event) => {
      if (!contextMenu.contains(event.target)) {
        closeContextMenu();
      }
    });
    window.addEventListener('contextmenu', (event) => {
      if (!event.target.closest('[data-ref-id]')) {
        closeContextMenu();
      }
    });
    window.addEventListener('keydown', (event) => {
      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        if (event.key === '+' || event.key === '=' || event.code === 'NumpadAdd') {
          event.preventDefault();
          zoomIn();
          return;
        }
        if (event.key === '-' || event.key === '_' || event.code === 'NumpadSubtract') {
          event.preventDefault();
          zoomOut();
          return;
        }
        if (event.key === '0' || event.code === 'Numpad0') {
          event.preventDefault();
          setZoom(1);
          return;
        }
      }
      if (event.key === 'Escape') {
        closeContextMenu();
      }
    });
    setZoom(1);
    syncSelection();

    function setZoom(zoom) {
      currentZoom = zoom;
      canvas.style.transform = 'scale(' + zoom + ')';
      canvas.style.width = '${width}px';
      canvas.style.height = '${height}px';
      syncMinimap();
    }

    function zoomIn() {
      const nextZoom = zoomLevels.find((value) => value > currentZoom);
      if (nextZoom) {
        setZoom(nextZoom);
      }
    }

    function zoomOut() {
      const previousLevels = zoomLevels.filter((value) => value < currentZoom);
      const nextZoom = previousLevels.length > 0 ? previousLevels[previousLevels.length - 1] : undefined;
      if (nextZoom) {
        setZoom(nextZoom);
      }
    }

    function syncSelection() {
      for (const element of document.querySelectorAll('[data-ref-id]')) {
        const refId = element.getAttribute('data-ref-id');
        element.classList.toggle('base', refId === selected[0]);
        element.classList.toggle('compare', refId === selected[1]);
        element.classList.toggle('has-compare', selected.length === 2 && refId === selected[0]);
      }
      syncMinimap();
    }

    function openContextMenu(clientX, clientY, target) {
      const base = selected[0] ? getReference(selected[0]) : undefined;
      const compare = selected[1] ? getReference(selected[1]) : undefined;
      const isCurrentHead = target.kind === 'head' || (currentHeadName && target.name === currentHeadName);
      const hasComparisonSelection =
        selected.length === 2 &&
        base &&
        compare &&
        (base.id === target.id || compare.id === target.id);

      contextMenu.innerHTML = '';
      if (hasComparisonSelection) {
        appendMenuItem('Compare', () => {
          vscode.postMessage({
            type: 'compare-selected',
            baseRefName: base.name,
            compareRefName: compare.name
          });
        });
        appendMenuItem('Show Log', () => {
          vscode.postMessage({
            type: 'show-log',
            baseRefName: base.name,
            compareRefName: compare.name
          });
        });
        appendMenuItem('Unified Diff', () => {
          vscode.postMessage({
            type: 'open-unified-diff',
            baseRefName: base.name,
            compareRefName: compare.name
          });
        });
        appendMenuItem('Clear Selection', () => {
          selected.splice(0, selected.length);
          syncSelection();
        });
      } else {
        appendMenuItem('Compare With Worktree', () => {
          vscode.postMessage({ type: 'compare-with-worktree', refName: target.name });
        });
        if (activeAncestorFilter && activeAncestorFilter.refName === target.name && activeAncestorFilter.refKind === target.kind) {
          appendMenuItem('Clear Filter', () => {
            vscode.postMessage({ type: 'clear-ancestor-filter' });
          });
        } else {
          appendMenuItem('Filter Ancestors', () => {
            vscode.postMessage({
              type: 'filter-ancestor-refs',
              refName: target.name,
              refKind: target.kind
            });
          });
        }
        appendMenuItem('Checkout', () => {
          vscode.postMessage({ type: 'checkout', refName: target.name, refKind: target.kind });
        });
        if (!isCurrentHead) {
          if (!(target.kind === 'remote' && target.name.endsWith('/HEAD'))) {
            appendMenuItem('Delete', () => {
              vscode.postMessage({ type: 'delete', refName: target.name, refKind: target.kind });
            });
          }
          appendMenuItem('Merge Into ' + (currentHeadName || 'Current HEAD'), () => {
            vscode.postMessage({ type: 'merge', refName: target.name });
          });
        }
        if (activeAncestorFilter && (activeAncestorFilter.refName !== target.name || activeAncestorFilter.refKind !== target.kind)) {
          appendMenuItem('Show All References', () => {
            vscode.postMessage({ type: 'clear-ancestor-filter' });
          });
        }
        if (selected.length > 0) {
          appendMenuItem('Clear Selection', () => {
            selected.splice(0, selected.length);
            syncSelection();
          });
        }
      }
      contextMenu.style.left = clientX + 'px';
      contextMenu.style.top = clientY + 'px';
      contextMenu.classList.add('open');
    }

    function appendMenuItem(label, onClick, disabled = false) {
      const button = document.createElement('button');
      button.className = 'context-item';
      button.textContent = label;
      button.disabled = disabled;
      button.addEventListener('click', () => {
        onClick();
        closeContextMenu();
      });
      contextMenu.appendChild(button);
    }

    function closeContextMenu() {
      contextMenu.classList.remove('open');
      contextMenu.innerHTML = '';
    }

    function getReference(refId) {
      return references.find((ref) => ref.id === refId);
    }

    function syncMinimap() {
      const zoom = currentZoom;
      const visibleX = Math.max(0, (viewport.scrollLeft - ${VIEWPORT_PADDING_LEFT}) / zoom);
      const visibleY = Math.max(0, (viewport.scrollTop - ${VIEWPORT_PADDING_TOP}) / zoom);
      const visibleWidth = Math.max(
        0,
        (viewport.clientWidth - ${VIEWPORT_PADDING_LEFT} - ${VIEWPORT_PADDING_RIGHT}) / zoom
      );
      const visibleHeight = Math.max(
        0,
        (viewport.clientHeight - ${VIEWPORT_PADDING_TOP} - ${VIEWPORT_PADDING_BOTTOM}) / zoom
      );
      const frameWidth = Math.min(${width} - visibleX, visibleWidth);
      const frameHeight = Math.min(${height} - visibleY, visibleHeight);
      minimapFrame.setAttribute('x', String(visibleX));
      minimapFrame.setAttribute('y', String(visibleY));
      minimapFrame.setAttribute('width', String(frameWidth));
      minimapFrame.setAttribute('height', String(frameHeight));
    }
  </script>
</body>
</html>`;
}

function renderNode(node: RevisionGraphNode): string {
  const x = NODE_PADDING_X + node.lane * LANE_WIDTH;
  const y = NODE_PADDING_Y + node.row * ROW_HEIGHT;
  const nodeClass = getNodeClass(node);
  const refLines = node.refs
    .map((ref) => `<div class="ref-line ${ref.kind === 'head' ? 'head' : ''}" data-ref-id="${escapeHtml(createReferenceId(node.hash, ref.kind, ref.name))}" data-ref-name="${escapeHtml(ref.name)}" data-ref-kind="${escapeHtml(ref.kind)}">${escapeHtml(ref.name)}<span class="base-suffix"> (Base)</span></div>`)
    .join('');

  return `<div class="node ${nodeClass}" data-node-hash="${node.hash}" style="left:${x}px; top:${y}px" title="${escapeHtml(node.refs.map((ref) => ref.name).join('\n'))}">
    ${refLines}
  </div>`;
}

function renderMiniNode(node: RevisionGraphNode): string {
  const x = NODE_PADDING_X + node.lane * LANE_WIDTH + NODE_WIDTH / 2 - 10;
  const y = NODE_PADDING_Y + node.row * ROW_HEIGHT + 18;
  return `<rect x="${x}" y="${y}" width="20" height="12" rx="3" fill="${miniNodeColor(node)}" opacity="0.92"></rect>`;
}

function renderEdge(edge: RevisionGraphEdge, mini = false): string {
  const sourceX = NODE_PADDING_X + edge.fromLane * LANE_WIDTH + NODE_WIDTH / 2;
  const sourceY = NODE_PADDING_Y + edge.fromRow * ROW_HEIGHT + 48;
  const targetX = NODE_PADDING_X + edge.toLane * LANE_WIDTH + NODE_WIDTH / 2;
  const targetY = NODE_PADDING_Y + edge.toRow * ROW_HEIGHT + 8;
  const midY = sourceY + (targetY - sourceY) / 2;
  const strokeWidth = mini ? 3 : 2.4;
  const marker = mini ? '' : 'marker-end="url(#arrowhead)"';
  const defs = mini ? '' : `<defs><marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><polygon points="0 0, 6 3, 0 6" fill="var(--edge)"></polygon></marker></defs>`;
  return `${defs}<path d="M ${sourceX} ${sourceY} L ${sourceX} ${midY} L ${targetX} ${midY} L ${targetX} ${targetY}" fill="none" stroke="var(--edge)" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" ${marker}></path>`;
}

async function compareRevisions(repository: Repository, left: string, right: string): Promise<void> {
  try {
    const changes = await repository.diffBetween(left, right);
    if (changes.length === 0) {
      void vscode.window.showInformationMessage(`No differences found between ${left.slice(0, 8)} and ${right.slice(0, 8)}.`);
      return;
    }
    const picked = await pickChange(changes, `Changed files between ${left.slice(0, 8)} and ${right.slice(0, 8)}`);
    if (picked) {
      await openChangeDiffBetweenRefs(repository, picked, left, right);
    }
  } catch (error) {
    await vscode.window.showErrorMessage(`Could not compare revisions. ${toErrorMessage(error)}`);
  }
}

async function openUnifiedDiff(repository: Repository, left: string, right: string): Promise<void> {
  try {
    const { stdout } = await execFile(
      'git',
      ['diff', '--no-color', left, right],
      {
        cwd: repository.rootUri.fsPath,
        maxBuffer: 8 * 1024 * 1024
      }
    );

    if (stdout.trim().length === 0) {
      void vscode.window.showInformationMessage(`No unified diff found between ${left.slice(0, 8)} and ${right.slice(0, 8)}.`);
      return;
    }

    const document = await vscode.workspace.openTextDocument({
      content: stdout,
      language: 'diff'
    });

    await vscode.window.showTextDocument(document, {
      preview: true
    });
  } catch (error) {
    await vscode.window.showErrorMessage(`Could not open the unified diff. ${toErrorMessage(error)}`);
  }
}

async function showRevisionLog(repository: Repository, left: string, right: string): Promise<void> {
  try {
    const entries = await loadRevisionLogEntries(repository.rootUri.fsPath, left, right, GRAPH_COMMIT_LIMIT);
    if (entries.length === 0) {
      void vscode.window.showInformationMessage(`No commits found between ${left} and ${right}.`);
      return;
    }

    const picked = await vscode.window.showQuickPick<RevisionLogQuickPickItem>(
      entries.map((entry) => ({
        label: `${entry.shortHash} ${entry.subject}`,
        description: `${entry.author} on ${entry.date}`,
        detail: entry.hash,
        entry
      })),
      {
        title: 'Show Log',
        placeHolder: `Commits in ${left}..${right}`,
        matchOnDescription: true,
        matchOnDetail: true
      }
    );

    if (!picked) {
      return;
    }

    await openCommitLogEntry(repository, picked.entry.hash);
  } catch (error) {
    await vscode.window.showErrorMessage(`Could not show the revision log. ${toErrorMessage(error)}`);
  }
}

async function compareRevisionWithWorktree(repository: Repository, hash: string): Promise<void> {
  try {
    const changes = await repository.diffWith(hash);
    if (changes.length === 0) {
      void vscode.window.showInformationMessage(`The worktree is already aligned with ${hash.slice(0, 8)}.`);
      return;
    }
    const picked = await pickChange(changes, `Changed files between ${hash.slice(0, 8)} and the worktree`);
    if (picked) {
      await openChangeDiffWithWorktree(repository, picked, hash);
    }
  } catch (error) {
    await vscode.window.showErrorMessage(`Could not compare the revision with the worktree. ${toErrorMessage(error)}`);
  }
}

async function checkoutReference(repository: Repository, refName: string, refKind: string): Promise<void> {
  try {
    if (refKind === 'head' || refKind === 'branch') {
      if (repository.state.HEAD?.name === refName) {
        const branchName = await vscode.window.showInputBox({
          prompt: `Create a New Branch from ${refName}`,
          value: '',
          validateInput: (value) => (value.trim().length === 0 ? 'Enter a branch name.' : undefined)
        });
        if (!branchName) {
          return;
        }
        await repository.createBranch(branchName, true, refName);
        void vscode.window.showInformationMessage(`Branch ${branchName} was created and checked out from ${refName}.`);
        return;
      }
      const confirmed = await vscode.window.showWarningMessage(`Check out ${refName}?`, { modal: true }, 'Checkout');
      if (confirmed !== 'Checkout') {
        return;
      }
      await repository.checkout(refName);
      void vscode.window.showInformationMessage(`Checkout completed for ${refName}.`);
      return;
    }

    if (refKind === 'remote') {
      const remoteCheckout = resolveRemoteCheckoutTarget(repository, refName);
      const branchName = await vscode.window.showInputBox({
        prompt: remoteCheckout.upstreamRefName
          ? `Create a Local Branch Tracking ${remoteCheckout.upstreamRefName}`
          : `Create a Local Branch from ${refName}`,
        value: remoteCheckout.suggestedLocalName,
        validateInput: (value) => (value.trim().length === 0 ? 'Enter a branch name.' : undefined)
      });
      if (!branchName) {
        return;
      }
      await repository.createBranch(branchName, true, remoteCheckout.startPointRefName);
      if (remoteCheckout.upstreamRefName) {
        await repository.setBranchUpstream(branchName, remoteCheckout.upstreamRefName);
      }
      void vscode.window.showInformationMessage(
        remoteCheckout.upstreamRefName
          ? `Branch ${branchName} was created and checked out from ${remoteCheckout.upstreamRefName}.`
          : `Branch ${branchName} was created and checked out from ${refName}.`
      );
      return;
    }

    const confirmed = await vscode.window.showWarningMessage(`Check out ${refName}?`, { modal: true }, 'Checkout');
    if (confirmed !== 'Checkout') {
      return;
    }
    await repository.checkout(refName);
    void vscode.window.showInformationMessage(`Checkout completed for ${refName}.`);
  } catch (error) {
    await vscode.window.showErrorMessage(`Could not check out the reference. ${toErrorMessage(error)}`);
  }
}

async function mergeReferenceIntoHead(repository: Repository, refName: string): Promise<void> {
  const currentBranch = repository.state.HEAD?.name ?? 'current HEAD';
  if (repository.state.HEAD?.name === refName) {
    void vscode.window.showInformationMessage('The current branch cannot be merged into itself.');
    return;
  }

  const confirmed = await vscode.window.showWarningMessage(
    `Merge ${refName} into ${currentBranch}?`,
    { modal: true },
    'Merge'
  );
  if (confirmed !== 'Merge') {
    return;
  }

  try {
    await repository.merge(refName);
    void vscode.window.showInformationMessage(`Merge from ${refName} started in ${currentBranch}.`);
  } catch (error) {
    await vscode.window.showErrorMessage(
      `Merge did not complete. If there were conflicts, finish it in the VS Code Source Control experience. ${toErrorMessage(error)}`
    );
  }
}

async function deleteReference(
  repository: Repository,
  refName: string,
  refKind: RevisionGraphRef['kind']
): Promise<void> {
  try {
    if (refKind === 'remote') {
      const remoteTarget = parseRemoteDeletionTarget(refName);
      if (!remoteTarget || remoteTarget.branchName === 'HEAD') {
        void vscode.window.showInformationMessage(`The remote reference ${refName} cannot be deleted from this view.`);
        return;
      }

      const confirmed = await vscode.window.showWarningMessage(
        `Delete the Remote Branch ${refName}?\n\nThis will remove the branch from ${remoteTarget.remoteName} and may affect other collaborators.`,
        { modal: true },
        'Delete Remote Reference'
      );
      if (confirmed !== 'Delete Remote Reference') {
        return;
      }

      await execFile(
        'git',
        ['push', remoteTarget.remoteName, '--delete', remoteTarget.branchName],
        {
          cwd: repository.rootUri.fsPath,
          maxBuffer: 8 * 1024 * 1024
        }
      );
      void vscode.window.showInformationMessage(`Remote branch ${refName} was deleted from ${remoteTarget.remoteName}.`);
      return;
    }

    if (refKind === 'tag') {
      const confirmed = await vscode.window.showWarningMessage(
        `Delete the Tag ${refName}?`,
        { modal: true },
        'Delete'
      );
      if (confirmed !== 'Delete') {
        return;
      }

      await repository.deleteTag(refName);
      void vscode.window.showInformationMessage(`Tag ${refName} was deleted.`);
      return;
    }

    const confirmed = await vscode.window.showWarningMessage(
      `Delete the Branch ${refName}?`,
      { modal: true },
      'Delete'
    );
    if (confirmed !== 'Delete') {
      return;
    }

    await repository.deleteBranch(refName, false);
    void vscode.window.showInformationMessage(`Branch ${refName} was deleted.`);
  } catch (error) {
    await vscode.window.showErrorMessage(`Could not delete the reference. ${toErrorMessage(error)}`);
  }
}

async function pickChange(changes: Change[], placeHolder: string): Promise<Change | undefined> {
  const items = changes
    .map((change) => {
      const { rightPath } = getDiffChangeUris(change);
      return {
        label: rightPath.split('/').at(-1) ?? rightPath,
        description: vscode.workspace.asRelativePath(vscode.Uri.file(rightPath), false),
        detail: getStatusLabel(change.status),
        change
      };
    })
    .sort((left, right) => (left.description ?? '').localeCompare(right.description ?? ''));

  return (await vscode.window.showQuickPick(items, { placeHolder, matchOnDescription: true, matchOnDetail: true }))?.change;
}

function buildRefUri(repository: Repository, ref: string, filePath: string): vscode.Uri {
  return vscode.Uri.from({
    scheme: REF_SCHEME,
    path: filePath,
    query: new URLSearchParams({ repo: repository.rootUri.fsPath, ref, path: filePath }).toString()
  });
}

function buildEmptyUri(filePath: string): vscode.Uri {
  return vscode.Uri.from({ scheme: EMPTY_SCHEME, path: filePath });
}

async function openCommitLogEntry(repository: Repository, commitHash: string): Promise<void> {
  try {
    const { stdout } = await execFile(
      'git',
      ['show', '--stat', '--patch', '--format=fuller', '--no-color', commitHash],
      {
        cwd: repository.rootUri.fsPath,
        maxBuffer: 8 * 1024 * 1024
      }
    );

    const document = await vscode.workspace.openTextDocument({
      content: stdout,
      language: 'diff'
    });

    await vscode.window.showTextDocument(document, {
      preview: true
    });
  } catch (error) {
    await vscode.window.showErrorMessage(`Could not open the selected commit. ${toErrorMessage(error)}`);
  }
}

async function openChangeDiffBetweenRefs(repository: Repository, change: Change, leftRef: string, rightRef: string): Promise<void> {
  const { leftPath, rightPath } = getDiffChangeUris(change);
  const { leftIsEmpty, rightIsEmpty } = getDiffChangeKinds(change);
  const leftUri = leftIsEmpty ? buildEmptyUri(rightPath) : buildRefUri(repository, leftRef, leftPath);
  const rightUri = rightIsEmpty ? buildEmptyUri(leftPath) : buildRefUri(repository, rightRef, rightPath);
  const title = `${leftRef.slice(0, 8)} <-> ${rightRef.slice(0, 8)} • ${vscode.workspace.asRelativePath(vscode.Uri.file(rightPath), false)}`;
  await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title);
}

async function openChangeDiffWithWorktree(repository: Repository, change: Change, ref: string): Promise<void> {
  const { leftPath, rightPath } = getDiffChangeUris(change);
  const { leftIsEmpty, rightIsEmpty } = getDiffChangeKinds(change);
  const leftUri = leftIsEmpty ? buildEmptyUri(rightPath) : buildRefUri(repository, ref, leftPath);
  const rightUri = rightIsEmpty ? buildEmptyUri(leftPath) : vscode.Uri.file(rightPath);
  const title = `${ref.slice(0, 8)} <-> worktree • ${vscode.workspace.asRelativePath(vscode.Uri.file(rightPath), false)}`;
  await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title);
}

function renderEmptyHtml(hasRepositories: boolean): string {
  const message = hasRepositories
    ? 'Choose a repository from the view toolbar to load the revision graph.'
    : 'Open a workspace with a Git repository to view the revision graph.';

  return `<!DOCTYPE html><html lang="en"><body style="font-family: sans-serif; padding: 24px;"><h2>GIT Revision Graph</h2><p>${message}</p></body></html>`;
}

function renderErrorHtml(message: string): string {
  return `<!DOCTYPE html><html lang="en"><body style="font-family: sans-serif; padding: 24px;"><h2>GIT Revision Graph</h2><p>${escapeHtml(message)}</p></body></html>`;
}

function getNodeClass(node: RevisionGraphNode): string {
  const kinds = new Set(node.refs.map((ref) => ref.kind));
  if (kinds.has('head')) return 'node-head';
  if (kinds.size === 1 && kinds.has('tag')) return 'node-tag';
  if (kinds.size === 1 && kinds.has('remote')) return 'node-remote';
  if (kinds.size === 1 && kinds.has('branch')) return 'node-branch';
  return 'node-mixed';
}

function miniNodeColor(node: RevisionGraphNode): string {
  switch (getNodeClass(node)) {
    case 'node-head': return '#d62828';
    case 'node-tag': return '#f7f300';
    case 'node-remote': return '#f6d8a8';
    case 'node-branch': return '#ffd79a';
    default: return '#e8d9b5';
  }
}

function createNonce(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function createReferenceId(hash: string, kind: string, name: string): string {
  return `${hash}::${kind}::${name}`;
}

function getSuggestedLocalBranchName(refName: string): string {
  const firstSlash = refName.indexOf('/');
  return firstSlash >= 0 ? refName.slice(firstSlash + 1) : refName;
}

function resolveRemoteCheckoutTarget(
  repository: Repository,
  refName: string
): {
  startPointRefName: string;
  upstreamRefName: string | undefined;
  suggestedLocalName: string;
} {
  const remoteTarget = parseRemoteDeletionTarget(refName);
  if (!remoteTarget || remoteTarget.branchName !== 'HEAD') {
    return {
      startPointRefName: refName,
      upstreamRefName: refName,
      suggestedLocalName: getSuggestedLocalBranchName(refName)
    };
  }

  const symbolicRef = repository.state.refs.find(
    (ref) => ref.type === RefType.RemoteHead && ref.name === refName
  );
  const candidates = repository.state.refs.filter(
    (ref) =>
      ref.type === RefType.RemoteHead &&
      ref.name &&
      ref.name.startsWith(`${remoteTarget.remoteName}/`) &&
      ref.name !== refName
  );

  const upstreamRef =
    candidates.find((ref) => ref.commit && symbolicRef?.commit && ref.commit === symbolicRef.commit) ??
    candidates.find((ref) => ref.name === `${remoteTarget.remoteName}/${repository.state.HEAD?.name}`) ??
    candidates.find((ref) => ref.name === `${remoteTarget.remoteName}/main`) ??
    candidates.find((ref) => ref.name === `${remoteTarget.remoteName}/master`) ??
    candidates[0];

  return {
    startPointRefName: upstreamRef?.name ?? refName,
    upstreamRefName: upstreamRef?.name,
    suggestedLocalName: upstreamRef?.name ? getSuggestedLocalBranchName(upstreamRef.name) : ''
  };
}

function parseRemoteDeletionTarget(refName: string): { remoteName: string; branchName: string } | undefined {
  const firstSlash = refName.indexOf('/');
  if (firstSlash <= 0 || firstSlash === refName.length - 1) {
    return undefined;
  }

  return {
    remoteName: refName.slice(0, firstSlash),
    branchName: refName.slice(firstSlash + 1)
  };
}

async function loadRevisionLogEntries(
  repositoryPath: string,
  left: string,
  right: string,
  limit: number
): Promise<RevisionLogEntry[]> {
  const fieldSeparator = '\u001f';
  const recordSeparator = '\u001e';
  const { stdout } = await execFile(
    'git',
    [
      'log',
      '--date=short',
      `--max-count=${limit}`,
      `--pretty=format:%H${fieldSeparator}%h${fieldSeparator}%ad${fieldSeparator}%an${fieldSeparator}%s${recordSeparator}`,
      `${left}..${right}`
    ],
    {
      cwd: repositoryPath,
      maxBuffer: 8 * 1024 * 1024
    }
  );

  return stdout
    .split(recordSeparator)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [hash, shortHash, date, author, ...subjectParts] = line.split(fieldSeparator);
      return {
        hash,
        shortHash,
        date,
        author,
        subject: subjectParts.join(fieldSeparator)
      };
    });
}
