import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import * as path from 'node:path';

type PackageScripts = {
  readonly scripts?: Record<string, string>;
};

test('production build cleans compiled output before TypeScript runs', () => {
  const manifest = JSON.parse(
    readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
  ) as PackageScripts;

  assert.equal(
    manifest.scripts?.['clean:out'],
    'node -e "require(\'fs\').rmSync(\'out\', { recursive: true, force: true })"'
  );
  assert.equal(manifest.scripts?.prebuild, 'npm run clean:out');
  assert.equal(manifest.scripts?.build, 'tsc -p ./ && npm run build:webview');
  assert.equal(manifest.scripts?.['build:webview'], 'node scripts/build-webview.mjs');
  assert.equal(manifest.scripts?.['quality:check'], 'node scripts/check-code-quality.mjs');
});

test('code quality gate accepts the reviewed production baseline', () => {
  const result = spawnSync(process.execPath, ['scripts/check-code-quality.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Code quality: \d+ files and \d+ functions checked\./);
});

test('code quality gate requires explicit baselines to match current measurements', () => {
  const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'git-revision-graph-quality-'));
  const temporaryBaselinePath = path.join(temporaryDirectory, 'baseline.json');
  try {
    const baseline = JSON.parse(
      readFileSync(path.join(process.cwd(), 'scripts/code-quality-baseline.json'), 'utf8')
    ) as {
      defaults: { maxFileLines: number; maxFunctionComplexity: number };
      files: Record<string, number>;
      functions: Record<string, number>;
    };
    const fileKey = Object.keys(baseline.files)[0];
    const functionKey = Object.keys(baseline.functions)[0];
    assert.ok(fileKey);
    assert.ok(functionKey);
    baseline.files[fileKey] += 1;
    baseline.functions[functionKey] += 1;
    writeFileSync(temporaryBaselinePath, JSON.stringify(baseline));

    const result = spawnSync(
      process.execPath,
      ['scripts/check-code-quality.mjs', '--baseline', temporaryBaselinePath],
      { cwd: process.cwd(), encoding: 'utf8' }
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, /ratchet the file baseline/);
    assert.match(result.stderr, /ratchet or remove the function baseline/);
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});

test('webview build discovers every isolated config and keeps the bundle last', () => {
  const projectRoot = process.cwd();
  const expectedIsolatedConfigs = readdirSync(projectRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^tsconfig\.webview\..+\.json$/.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
  const result = spawnSync(process.execPath, ['scripts/build-webview.mjs', '--list'], {
    cwd: projectRoot,
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    result.stdout.trim().split(/\r?\n/),
    [...expectedIsolatedConfigs, 'tsconfig.webview.json']
  );
});

test('webview build verifies that every TypeScript source is included in the bundle', () => {
  const result = spawnSync(
    process.execPath,
    ['scripts/build-webview.mjs', '--check-source-coverage'],
    {
      cwd: process.cwd(),
      encoding: 'utf8'
    }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /Webview source coverage: \d+\/\d+ TypeScript files included in tsconfig\.webview\.json\./
  );
});

test('revision graph outbound messages use one shared browser-safe protocol', () => {
  const sharedProtocol = readFileSync(
    path.join(process.cwd(), 'src/revisionGraph/protocol.d.ts'),
    'utf8'
  );
  const hostTypes = readFileSync(
    path.join(process.cwd(), 'src/revisionGraphTypes.ts'),
    'utf8'
  );
  const browserContracts = readFileSync(
    path.join(process.cwd(), 'src/revisionGraph/webview/runtime/contracts.d.ts'),
    'utf8'
  );
  const messageHandler = readFileSync(
    path.join(process.cwd(), 'src/revisionGraph/messageHandler.ts'),
    'utf8'
  );

  assert.match(sharedProtocol, /declare namespace RevisionGraphProtocol/);
  assert.match(sharedProtocol, /type Message\s*=/);
  assert.match(hostTypes, /export type RevisionGraphMessage = RevisionGraphProtocol\.Message;/);
  assert.match(browserContracts, /type RevisionGraphWebviewMessage = RevisionGraphProtocol\.Message;/);
  assert.doesNotMatch(browserContracts, /type RevisionGraphWebviewMessage\s*=\s*\|/);
  assert.doesNotMatch(messageHandler, /as RefActionKind/);
});

test('compiled JavaScript output has a matching TypeScript source', () => {
  const sourceRoot = path.join(process.cwd(), 'src');
  const outputRoot = path.join(process.cwd(), 'out');
  const sourceFiles = new Set(collectRelativeFiles(sourceRoot, '.ts'));
  const outputFiles = collectRelativeFiles(outputRoot, '.js');
  const orphanedOutputs = outputFiles
    .filter((outputPath) => outputPath !== 'webview/revisionGraph.js')
    .filter((outputPath) => !sourceFiles.has(outputPath.replace(/\.js$/, '.ts')));

  assert.deepEqual(
    orphanedOutputs,
    [],
    `compiled JavaScript without matching TypeScript source:\n${orphanedOutputs.join('\n')}`
  );
  assert.equal(outputFiles.includes('webview/revisionGraph.js'), true);
});

function collectRelativeFiles(root: string, extension: string): string[] {
  const files: string[] = [];
  collectFiles(root, root, extension, files);
  return files.sort();
}

function collectFiles(
  root: string,
  directory: string,
  extension: string,
  files: string[]
): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectFiles(root, entryPath, extension, files);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(extension)) {
      files.push(path.relative(root, entryPath).split(path.sep).join('/'));
    }
  }
}
