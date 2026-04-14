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

test('keeps structural commits more compact than labeled reference cards', () => {
  const structuralWidth = estimateRevisionGraphNodeWidth({
    hash: '1234567890abcdef',
    subject: 'A very long subject that should not force wide structural pills',
    refs: []
  });
  const branchWidth = estimateRevisionGraphNodeWidth({
    hash: 'abcdef1234567890',
    subject: 'Short subject',
    refs: [{ name: 'release/2026/very-long-maintenance-branch-name' }]
  });
  const structuralHeight = estimateRevisionGraphNodeHeight({
    hash: '1234567890abcdef',
    subject: 'A very long subject that should not force tall structural pills',
    refs: []
  });
  const branchHeight = estimateRevisionGraphNodeHeight({
    hash: 'abcdef1234567890',
    subject: 'Short subject',
    refs: [{ name: 'main' }]
  });

  assert.ok(structuralWidth < branchWidth);
  assert.ok(structuralHeight < branchHeight);
});
