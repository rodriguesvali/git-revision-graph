import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, watch } from 'node:fs';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const outputDirectory = `${projectRoot}/out/webview`;
mkdirSync(outputDirectory, { recursive: true });

let wrapTimer;
function scheduleRuntimeWrap() {
  clearTimeout(wrapTimer);
  wrapTimer = setTimeout(() => {
    const result = spawnSync(process.execPath, ['scripts/wrap-webview-runtime.mjs'], {
      cwd: projectRoot,
      stdio: 'inherit'
    });
    if (result.error) {
      console.error(result.error);
    }
  }, 100);
}

const outputWatcher = watch(outputDirectory, (_eventType, filename) => {
  if (filename === 'revisionGraph.js' || filename === 'revisionGraph.js.map') {
    scheduleRuntimeWrap();
  }
});
const compiler = spawn(
  'npx',
  ['tsc', '--watch', '-p', './tsconfig.webview.json'],
  { cwd: projectRoot, stdio: 'inherit', shell: process.platform === 'win32' }
);

function stop() {
  clearTimeout(wrapTimer);
  outputWatcher.close();
  compiler.kill();
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
await new Promise((resolve) => compiler.once('exit', resolve));
outputWatcher.close();
