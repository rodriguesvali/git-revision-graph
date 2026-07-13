import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
const typescriptCompiler = require.resolve('typescript/bin/tsc');
const bundleConfig = 'tsconfig.webview.json';

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

if (process.argv.includes('--list')) {
  process.stdout.write(`${getWebviewBuildConfigs().join('\n')}\n`);
} else {
  for (const config of getWebviewBuildConfigs()) {
    runNodeScript(typescriptCompiler, ['-p', config]);
  }
  runNodeScript(fileURLToPath(new URL('wrap-webview-runtime.mjs', import.meta.url)));
}
