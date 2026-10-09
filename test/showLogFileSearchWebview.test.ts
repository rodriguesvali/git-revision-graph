import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { renderShowLogFileSearchScript } from '../src/showLog/webviewFileSearch';

function fixture() {
  const messages: unknown[] = [];
  const timers = new Map<number, () => void>();
  let timerId = 0;
  const state = { commits: [{hash: 'a', expanded: true}] };
  const context = {
    content: { addEventListener() {} },
    currentState: state,
    getCurrentSourceToken: () => 'source-a',
    vscode: { postMessage: (message: unknown) => messages.push(message) },
    setTimeout: (callback: () => void) => { timers.set(++timerId, callback); return timerId; },
    clearTimeout: (id: number) => timers.delete(id)
  };
  const script = renderShowLogFileSearchScript();
  const controls = runInNewContext(`${script}\n({setCommitFileFilter, flushPendingCommitFileFilter, resetCommitFileFilters})`, context) as {
    setCommitFileFilter: (hash: string, value: string) => void;
    flushPendingCommitFileFilter: () => void;
    resetCommitFileFilters: () => void;
  };
  return { ...controls, messages, timers, state };
}

test('file filter debounce flushes the last edit before collapse and prevents duplicate sends', () => {
  const f = fixture();
  f.setCommitFileFilter('a', 'change:old');
  f.setCommitFileFilter('a', 'change:needle');
  assert.equal(f.messages.length, 0);
  assert.equal(f.timers.size, 1);
  f.flushPendingCommitFileFilter();
  f.state.commits[0].expanded = false;
  f.flushPendingCommitFileFilter();
  assert.equal(f.timers.size, 0);
  assert.equal(JSON.stringify(f.messages), JSON.stringify([
    {type:'setCommitFileFilter', commitHash:'a', value:'change:needle', sourceToken:'source-a'}
  ]));
});

test('source reset discards a pending file filter instead of sending it to the next source', () => {
  const f = fixture();
  f.setCommitFileFilter('a', 'change:needle');
  f.resetCommitFileFilters();
  f.flushPendingCommitFileFilter();
  assert.equal(f.timers.size, 0);
  assert.deepEqual(f.messages, []);
});
