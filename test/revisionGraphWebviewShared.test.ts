import test from 'node:test';
import assert from 'node:assert/strict';

import { RevisionGraphNode, RevisionGraphScene } from '../src/revisionGraphData';
import { buildNodeLayouts, createNonce, describeEdgePath, formatNodeSummary, renderEdge } from '../src/revisionGraph/webview/shared';

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

test('renders single-bend edge paths for a more readable graph look', () => {
  assert.equal(describeEdgePath(10, 20, 30, 60), 'M 10 20 L 30 24 L 30 60');
  assert.equal(describeEdgePath(10, 20, 80, 60), 'M 10 20 L 80 24 L 80 60');
  assert.equal(describeEdgePath(30, 60, 10, 20), 'M 30 60 L 10 56 L 10 20');
  assert.equal(describeEdgePath(10, 20, 16, 60), 'M 10 20 L 16 60');
});

test('renders graph edges from parent toward descendant rows', () => {
  const upper = { row: 0, defaultLeft: 0, defaultTop: 0, width: 100, height: 40 };
  const lower = { row: 1, defaultLeft: 100, defaultTop: 100, width: 100, height: 40 };

  assert.match(
    renderEdge({ from: 'upper', to: 'lower' }, new Map([
      ['upper', upper],
      ['lower', lower]
    ])),
    /d="M 150 106 L 50 70 L 50 34"/
  );
  assert.match(
    renderEdge({ from: 'lower', to: 'upper' }, new Map([
      ['upper', upper],
      ['lower', lower]
    ])),
    /d="M 50 34 L 150 70 L 150 106"/
  );
});

test('adds vertical clearance after rows with multiple descendants', () => {
  const nodes: RevisionGraphScene['nodes'] = [
    {
      hash: 'parent',
      refs: [{ name: 'main', kind: 'head' }],
      author: 'Ada',
      date: '2026-04-30',
      subject: 'Parent',
      x: 0,
      row: 0,
      lane: 0
    },
    {
      hash: 'sibling',
      refs: [{ name: 'feature/sibling', kind: 'branch' }],
      author: 'Ada',
      date: '2026-04-30',
      subject: 'Sibling',
      x: 180,
      row: 0,
      lane: 1
    },
    {
      hash: 'left',
      refs: [{ name: 'feature/left', kind: 'branch' }],
      author: 'Ada',
      date: '2026-04-30',
      subject: 'Left',
      x: 0,
      row: 1,
      lane: 0
    },
    {
      hash: 'right',
      refs: [{ name: 'feature/right', kind: 'branch' }],
      author: 'Ada',
      date: '2026-04-30',
      subject: 'Right',
      x: 180,
      row: 1,
      lane: 1
    }
  ];
  const linearScene: RevisionGraphScene = {
    nodes,
    edges: [{ from: 'left', to: 'parent' }],
    laneCount: 2,
    rowCount: 2
  };
  const multipleIndependentEdgesScene: RevisionGraphScene = {
    nodes,
    edges: [
      { from: 'left', to: 'parent' },
      { from: 'right', to: 'sibling' }
    ],
    laneCount: 2,
    rowCount: 2
  };
  const fanOutScene: RevisionGraphScene = {
    nodes,
    edges: [
      { from: 'left', to: 'parent' },
      { from: 'right', to: 'parent' }
    ],
    laneCount: 2,
    rowCount: 2
  };

  const linearChildTop = buildNodeLayouts(linearScene).find((node) => node.hash === 'left')?.defaultTop ?? 0;
  const independentEdgesChildTop = buildNodeLayouts(multipleIndependentEdgesScene).find((node) => node.hash === 'left')?.defaultTop ?? 0;
  const fanOutChildTop = buildNodeLayouts(fanOutScene).find((node) => node.hash === 'left')?.defaultTop ?? 0;

  assert.equal(independentEdgesChildTop, linearChildTop);
  assert.ok(fanOutChildTop > independentEdgesChildTop);
});

test('adds vertical clearance when a lower parent fans out to upper descendants', () => {
  const nodes: RevisionGraphScene['nodes'] = [
    {
      hash: 'left',
      refs: [{ name: 'feature/left', kind: 'branch' }],
      author: 'Ada',
      date: '2026-04-30',
      subject: 'Left',
      x: 0,
      row: 0,
      lane: 0
    },
    {
      hash: 'right',
      refs: [{ name: 'feature/right', kind: 'branch' }],
      author: 'Ada',
      date: '2026-04-30',
      subject: 'Right',
      x: 180,
      row: 0,
      lane: 1
    },
    {
      hash: 'parent',
      refs: [{ name: 'main', kind: 'head' }],
      author: 'Ada',
      date: '2026-04-30',
      subject: 'Parent',
      x: 90,
      row: 2,
      lane: 0
    }
  ];
  const linearScene: RevisionGraphScene = {
    nodes,
    edges: [{ from: 'left', to: 'parent' }],
    laneCount: 2,
    rowCount: 3
  };
  const fanOutScene: RevisionGraphScene = {
    nodes,
    edges: [
      { from: 'left', to: 'parent' },
      { from: 'right', to: 'parent' }
    ],
    laneCount: 2,
    rowCount: 3
  };

  const linearParentTop = buildNodeLayouts(linearScene).find((node) => node.hash === 'parent')?.defaultTop ?? 0;
  const fanOutParentTop = buildNodeLayouts(fanOutScene).find((node) => node.hash === 'parent')?.defaultTop ?? 0;

  assert.ok(fanOutParentTop > linearParentTop);
});

test('creates CSP nonces with cryptographic base64url-friendly values', () => {
  const first = createNonce();
  const second = createNonce();

  assert.match(first, /^[A-Za-z0-9_-]{22}$/);
  assert.match(second, /^[A-Za-z0-9_-]{22}$/);
  assert.notEqual(first, second);
});
