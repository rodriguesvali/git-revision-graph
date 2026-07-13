import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = path.resolve(process.cwd());
const SOURCE_ROOT = path.join(PROJECT_ROOT, 'src');
const CRITICAL_REVISION_GRAPH_BOUNDARIES = [
  'src/revisionGraph/source/graphGit.ts',
  'src/revisionGraphTypes.ts',
  'src/revisionGraphData.ts',
  'src/revisionGraph/webview/shared.ts'
];
const WEBVIEW_ENVIRONMENT_PATH = path.join(
  PROJECT_ROOT,
  'src/revisionGraph/webview/runtime/environment.d.ts'
);

test('revision graph type boundary modules do not form import cycles', () => {
  const graph = buildSourceImportGraph();

  for (const boundary of CRITICAL_REVISION_GRAPH_BOUNDARIES) {
    const cycle = findCycleFrom(boundary, graph);
    assert.equal(
      cycle,
      undefined,
      `Expected no import cycle from ${boundary}, found ${cycle?.join(' -> ')}`
    );
  }
});

test('revision graph webview environment does not weaken standard browser globals', () => {
  const source = readFileSync(WEBVIEW_ENVIRONMENT_PATH, 'utf8');
  const browserGlobals = [
    'window',
    'document',
    'console',
    'performance',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'setTimeout',
    'clearTimeout'
  ];

  for (const globalName of browserGlobals) {
    assert.doesNotMatch(
      source,
      new RegExp(`declare\\s+(?:const|let|var)\\s+${globalName}\\b`),
      `${globalName} must use the standard DOM library type.`
    );
  }
  assert.match(source, /declare function acquireVsCodeApi\(\): RevisionGraphRuntimeVsCodeApi;/);
  assert.doesNotMatch(source, /:\s*any\b/);
});

function buildSourceImportGraph(): Map<string, readonly string[]> {
  const graph = new Map<string, readonly string[]>();
  for (const filePath of listTypeScriptFiles(SOURCE_ROOT)) {
    const sourceId = toSourceId(filePath);
    graph.set(sourceId, resolveInternalImports(filePath));
  }
  return graph;
}

function listTypeScriptFiles(directory: string): string[] {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listTypeScriptFiles(entryPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(entryPath);
    }
  }
  return files;
}

function resolveInternalImports(filePath: string): string[] {
  const source = readFileSync(filePath, 'utf8');
  const imports = new Set<string>();
  const importPattern = /\b(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;

  while ((match = importPattern.exec(source)) !== null) {
    const specifier = match[1];
    if (!specifier.startsWith('.')) {
      continue;
    }

    const resolved = resolveTypeScriptImport(filePath, specifier);
    if (resolved) {
      imports.add(resolved);
    }
  }

  return [...imports].sort();
}

function resolveTypeScriptImport(filePath: string, specifier: string): string | undefined {
  const basePath = path.resolve(path.dirname(filePath), specifier);
  const candidates = [
    `${basePath}.ts`,
    path.join(basePath, 'index.ts')
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return toSourceId(candidate);
    }
  }

  return undefined;
}

function findCycleFrom(
  start: string,
  graph: ReadonlyMap<string, readonly string[]>
): readonly string[] | undefined {
  const pathStack: string[] = [];
  const visited = new Set<string>();

  function visit(node: string): readonly string[] | undefined {
    pathStack.push(node);
    visited.add(node);

    for (const next of graph.get(node) ?? []) {
      if (next === start) {
        return [...pathStack, start];
      }

      if (visited.has(next)) {
        continue;
      }

      const cycle = visit(next);
      if (cycle) {
        return cycle;
      }
    }

    pathStack.pop();
    return undefined;
  }

  return visit(start);
}

function toSourceId(filePath: string): string {
  return path.relative(PROJECT_ROOT, filePath).split(path.sep).join('/');
}
