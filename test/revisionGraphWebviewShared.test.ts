import test from 'node:test';
import assert from 'node:assert/strict';

import { RevisionGraphNode } from '../src/revisionGraphData';
import { createNonce, describeEdgePath, formatNodeSummary } from '../src/revisionGraph/webview/shared';

test('formats structural node summaries as compact short hashes', () => {
  const node: RevisionGraphNode = {
    hash: '1234567890abcdef',
    refs: [],
    author: 'Jane Doe',
    date: '2026-04-14',
    subject: 'This subject stays in the tooltip instead of the compact pill',
    x: 0,
    row: 0,
    lane: 0
  };

  assert.equal(formatNodeSummary(node), '12345678');
});

test('renders straight edge paths for a more mechanical graph look', () => {
  assert.equal(describeEdgePath(10, 20, 30, 40), 'M 10 20 L 30 40');
});

test('creates CSP nonces with cryptographic base64url-friendly values', () => {
  const first = createNonce();
  const second = createNonce();

  assert.match(first, /^[A-Za-z0-9_-]{22}$/);
  assert.match(second, /^[A-Za-z0-9_-]{22}$/);
  assert.notEqual(first, second);
});
