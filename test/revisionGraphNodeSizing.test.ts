import test from 'node:test';
import assert from 'node:assert/strict';

import {
  estimateRevisionGraphNodeHeight,
  estimateRevisionGraphNodeWidth
} from '../src/revisionGraph/layout/nodeSizing';

test('estimates wider cards for long reference labels', () => {
  const shortWidth = estimateRevisionGraphNodeWidth({
    hash: 'head1',
    subject: 'Short subject',
    refs: [{ name: 'v1.0.0' }]
  });
  const longWidth = estimateRevisionGraphNodeWidth({
    hash: 'head2',
    subject: 'Short subject',
    refs: [{ name: 'release/2026/very-long-maintenance-branch-name' }]
  });

  assert.ok(longWidth > shortWidth);
});

test('estimates taller cards when a node renders multiple references', () => {
  const singleRefHeight = estimateRevisionGraphNodeHeight({
    hash: 'head1',
    subject: 'Short subject',
    refs: [{ name: 'main' }]
  });
  const multiRefHeight = estimateRevisionGraphNodeHeight({
    hash: 'head2',
    subject: 'Short subject',
    refs: [
      { name: 'main' },
      { name: 'origin/main' },
      { name: 'v1.0.0' }
    ]
  });

  assert.ok(multiRefHeight > singleRefHeight);
});
