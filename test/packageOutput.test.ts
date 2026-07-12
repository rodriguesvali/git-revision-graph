import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
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
  assert.match(manifest.scripts?.['build:webview'] ?? '', /^tsc -p \.\/tsconfig\.webview\.api\.json/);
  assert.match(manifest.scripts?.['build:webview'] ?? '', /tsc -p \.\/tsconfig\.webview\.zoom-toolbar-ui\.json/);
  assert.match(manifest.scripts?.['build:webview'] ?? '', /tsc -p \.\/tsconfig\.webview\.virtual-viewport\.json/);
  assert.match(manifest.scripts?.['build:webview'] ?? '', /tsc -p \.\/tsconfig\.webview\.virtual-index\.json/);
  assert.match(manifest.scripts?.['build:webview'] ?? '', /tsc -p \.\/tsconfig\.webview\.virtual-scene\.json/);
  assert.match(manifest.scripts?.['build:webview'] ?? '', /tsc -p \.\/tsconfig\.webview\.virtual-scene-selection\.json/);
  assert.match(manifest.scripts?.['build:webview'] ?? '', /tsc -p \.\/tsconfig\.webview\.edge-markup\.json/);
  assert.match(manifest.scripts?.['build:webview'] ?? '', /tsc -p \.\/tsconfig\.webview\.node-presentation\.json/);
  assert.match(manifest.scripts?.['build:webview'] ?? '', /tsc -p \.\/tsconfig\.webview\.node-markup\.json/);
  assert.match(manifest.scripts?.['build:webview'] ?? '', /tsc -p \.\/tsconfig\.webview\.virtual-scene-dom\.json/);
  assert.match(manifest.scripts?.['build:webview'] ?? '', /tsc -p \.\/tsconfig\.webview\.center-head-toolbar-ui\.json/);
  assert.match(manifest.scripts?.['build:webview'] ?? '', /tsc -p \.\/tsconfig\.webview\.virtual-scene-lifecycle\.json/);
  assert.match(manifest.scripts?.['build:webview'] ?? '', /tsc -p \.\/tsconfig\.webview\.virtual-scene-scheduler\.json/);
  assert.match(manifest.scripts?.['build:webview'] ?? '', /tsc -p \.\/tsconfig\.webview\.scene-render-lifecycle\.json/);
  assert.match(manifest.scripts?.['build:webview'] ?? '', /tsc -p \.\/tsconfig\.webview\.scene-geometry-ui\.json/);
  assert.match(manifest.scripts?.['build:webview'] ?? '', /tsc -p \.\/tsconfig\.webview\.json$/);
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
