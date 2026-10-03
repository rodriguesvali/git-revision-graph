import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { renderCompareResultsWebviewHtml } from '../src/compareResultsWebview';

test('Compare Results retains filters and selection through briefing progress, result and cancellation', () => {
  const view = createReviewWebview();
  const state = reviewState();
  view.update(state);
  view.review('src/', 'modified', ['src/a.ts', 'src/b.ts']);
  for (const briefing of [{ kind: 'loading' }, { kind: 'ready', content: 'Review notes' }, { kind: 'idle' }]) {
    view.update({ ...state, briefing });
    assert.deepEqual(view.snapshot(), { query: 'src/', status: 'modified', selected: ['src/a.ts', 'src/b.ts'], anchor: 'src/b.ts' });
  }
});

test('new comparisons reset review context even with identical labels and paths', () => {
  for (const comparisonId of ['repo-a/session-2', 'repo-b/session-1', undefined, '', 42]) {
    const view = createReviewWebview();
    view.update(reviewState());
    view.review('src/', 'modified', ['src/a.ts']);
    view.update(reviewState({ comparisonId }));
    assert.deepEqual(view.snapshot(), { query: '', status: 'all', selected: [] });
  }
});

test('loading and empty results clear prior filters and selection', () => {
  for (const kind of ['loading', 'empty']) {
    const view = createReviewWebview();
    view.update(reviewState());
    view.review('src/', 'modified', ['src/a.ts']);
    view.update(reviewState({ kind, items: [] }));
    assert.deepEqual(view.snapshot(), { query: '', status: 'all', selected: [] });
  }
});

test('refresh drops removed or changed IDs and reconciles the selection anchor', () => {
  const view = createReviewWebview();
  const state = reviewState();
  view.update(state);
  view.review('src/', 'modified', ['src/a.ts', 'src/b.ts']);
  view.update({ ...state, items: [state.items[0], state.items[2]] });
  assert.deepEqual(view.snapshot(), { query: 'src/', status: 'modified', selected: ['src/a.ts'], anchor: 'src/a.ts' });
  view.update({ ...state, items: [{ ...state.items[0], id: 'src/a.ts::Added', status: 'Added' }] });
  assert.deepEqual(view.snapshot(), { query: 'src/', status: 'modified', selected: [] });
  assert.match(view.element('statusFilters').innerHTML, /data-status-filter="modified"[^>]*data-active="true"/);
  assert.match(view.element('statusFilters').innerHTML, /Modified.*?0/);
  assert.match(view.element('content').innerHTML, /No files match the active filters/);
  view.element('statusFilters').listeners.click[0]({ target: { closest: () => ({ getAttribute: () => 'all' }) } });
  assert.equal(view.element('content').rows.length, 1);
  assert.equal(view.snapshot().query, 'src/');
});

test('one file is initially selected but a refresh does not select a replacement', () => {
  const view = createReviewWebview();
  const state = reviewState();
  view.update({ ...state, items: [state.items[0]] });
  assert.deepEqual(view.snapshot(), { query: '', status: 'all', selected: ['src/a.ts'], anchor: 'src/a.ts' });
  view.update({ ...state, items: [state.items[1]] });
  assert.deepEqual(view.snapshot(), { query: '', status: 'all', selected: [] });
});

test('zero text matches retain the query and the clear control returns focus', () => {
  const view = createReviewWebview();
  const state = reviewState();
  view.update(state);
  view.review('missing-file', 'all', []);
  view.update(state);
  assert.equal(view.snapshot().query, 'missing-file');
  assert.equal(view.element('clearSearchButton').disabled, false);
  assert.match(view.element('content').innerHTML, /No files match the active filters/);
  view.element('clearSearchButton').listeners.click[0]();
  assert.equal(view.element('content').rows.length, 3);
  assert.equal(view.document.activeElement, view.element('searchInput'));
});

test('same comparison restores file focus and falls back to search when that file disappears', () => {
  const view = createReviewWebview();
  const state = reviewState();
  view.update(state);
  const originalRow = view.element('content').rows[0];
  originalRow.focus();
  view.update(state);
  assert.notEqual(view.document.activeElement, originalRow);
  assert.equal(view.document.activeElement.getAttribute('data-item-id'), 'src/a.ts');
  view.update({ ...state, items: state.items.slice(1) });
  assert.equal(view.document.activeElement, view.element('searchInput'));
  for (const id of ['searchInput', 'briefingButton']) {
    view.element(id).focus();
    view.update(state);
    assert.equal(view.document.activeElement, view.element(id));
  }
});

test('refresh closes stale menus and dispatches actions only for current selected IDs', () => {
  const view = createReviewWebview();
  const state = reviewState();
  view.update(state);
  view.review('src/', 'modified', ['src/a.ts', 'src/b.ts']);
  function openMenu() {
    view.element('content').listeners.contextmenu[0]({ target: view.element('content').rows[0],
      preventDefault() {}, clientX: 20, clientY: 20 });
  }
  function copy() {
    view.element('contextMenu').listeners.click[0]({ target: { closest: () => ({ getAttribute: () => 'copyFileName' }) } });
  }
  openMenu();
  assert.equal(view.element('contextMenu').hidden, false);
  view.update({ ...state, items: [state.items[0], state.items[2]] });
  assert.equal(view.element('contextMenu').hidden, true);
  copy();
  assert.equal(view.messages.length, 0);
  openMenu();
  copy();
  assert.deepEqual(JSON.parse(JSON.stringify(view.messages)), [{ type: 'copyFileName', itemIds: ['src/a.ts'] }]);
});

test('briefing generation and cancellation keep review context and send the existing actions', () => {
  const view = createReviewWebview();
  const state = reviewState();
  view.update(state);
  view.review('src/', 'modified', ['src/a.ts']);
  view.element('briefingButton').listeners.click[0]();
  view.update({ ...state, briefing: { kind: 'loading' } });
  view.element('briefingButton').listeners.click[0]();
  view.update({ ...state, briefing: { kind: 'idle' } });
  assert.deepEqual(JSON.parse(JSON.stringify(view.messages)), [{ type: 'generateBriefing' }, { type: 'cancelBriefing' }]);
  assert.deepEqual(view.snapshot(), { query: 'src/', status: 'modified', selected: ['src/a.ts'], anchor: 'src/a.ts' });
});

function reviewState(overrides: Record<string, unknown> = {}) {
  return { kind: 'results', comparisonId: 'repo-a/session-1', sourceLabel: 'main', targetLabel: 'Worktree',
    canOpenUnifiedDiff: true, canGenerateBriefing: true, briefing: { kind: 'idle' }, items: [
      { id: 'src/a.ts', path: 'src/a.ts', name: 'a.ts', directory: 'src', fullPath: '/repo/src/a.ts', status: 'Modified', worktreeRef: 'main' },
      { id: 'src/b.ts', path: 'src/b.ts', name: 'b.ts', directory: 'src', fullPath: '/repo/src/b.ts', status: 'Modified', worktreeRef: 'main' },
      { id: 'docs/readme.md', path: 'docs/readme.md', name: 'readme.md', directory: 'docs', fullPath: '/repo/docs/readme.md', status: 'Added', worktreeRef: 'main' }
    ], ...overrides };
}

function createReviewWebview() {
  const elements = new Map<string, any>();
  const messages: any[] = [];
  const windowListeners: Record<string, Array<(event: any) => void>> = {};
  const document: any = { activeElement: null, getElementById: (id: string) => element(id) };
  let rowSequence = 0;
  function element(id: string): any {
    if (elements.has(id)) return elements.get(id);
    let html = '';
    const node: any = { id, value: '', textContent: '', dataset: {}, attributes: {}, hidden: false,
      style: {}, rows: [], listeners: {}, disabled: false,
      setAttribute(name: string, value: string) { this.attributes[name] = value; },
      getAttribute(name: string) { return this.attributes[name] ?? null; },
      toggleAttribute() {},
      addEventListener(name: string, callback: (event: any) => void) { (this.listeners[name] ??= []).push(callback); },
      focus() { document.activeElement = this; },
      closest(selector: string) { return selector.includes('data-item-id') && this.attributes['data-item-id'] ? this : null; },
      querySelectorAll() { return this.rows; },
      querySelector() { return null; },
      getBoundingClientRect() { return { left: 10, top: 10, width: 100, height: 100 }; }
    };
    Object.defineProperty(node, 'innerHTML', { get: () => html, set: (value: string) => {
      html = value;
      if (id !== 'content') return;
      if (node.rows.includes(document.activeElement)) document.activeElement = null;
      node.rows = [...value.matchAll(/data-item-id="([^"]+)"/g)].map((match) => {
        const row = element(`row-${rowSequence++}`); row.setAttribute('data-item-id', match[1]); return row;
      });
    } });
    elements.set(id, node);
    return node;
  }
  const context = vm.createContext({ document, window: { innerWidth: 1200, innerHeight: 800,
    addEventListener: (name: string, callback: (event: any) => void) => (windowListeners[name] ??= []).push(callback) },
    acquireVsCodeApi: () => ({ postMessage: (message: any) => messages.push(message) }) });
  const script = renderCompareResultsWebviewHtml().match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);
  vm.runInContext(script, context);
  messages.length = 0; // Ignore the initial host handshake when checking user actions.
  const snapshot = () => JSON.parse(JSON.stringify(vm.runInContext(
    '({ query:searchInput.value,status:activeStatusFilter,selected:selectedItemIds,anchor:selectionAnchorItemId })', context)));
  const update = (state: any) => windowListeners.message[0]({ data: { type: 'state', state } });
  function review(query: string, status: string, selected: string[]) {
    element('searchInput').value = query;
    element('searchInput').listeners.input[0]();
    element('statusFilters').listeners.click[0]({ target: { closest: () => ({ getAttribute: () => status }) } });
    for (const id of selected) {
      const row = element('content').rows.find((row: any) => row.getAttribute('data-item-id') === id);
      assert.ok(row);
      element('content').listeners.click[0]({ target: row, button: 0, ctrlKey: true });
    }
  }
  return { update, review, snapshot, element, document, messages, context };
}
