import test from 'node:test';
import assert from 'node:assert/strict';

type VscodeMessageOptions = {
  readonly modal?: boolean;
  readonly detail?: string;
};

test('the shared error presenter always forces modal presentation', async (t) => {
  const requests: Array<{ readonly message: string; readonly options: VscodeMessageOptions }> = [];
  const moduleLoader = require('node:module') as {
    _load(request: string, parent: NodeModule | null, isMain: boolean): unknown;
  };
  const originalLoad = moduleLoader._load;
  moduleLoader._load = function loadWithVscodeMock(
    request: string,
    parent: NodeModule | null,
    isMain: boolean
  ): unknown {
    if (request === 'vscode') {
      return {
        window: {
          async showErrorMessage(message: string, options: VscodeMessageOptions): Promise<undefined> {
            requests.push({ message, options });
            return undefined;
          }
        }
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  t.after(() => {
    moduleLoader._load = originalLoad;
  });

  const modulePath = require.resolve('../src/workbenchMessages');
  delete require.cache[modulePath];
  const { showModalErrorMessage } = require(modulePath) as typeof import('../src/workbenchMessages');

  await showModalErrorMessage('Operation failed.', {
    modal: false,
    detail: 'Review the Git output.'
  });

  assert.deepEqual(requests, [{
    message: 'Operation failed.',
    options: {
      modal: true,
      detail: 'Review the Git output.'
    }
  }]);
});
