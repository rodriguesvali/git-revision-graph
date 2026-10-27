import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPatchWorkflow, type PatchApplyServices } from '../src/patches/applyWorkflow';

function harness() {
  const calls: string[] = []; let current = true;
  const services: PatchApplyServices = {
    assertCurrent() { if (!current) throw new Error('obsolete'); },
    async inspectTarget() { calls.push('inspect'); },
    async pickPatch() { calls.push('pick'); return Buffer.from('patch'); },
    async prepare() { calls.push('prepare'); return { filePath: '/private/patch', async dispose() { calls.push('dispose'); } }; },
    async check() { calls.push('check'); return '1 file'; },
    async confirm() { calls.push('confirm'); return true; },
    async apply() { calls.push('apply'); },
    async refresh() { calls.push('refresh'); }
  };
  return { calls, services, expire() { current = false; } };
}

test('patch apply checks target and the same input again after confirmation, then cleans up', async () => {
  const h = harness(); await applyPatchWorkflow(h.services);
  assert.deepEqual(h.calls, ['inspect', 'pick', 'inspect', 'prepare', 'check', 'confirm', 'inspect', 'check', 'apply', 'refresh', 'dispose']);
});

test('patch dialog and confirmation cancellation never mutate', async () => {
  for (const stage of ['pick', 'confirm']) {
    const h = harness();
    if (stage === 'pick') h.services.pickPatch = async () => undefined;
    else h.services.confirm = async () => false;
    await applyPatchWorkflow(h.services); assert.ok(!h.calls.includes('apply'));
    assert.equal(h.calls.includes('dispose'), stage === 'confirm');
  }
});

test('context expiry or newly dirty target after a dialog aborts and cleans up', async () => {
  for (const stage of ['pick', 'confirm', 'check']) {
    const h = harness();
    if (stage === 'pick') h.services.pickPatch = async () => { h.expire(); return Buffer.from('patch'); };
    if (stage === 'confirm') h.services.confirm = async () => { h.expire(); return true; };
    if (stage === 'check') h.services.check = async () => { h.expire(); return 'files'; };
    await assert.rejects(applyPatchWorkflow(h.services), /obsolete/);
    assert.ok(!h.calls.includes('apply'));
    assert.equal(h.calls.includes('dispose'), stage !== 'pick');
  }
  const h = harness(); let checks = 0;
  h.services.inspectTarget = async () => { if (++checks === 3) throw new Error('not clean'); };
  await assert.rejects(applyPatchWorkflow(h.services), /clean/);
  assert.ok(h.calls.includes('dispose')); assert.ok(!h.calls.includes('apply'));
});

test('apply failure refreshes actual state, never attempts reverse/reset, and releases input', async () => {
  const h = harness(); h.services.apply = async () => { h.calls.push('apply'); throw new Error('disk error'); };
  await assert.rejects(applyPatchWorkflow(h.services), /disk error/);
  assert.deepEqual(h.calls.slice(-3), ['apply', 'refresh', 'dispose']);
});
