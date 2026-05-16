import test from 'node:test';
import assert from 'node:assert/strict';

import {
  detachSecondaryView,
  focusAndMaximizeSecondaryView,
  hideSecondaryView,
  initializeRevisionGraphVisibility,
  minimizeSecondaryViewThenMaximizeView,
  resetViewLayoutStateForTests
} from '../src/viewLayout';
import type { ViewCommandExecutor } from '../src/viewLayout';

test('initializeRevisionGraphVisibility keeps the legacy side-bar graph hidden', async () => {
  resetViewLayoutStateForTests();
  const harness = createCommandHarness();

  await initializeRevisionGraphVisibility(harness.commands);

  assert.deepEqual(harness.contexts, [
    { key: 'gitRefs.revisionGraphVisible', value: false }
  ]);
});

test('focusAndMaximizeSecondaryView hides the graph and expands the secondary view', async () => {
  resetViewLayoutStateForTests();
  const harness = createCommandHarness();

  await focusAndMaximizeSecondaryView('gitRefs.showLogView', harness.commands);

  assert.deepEqual(harness.contexts[0], { key: 'gitRefs.revisionGraphVisible', value: false });
  assert.ok(harness.calls.indexOf('gitRefs.showLogView.focus') > harness.calls.indexOf('setContext'));
  assert.ok(harness.calls.filter((call) => call === 'workbench.action.increaseViewHeight').length > 1);
  assert.ok(harness.calls.includes('workbench.action.increaseViewSize'));
});

test('minimizeSecondaryViewThenMaximizeView keeps the graph hidden while compare expands', async () => {
  resetViewLayoutStateForTests();
  const harness = createCommandHarness();

  await minimizeSecondaryViewThenMaximizeView('gitRefs.showLogView', 'gitRefs.compareResultsView', harness.commands);

  assert.deepEqual(harness.contexts[0], { key: 'gitRefs.revisionGraphVisible', value: false });
  assert.ok(harness.calls.includes('workbench.action.decreaseViewHeight'));
  assert.ok(harness.calls.includes('workbench.action.decreaseViewSize'));

  const compareFocusIndex = harness.calls.indexOf('gitRefs.compareResultsView.focus');
  const lastDecreaseIndex = harness.calls.lastIndexOf('workbench.action.decreaseViewSize');
  const firstIncreaseIndex = harness.calls.indexOf('workbench.action.increaseViewHeight');

  assert.ok(compareFocusIndex > lastDecreaseIndex);
  assert.ok(firstIncreaseIndex > compareFocusIndex);
});

test('hideSecondaryView reopens the editor graph after the last secondary view closes', async () => {
  resetViewLayoutStateForTests();
  const harness = createCommandHarness();

  await focusAndMaximizeSecondaryView('gitRefs.showLogView', harness.commands);
  await hideSecondaryView('gitRefs.showLogView', harness.commands);

  assert.deepEqual(harness.contexts.at(-1), { key: 'gitRefs.revisionGraphVisible', value: false });
  assert.equal(harness.calls.at(-2), 'gitRefs.openRevisionGraphEditor');
  assert.equal(harness.calls.at(-1), 'workbench.view.scm');
});

test('hideSecondaryView restores focus to another visible secondary view', async () => {
  resetViewLayoutStateForTests();
  const harness = createCommandHarness();

  await focusAndMaximizeSecondaryView('gitRefs.showLogView', harness.commands);
  await focusAndMaximizeSecondaryView('gitRefs.compareResultsView', harness.commands);
  await hideSecondaryView('gitRefs.compareResultsView', harness.commands, 'gitRefs.showLogView');

  assert.deepEqual(harness.contexts.at(-1), { key: 'gitRefs.revisionGraphVisible', value: false });
  const restoredShowLogFocusIndex = harness.calls.lastIndexOf('gitRefs.showLogView.focus');
  const lastSetContextIndex = harness.calls.lastIndexOf('setContext');
  const lastIncreaseIndex = harness.calls.lastIndexOf('workbench.action.increaseViewSize');

  assert.ok(restoredShowLogFocusIndex > lastSetContextIndex);
  assert.ok(lastIncreaseIndex > restoredShowLogFocusIndex);
});

test('detachSecondaryView clears secondary layout state without reopening the editor graph', async () => {
  resetViewLayoutStateForTests();
  const harness = createCommandHarness();

  await focusAndMaximizeSecondaryView('gitRefs.showLogView', harness.commands);
  await detachSecondaryView('gitRefs.showLogView', harness.commands);
  await hideSecondaryView('gitRefs.compareResultsView', harness.commands);

  assert.deepEqual(harness.contexts.at(-1), { key: 'gitRefs.revisionGraphVisible', value: false });
  assert.equal(harness.calls.includes('gitRefs.openRevisionGraphEditor'), false);
});

function createCommandHarness(failingCommands = new Set<string>()): {
  readonly calls: string[];
  readonly contexts: Array<{ readonly key: string; readonly value: unknown }>;
  readonly commands: ViewCommandExecutor;
} {
  const calls: string[] = [];
  const contexts: Array<{ readonly key: string; readonly value: unknown }> = [];
  return {
    calls,
    contexts,
    commands: {
      async executeCommand<T = unknown>(command: string, ...args: unknown[]): Promise<T> {
        calls.push(command);
        if (failingCommands.has(command)) {
          throw new Error(`Command unavailable: ${command}`);
        }
        if (command === 'setContext') {
          contexts.push({ key: String(args[0]), value: args[1] });
        }
        return undefined as T;
      }
    }
  };
}
