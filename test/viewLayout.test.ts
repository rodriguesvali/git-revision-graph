import test from 'node:test';
import assert from 'node:assert/strict';

import {
  initializeRevisionGraphVisibility,
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

function createCommandHarness(failingCommands = new Set<string>()): {
  readonly calls: string[];
  readonly commandArgs: unknown[][];
  readonly contexts: Array<{ readonly key: string; readonly value: unknown }>;
  readonly commands: ViewCommandExecutor;
} {
  const calls: string[] = [];
  const commandArgs: unknown[][] = [];
  const contexts: Array<{ readonly key: string; readonly value: unknown }> = [];
  return {
    calls,
    commandArgs,
    contexts,
    commands: {
      async executeCommand<T = unknown>(command: string, ...args: unknown[]): Promise<T> {
        calls.push(command);
        commandArgs.push(args);
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
