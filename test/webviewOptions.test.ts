import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createRetainedScriptWebviewPanelOptions,
  createScriptOnlyWebviewOptions
} from '../src/webviewOptions';

test('createScriptOnlyWebviewOptions enables scripts without local resource access', () => {
  assert.deepEqual(createScriptOnlyWebviewOptions(), {
    enableScripts: true,
    localResourceRoots: []
  });
});

test('createRetainedScriptWebviewPanelOptions keeps retained panels without local resource access', () => {
  assert.deepEqual(createRetainedScriptWebviewPanelOptions(), {
    enableScripts: true,
    localResourceRoots: [],
    retainContextWhenHidden: true
  });
});
