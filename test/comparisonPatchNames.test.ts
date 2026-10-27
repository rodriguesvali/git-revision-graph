import test from 'node:test';
import assert from 'node:assert/strict';
import { ComparisonPatchNames } from '../src/patches/comparisonNames';

const source = '03fee33b' + 'a'.repeat(32), target = '4690b54b' + 'b'.repeat(32);

test('comparison patch names preserve direction and skip existing numbered names', () => {
  const names = new ComparisonPatchNames();
  const first = names.prepare('/repo', source, target, [
    'from03fee33bto4690b54bcompare_1.patch', 'from03fee33bto4690b54bcompare_5.patch',
    'from03fee33bto4690b54bcompare_999.txt', 'unrelated.patch'
  ]);
  assert.equal(first.name, 'from03fee33bto4690b54bcompare_6.patch');
  assert.equal(names.prepare('/repo', target, source, []).name, 'from4690b54bto03fee33bcompare_1.patch');
});

test('only successful saves advance a comparison counter, even when files are saved elsewhere or moved', () => {
  const names = new ComparisonPatchNames();
  const first = names.prepare('/repo', source, target, []);
  assert.equal(names.prepare('/repo', source, target, []).name, first.name, 'cancel/failure does not consume a number');
  first.saved();
  assert.equal(names.prepare('/repo', source, target, []).name, 'from03fee33bto4690b54bcompare_2.patch');
  assert.equal(names.prepare('/other', source, target, []).name, first.name, 'repository counters are independent');
  assert.equal(names.prepare('/repo', source, 'c'.repeat(40), []).name, 'from03fee33btocccccccccompare_1.patch');
});

test('worktree targets are explicit and filename revisions must be immutable', () => {
  const names = new ComparisonPatchNames();
  assert.equal(names.prepare('/repo', source, undefined, []).name, 'from03fee33btoworktreecompare_1.patch');
  assert.throws(() => names.prepare('/repo', '../outside', target, []), /immutable/i);
  assert.throws(() => names.prepare('/repo', source, 'HEAD', []), /immutable/i);
});
