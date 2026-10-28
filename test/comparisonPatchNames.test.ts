import test from 'node:test';
import assert from 'node:assert/strict';
import { ComparisonPatchNames } from '../src/patches/comparisonNames';

const source = { refName: '03fee33b' + 'a'.repeat(32), label: 'main' };
const target = { refName: '4690b54b' + 'b'.repeat(32), label: 'feature/login' };

test('comparison names include safe labels and hashes, preserve direction and skip existing numbers', () => {
  const names = new ComparisonPatchNames();
  const first = names.prepare('/repo', source, target, [
    'main-03fee33b-to-feature-login-4690b54b-1.patch', 'main-03fee33b-to-feature-login-4690b54b-5.patch',
    'main-03fee33b-to-feature-login-4690b54b-999.txt', 'unrelated.patch'
  ]);
  assert.equal(first.name, 'main-03fee33b-to-feature-login-4690b54b-6.patch');
  assert.equal(names.prepare('/repo', target, source, []).name, 'feature-login-4690b54b-to-main-03fee33b-1.patch');
});

test('only successful saves advance a counter independently for repositories and endpoints', () => {
  const names = new ComparisonPatchNames();
  const first = names.prepare('/repo', source, target, []);
  assert.equal(names.prepare('/repo', source, target, []).name, first.name);
  first.saved();
  assert.equal(names.prepare('/repo', source, target, []).name, 'main-03fee33b-to-feature-login-4690b54b-2.patch');
  assert.equal(names.prepare('/other', source, target, []).name, first.name);
  assert.equal(names.prepare('/repo', source, { refName: 'c'.repeat(40), label: 'c'.repeat(8) }, []).name,
    'main-03fee33b-to-cccccccc-1.patch');
});

test('worktree and commit names are clear and revisions must be immutable', () => {
  const names = new ComparisonPatchNames();
  assert.equal(names.prepare('/repo', source, undefined, []).name, 'main-03fee33b-to-worktree-1.patch');
  assert.equal(names.prepare('/repo', { ...source, label: source.refName }, { ...target, label: target.refName.slice(0, 8) }, []).name,
    '03fee33b-to-4690b54b-1.patch');
  assert.throws(() => names.prepare('/repo', { ...source, refName: '../outside' }, target, []), /immutable/i);
  assert.throws(() => names.prepare('/repo', source, { ...target, refName: 'HEAD' }, []), /immutable/i);
});

test('labels are bounded, portable and cannot escape the chosen directory', () => {
  const names = new ComparisonPatchNames();
  const unicode = names.prepare('/repo', { ...source, label: '界'.repeat(80) }, { ...target, label: '../feature\\name:*?' }, []).name;
  assert.equal(unicode, `${'界'.repeat(13)}-03fee33b-to-feature-name-4690b54b-1.patch`);
  assert.ok(Buffer.byteLength(unicode, 'utf8') < 255);
  assert.equal(names.prepare('/repo', { ...source, label: '../' }, undefined, []).name, '03fee33b-to-worktree-1.patch');
});
