import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { openFlowConfigForRecovery } from '../src/revisionGraph/flow/flowConfigRecovery';

for (const scenario of ['invalid-json', 'missing', 'escape', 'symlink', 'switched', 'open-error'] as const) {
  test(`Flow configuration recovery: ${scenario}`, async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'flow-recovery-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    const configPath = path.join(root, 'flow.json');
    if (scenario !== 'missing') await writeFile(configPath, '{invalid');
    if (scenario === 'symlink') {
      try { await symlink(configPath, path.join(root, 'link.json')); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EPERM') throw error;
        t.skip('Symlink creation unavailable'); return;
      }
    }
    const opened: string[] = [];
    const warnings: string[] = [];
    await openFlowConfigForRecovery(root, scenario === 'escape' ? '../outside.json' : scenario === 'symlink' ? 'link.json' : 'flow.json', {
      isCurrent: () => scenario !== 'switched',
      warn: (message) => warnings.push(message),
      openDocument: async (filePath) => {
        if (scenario === 'open-error') throw new Error('Access denied');
        opened.push(filePath);
      }
    });
    assert.equal(opened.length, scenario === 'invalid-json' ? 1 : 0);
    assert.equal(warnings.length, scenario === 'invalid-json' || scenario === 'switched' ? 0 : 1);
    if (scenario !== 'missing') assert.equal(await readFile(configPath, 'utf8'), '{invalid');
    if (scenario === 'missing') await assert.rejects(readFile(configPath), { code: 'ENOENT' });
    if (scenario === 'escape') assert.match(warnings[0], /configPath in Settings/);
    if (scenario === 'open-error') assert.match(warnings[0], /Access denied/);
  });
}
