import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCompareResultsWebviewMessage } from '../src/compareResults/messageValidation';
import { validateShowLogWebviewMessage } from '../src/showLog/messageValidation';

for (const type of ['openWorktreeFile', 'openSourceFile', 'openTargetFile']) {
  test(`${type} accepts bounded file identities in both panels`, () => {
    assert.deepEqual(validateCompareResultsWebviewMessage({ type, itemId: 'file-id' }), { type, itemId: 'file-id' });
    assert.deepEqual(validateShowLogWebviewMessage({ type, commitHash: 'commit', changeId: 'file-id' }), { type, commitHash: 'commit', changeId: 'file-id' });
    assert.equal(validateCompareResultsWebviewMessage({ type, itemId: '' }), undefined);
    assert.equal(validateShowLogWebviewMessage({ type, commitHash: 'commit', changeId: '' }), undefined);
  });
}
