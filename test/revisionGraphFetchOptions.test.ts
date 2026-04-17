import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRevisionGraphFetchArgs,
  createRevisionGraphFetchOptionItems,
  formatRevisionGraphFetchSuccessMessage
} from '../src/revisionGraph/fetchOptions';

test('builds fetch quick pick items with prune enabled by default', () => {
  assert.deepEqual(createRevisionGraphFetchOptionItems(), [
    {
      id: 'prune',
      label: 'Prune',
      description: 'Remove remote-tracking refs that no longer exist on the remote.',
      picked: true
    },
    {
      id: 'tags',
      label: 'Tags',
      description: 'Fetch all tags from the remote.',
      picked: false
    }
  ]);
});

test('builds fetch args from the selected fetch options', () => {
  assert.deepEqual(buildRevisionGraphFetchArgs([]), ['fetch']);
  assert.deepEqual(buildRevisionGraphFetchArgs(['prune']), ['fetch', '--prune']);
  assert.deepEqual(buildRevisionGraphFetchArgs(['tags']), ['fetch', '--tags']);
  assert.deepEqual(buildRevisionGraphFetchArgs(['prune', 'tags']), ['fetch', '--prune', '--tags']);
});

test('formats fetch success messages with the selected option labels', () => {
  assert.equal(
    formatRevisionGraphFetchSuccessMessage('repo', []),
    'Fetch completed for repo.'
  );
  assert.equal(
    formatRevisionGraphFetchSuccessMessage('repo', ['prune']),
    'Fetch completed for repo (Prune).'
  );
  assert.equal(
    formatRevisionGraphFetchSuccessMessage('repo', ['prune', 'tags']),
    'Fetch completed for repo (Prune, Tags).'
  );
});
