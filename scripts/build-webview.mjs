import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join, relative, sep } from 'node:path';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
const typescriptCompiler = require.resolve('typescript/bin/tsc');
const bundleConfig = 'tsconfig.webview.json';
const webviewSourceDirectories = [
  'src/revisionGraph/webview/runtime',
  'src/revisionGraph/webview/script'
];

export function discoverWebviewSourceFiles(root = projectRoot) {
  return webviewSourceDirectories
    .flatMap((directory) => collectTypeScriptFiles(root, join(root, directory)))
    .sort((left, right) => left.localeCompare(right));
}

export function getBundledWebviewSourceFiles(root = projectRoot) {
  const configPath = join(root, bundleConfig);
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  if (!Array.isArray(config.files)) {
    throw new Error(`${bundleConfig} must declare an explicit files array.`);
  }

  return config.files
    .filter((file) => typeof file === 'string')
    .map((file) => file.split('/').join(sep))
    .map((file) => relative(root, join(root, file)).split(sep).join('/'))
    .sort((left, right) => left.localeCompare(right));
}

export function assertWebviewSourceCoverage(root = projectRoot) {
  const sourceFiles = discoverWebviewSourceFiles(root);
  const bundledFiles = new Set(getBundledWebviewSourceFiles(root));
  const uncoveredFiles = sourceFiles.filter((file) => !bundledFiles.has(file));

  if (uncoveredFiles.length > 0) {
    throw new Error(
      `Webview TypeScript sources missing from ${bundleConfig}:\n${uncoveredFiles.join('\n')}`
    );
  }

  return sourceFiles.length;
}

export function discoverWebviewTypecheckConfigs(root = projectRoot) {
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /^tsconfig\.webview\..+\.json$/.test(name))
    .sort((left, right) => left.localeCompare(right));
}

export function getWebviewBuildConfigs(root = projectRoot) {
  return [...discoverWebviewTypecheckConfigs(root), bundleConfig];
}

function runNodeScript(script, args = []) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: projectRoot,
    stdio: 'inherit'
  });
  if (result.error) throw result.error;
  if (result.signal) throw new Error(`${script} terminated with signal ${result.signal}.`);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function collectTypeScriptFiles(root, directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTypeScriptFiles(root, entryPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(relative(root, entryPath).split(sep).join('/'));
    }
  }
  return files;
}

if (process.argv.includes('--list')) {
  process.stdout.write(`${getWebviewBuildConfigs().join('\n')}\n`);
} else if (process.argv.includes('--check-source-coverage')) {
  const sourceCount = assertWebviewSourceCoverage();
  process.stdout.write(
    `Webview source coverage: ${sourceCount}/${sourceCount} TypeScript files included in ${bundleConfig}.\n`
  );
} else {
  assertWebviewSourceCoverage();
  for (const config of getWebviewBuildConfigs()) {
    runNodeScript(typescriptCompiler, ['-p', config]);
  }
  runNodeScript(fileURLToPath(new URL('wrap-webview-runtime.mjs', import.meta.url)));
}
