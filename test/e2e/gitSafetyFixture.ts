import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
export function git(root: string, args: readonly string[]): string {
  return execFileSync('git', [...args], { cwd: root, encoding: 'utf8', stdio: 'pipe' }).trim();
}

export function contents(root: string, file = 'same.txt'): string { return readFileSync(path.join(root, file), 'utf8'); }
export function indexState(root: string): string { return git(root, ['ls-files', '--stage']); }
export function checkoutLog(root: string): string[] {
  return git(root, ['reflog', '--format=%gs']).split('\n').filter(line => line.startsWith('checkout:'));
}
/** Only the extension's targeted CLI is faulted; vscode.git continues to use real Git. */
export class GitFault implements Disposable {
  readonly started: string;
  readonly release: string;
  private readonly configure: (executable: unknown, prefix?: readonly string[]) => void;
  constructor(extensionPath: string, root: string, mode: 'fail-restore' | 'hold-log') {
    const fixtureRoot = process.env.GIT_REVISION_GRAPH_E2E_FIXTURE_ROOT!;
    assert.ok(fixtureRoot && root.startsWith(fixtureRoot + path.sep), 'Faults must stay inside the disposable fixture');
    const id = randomUUID();
    const configPath = path.join(fixtureRoot, `${id}.json`);
    const script = path.join(fixtureRoot, `${id}.cjs`);
    this.started = path.join(fixtureRoot, `${id}.started`);
    this.release = path.join(fixtureRoot, `${id}.release`);
    writeFileSync(configPath, JSON.stringify({ root, mode, started: this.started, release: this.release }));
    writeFileSync(script, `
   const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
   const config=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),args=process.argv.slice(3);
   if(path.resolve(process.cwd())===path.resolve(config.root)) {
    if(config.mode==='hold-log' && args.includes('log')) {
     fs.writeFileSync(config.started,'started');
     while(!fs.existsSync(config.release)) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,20);
    }
    if(config.mode==='fail-restore' && args.includes('restore')) {
     const result=spawnSync('git',args,{stdio:'inherit'});
     if(result.status!==0) process.exit(result.status || 1);
     fs.writeFileSync(config.started,'real restore completed before injected failure');
     process.stderr.write('injected E2E restore failure');process.exit(1);
    }
   }
   const result=spawnSync('git',args,{stdio:'inherit'});
   if(result.error) throw result.error;process.exit(result.status ?? 1);
  `);
    const module = require(path.join(extensionPath, 'out', 'gitExec.js')) as {
      configureGitExecutablePath: (executable: unknown, prefix?: readonly string[]) => void;
    };
    this.configure = module.configureGitExecutablePath;
    const node = process.env.GIT_REVISION_GRAPH_E2E_NODE;
    assert.ok(node && existsSync(node), 'Runner must supply the Node executable, not Electron');
    this.configure(node, [script, configPath]);
  }
  unblock(): void { writeFileSync(this.release, 'release'); }
  dispose(): void { this.unblock(); this.configure(undefined); }
}

interface Disposable {
  dispose(): void;
}
