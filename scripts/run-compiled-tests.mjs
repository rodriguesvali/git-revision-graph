import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const compiledTestDirectory = path.join(projectRoot, 'out-test', 'test');
const compiledTestFiles = readdirSync(compiledTestDirectory, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.test.js'))
  .map((entry) => path.join('out-test', 'test', entry.name))
  .sort();

if (compiledTestFiles.length === 0) {
  throw new Error(`No compiled test files found in ${compiledTestDirectory}.`);
}

const result = spawnSync(
  process.execPath,
  ['--test', ...compiledTestFiles],
  {
    cwd: projectRoot,
    stdio: 'inherit'
  }
);

if (result.error) {
  throw result.error;
}

if (result.signal) {
  console.error(`The Node test runner terminated with signal ${result.signal}.`);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
