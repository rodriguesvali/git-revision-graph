import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
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
