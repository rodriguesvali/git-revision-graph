import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { configureGitExecutablePath } from '../src/gitExec';
import { DefaultRevisionLogBackend } from '../src/revisionGraph/backendServices/revisionLog';
import { createRepository } from './fakes';
import { createFakeGitExecutable } from './fakeGitExecutable';

async function withQueryGit(total: number, matchIndex: number, nativeBody: string,
  run: (root: string, calls: () => Promise<string[][]>) => Promise<void>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'git-revision-query-batch-'));
  const callsPath = path.join(root, 'calls.jsonl');
  const program = `
    const fs=require('node:fs'),args=process.argv.slice(2);
    fs.appendFileSync(${JSON.stringify(callsPath)},JSON.stringify(args)+'\\n');
    if(args.includes('--no-walk=unsorted')){
      const hashes=args.slice(args.indexOf('--end-of-options')+1,args.includes('--')?args.indexOf('--'):undefined);
      ${nativeBody || `process.stdout.write(hashes.filter(h=>parseInt(h,16)===${matchIndex}).join('\\n'));`}
    }else{
      const count=Number(args.find(a=>a.startsWith('--max-count=')).split('=')[1]);
      const start=Number(args.find(a=>a.startsWith('--skip=')).split('=')[1]);
      let out='';
      for(let i=start;i<Math.min(${total},start+count);i++){
        const hash=i.toString(16).padStart(40,'0');
        out+='\\x1e'+hash+'\\x1f\\x1fAda\\x1f2026-10-03\\x1f\\x1f'+(i===${matchIndex}?'needle':'ordinary')+'\\x1fbody\\x1e';
      }
      process.stdout.write(out);
    }
  `;
  const fake = await createFakeGitExecutable(root, 'query', program);
  configureGitExecutablePath(fake.executablePath, fake.argumentPrefix);
  try {
    await run(root, async () => (await fs.readFile(callsPath, 'utf8')).trim().split('\n').map((line) => JSON.parse(line)));
  } finally {
    configureGitExecutablePath(undefined);
    await fs.rm(root, { recursive: true, force: true });
  }
}

const source = { kind: 'target' as const, revision: 'main', label: 'main' };

test('advanced search checks only the original 2,000 commits in bounded native batches', async () => {
  await withQueryGit(2005, 2000, '', async (root, calls) => {
    const result = await new DefaultRevisionLogBackend().loadRevisionLog(createRepository({ root }), source, 50, 0, false,
      'file:src/ change:needle');
    assert.deepEqual(result.entries, []);
    assert.equal(result.searchTruncated, true);
    const native = (await calls()).filter((args) => args.includes('--no-walk=unsorted'));
    assert.equal(native.length, 10);
    for (const args of native) {
      const hashes = args.slice(args.indexOf('--end-of-options') + 1, args.indexOf('--'));
      assert.equal(hashes.length, 200);
      assert.ok(hashes.every((hash) => Number.parseInt(hash, 16) < 2000));
      assert.ok(args.includes('--first-parent'));
      assert.equal(args.includes('--all'), false);
    }
  });
});

test('advanced search at the exact scan cap does not claim unsearched older history', async () => {
  await withQueryGit(2000, 1999, '', async (root) => {
    const result = await new DefaultRevisionLogBackend().loadRevisionLog(createRepository({ root }), source, 50, 0, false,
      'change:needle');
    assert.deepEqual(result.entries.map((entry) => Number.parseInt(entry.hash, 16)), [1999]);
    assert.equal(result.searchTruncated, false);
    assert.equal(result.hasMore, false);
  });
});

test('metadata phrase is applied before native work and skips batches without candidates', async () => {
  await withQueryGit(401, 400, '', async (root, calls) => {
    const result = await new DefaultRevisionLogBackend().loadRevisionLog(createRepository({ root }), source, 50, 0, false,
      'change:needle needle');
    assert.equal(result.entries.length, 1);
    const native = (await calls()).filter((args) => args.includes('--no-walk=unsorted'));
    assert.equal(native.length, 1);
    assert.deepEqual(native[0].slice(native[0].indexOf('--end-of-options') + 1), [(400).toString(16).padStart(40, '0')]);
  });
});

test('a replacement search cancels the active native query', async () => {
  await withQueryGit(1, 0, "setTimeout(()=>process.stdout.write(hashes.join('\\n')),10000);", async (root, calls) => {
    const controller = new AbortController();
    const pending = new DefaultRevisionLogBackend().loadRevisionLog(createRepository({ root }), source, 50, 0, false,
      'change:needle', controller.signal);
    const rejection = assert.rejects(pending, { name: 'AbortError' });
    const deadline = Date.now() + 5000;
    while (!(await calls().catch(() => [])).some((args) => args.includes('--no-walk=unsorted'))) {
      assert.ok(Date.now() < deadline, 'The native query must start');
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    controller.abort();
    await rejection;
  });
});

test('native query failures remain errors instead of being reported as no results', async () => {
  await withQueryGit(1, 0, "process.stderr.write('Pickaxe failed');process.exit(1);", async (root) => {
    await assert.rejects(new DefaultRevisionLogBackend().loadRevisionLog(createRepository({ root }), source, 50, 0, false,
      'change:needle'), /exited with code 1/);
  });
});
