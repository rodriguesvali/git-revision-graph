import { spawn } from 'node:child_process';

const commands = [
  ['npx', ['tsc', '--watch', '-p', './']],
  ['node', ['scripts/watch-webview.mjs']]
];

const children = commands.map(([command, args]) =>
  spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32' })
);

function stop() {
  for (const child of children) {
    child.kill();
  }
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

await Promise.all(children.map((child) => new Promise((resolve) => child.once('exit', resolve))));
