import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';

const require = createRequire(import.meta.url);
const {
  buildCommitGraph,
  buildRevisionGraphScene,
  countMajorOperationsVisibleNodes,
  parseRevisionGraphLog,
  projectMajorOperationsGraph
} = require('../out/revisionGraphData.js');
const {
  layoutProjectedGraphWithRoutes
} = require('../out/revisionGraph/layout/layeredLayout.js');

const GENERATOR_VERSION = 2;
const SEED = 0x15_00_20_26;
const TIERS = {
  ci: { commits: 1_200, refs: 120, merges: 40, tags: 30 },
  rc: { commits: 12_000, refs: 600, merges: 200, tags: 200 }
};
let randomState = SEED >>> 0;

const tierName = process.argv.includes('--tier')
  ? process.argv[process.argv.indexOf('--tier') + 1]
  : 'ci';
const tier = TIERS[tierName];
if (!tier) {
  throw new Error(`Unknown benchmark tier: ${tierName}`);
}

const generated = generateFixture(tier);
const parseStartedAt = performance.now();
const commits = parseRevisionGraphLog(generated.payload);
const graph = buildCommitGraph(commits);
const parseMs = performance.now() - parseStartedAt;

const baseProjectionOptions = {
  refScope: 'all',
  showTags: true,
  showRemoteBranches: true,
  showStashes: true,
  showCurrentBranchDescendants: false
};
const projectionOptions = {
  ...baseProjectionOptions,
  showMergeCommits: true
};
const visibleNodeCountStartedAt = performance.now();
const visibleNodeCount = countMajorOperationsVisibleNodes(graph, projectionOptions);
const visibleNodeCountMs = performance.now() - visibleNodeCountStartedAt;
const projectionStartedAt = performance.now();
const projection = projectMajorOperationsGraph(graph, projectionOptions);
const projectionMs = performance.now() - projectionStartedAt;

const layoutStartedAt = performance.now();
const scene = await buildRevisionGraphScene(graph, projection);
const layoutMs = performance.now() - layoutStartedAt;
const layoutCacheHitStartedAt = performance.now();
const cachedLayout = await layoutProjectedGraphWithRoutes(projection);
const layoutCacheHitMs = performance.now() - layoutCacheHitStartedAt;

const descendantFocusAnchorIndex = Math.floor(tier.commits / 4);
const descendantFocusProjectionStartedAt = performance.now();
const descendantFocusProjection = projectMajorOperationsGraph(graph, {
  ...baseProjectionOptions,
  showMergeCommits: false,
  descendantFocus: {
    anchorRevision: toHash(descendantFocusAnchorIndex),
    anchorLabel: `benchmark commit ${descendantFocusAnchorIndex}`
  }
});
const descendantFocusProjectionMs = performance.now() - descendantFocusProjectionStartedAt;

const descendantFocusLayoutStartedAt = performance.now();
const descendantFocusScene = await buildRevisionGraphScene(graph, descendantFocusProjection);
const descendantFocusLayoutMs = performance.now() - descendantFocusLayoutStartedAt;

if (commits.length !== tier.commits || generated.mergeCount !== tier.merges) {
  throw new Error('Generated benchmark counts do not match the selected manifest.');
}
if (visibleNodeCount !== projection.nodes.length) {
  throw new Error('Visible-node count does not match the projected graph.');
}
if (
  cachedLayout.positions.size !== projection.nodes.length ||
  cachedLayout.edgeRoutes.size !== projection.edges.length
) {
  throw new Error('Cached layout does not match the projected graph.');
}
if (!descendantFocusProjection.nodes.some((node) => node.hash === toHash(descendantFocusAnchorIndex))) {
  throw new Error('Descendant focus benchmark did not retain its non-root anchor.');
}

process.stdout.write(`${JSON.stringify({
  manifest: {
    generatorVersion: GENERATOR_VERSION,
    seed: SEED,
    tier: tierName,
    descendantFocusAnchorIndex,
    ...tier,
    payloadBytes: Buffer.byteLength(generated.payload),
    payloadSha256: createHash('sha256').update(generated.payload).digest('hex')
  },
  measurements: {
    parseMs: round(parseMs),
    visibleNodeCountMs: round(visibleNodeCountMs),
    visibleNodeCount,
    projectionMs: round(projectionMs),
    layoutMs: round(layoutMs),
    layoutCacheHitMs: round(layoutCacheHitMs),
    projectedNodes: projection.nodes.length,
    projectedEdges: projection.edges.length,
    sceneNodes: scene.nodes.length,
    sceneEdges: scene.edges.length,
    descendantFocusProjectionMs: round(descendantFocusProjectionMs),
    descendantFocusLayoutMs: round(descendantFocusLayoutMs),
    descendantFocusProjectedNodes: descendantFocusProjection.nodes.length,
    descendantFocusProjectedEdges: descendantFocusProjection.edges.length,
    descendantFocusSceneNodes: descendantFocusScene.nodes.length,
    descendantFocusSceneEdges: descendantFocusScene.edges.length
  }
}, null, 2)}\n`);

function generateFixture(config) {
  const records = [];
  let mergeCount = 0;
  const mergeIndexes = new Set();
  const interval = Math.max(2, Math.floor(config.commits / config.merges));
  for (let index = interval; mergeIndexes.size < config.merges && index < config.commits; index += interval) {
    mergeIndexes.add(index);
  }
  for (let index = config.commits - 1; mergeIndexes.size < config.merges && index > 1; index -= 1) {
    mergeIndexes.add(index);
  }

  for (let index = config.commits - 1; index >= 0; index -= 1) {
    const hash = toHash(index);
    const parents = [];
    if (index > 0) {
      parents.push(toHash(index - 1));
    }
    if (mergeIndexes.has(index)) {
      parents.push(toHash(Math.max(0, index - Math.max(2, interval - 1))));
      mergeCount += 1;
    }

    const decorations = [];
    const refIndex = config.commits - 1 - index;
    if (refIndex < config.refs) {
      decorations.push(refIndex === 0 ? 'HEAD -> main' : `branch-${refIndex}`);
    }
    if (refIndex < config.tags) {
      decorations.push(`tag: benchmark-${refIndex}`);
    }
    const subject = index === Math.floor(config.commits / 2)
      ? `separator fixture \u001e ${nextRandom()} \u001f`
      : `benchmark commit ${index} ${nextRandom()}`;
    records.push(`\x00${hash}\x00${parents.join(' ')}\x00Benchmark\x002026-06-27\x00${subject}\x00${decorations.join(', ')}`);
  }

  return { payload: records.join(''), mergeCount };
}

function nextRandom() {
  randomState ^= randomState << 13;
  randomState ^= randomState >>> 17;
  randomState ^= randomState << 5;
  return (randomState >>> 0).toString(16).padStart(8, '0');
}

function toHash(index) {
  return index.toString(16).padStart(40, '0');
}

function round(value) {
  return Math.round(value * 100) / 100;
}
