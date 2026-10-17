import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isOwnedBisectLog } from '../src/bugBisect/logOwnership';

test('bisect log ownership accepts only the exact intended command extension', () => {
  const hash = 'a'.repeat(40), other = 'b'.repeat(40);
  const original = `# bad: [${other}] subject\ngit bisect start '--no-checkout' '${other}' '${hash}' '--'\n`;
  const command = ['good', hash];
  assert.equal(isOwnedBisectLog(original, `${original}# good: [${hash}] subject\ngit bisect good ${hash}\n`, command), true);
  assert.equal(isOwnedBisectLog(original, original, command), true);
  assert.equal(isOwnedBisectLog(original, `${original}git bisect bad ${hash}\n`, command), false);
  assert.equal(isOwnedBisectLog(original, `${original}git bisect good ${other}\n`, command), false);
  assert.equal(isOwnedBisectLog(original, `${original}git bisect good ${hash}\ngit bisect bad ${other}\n`, command), false);
  assert.equal(isOwnedBisectLog(original, `git bisect start ${hash} ${other}\n`, command), false);
});

test('selection recovery permits result comments without authorizing another classification', () => {
  const previous = "git bisect good " + 'a'.repeat(40) + '\n';
  assert.equal(isOwnedBisectLog(previous, previous, ['next']), true);
  assert.equal(isOwnedBisectLog(previous, previous + "# first 'bad' commit: [" + 'b'.repeat(40) + '] subject\n', ['next']), true);
  assert.equal(isOwnedBisectLog(previous, previous + 'git bisect bad ' + 'b'.repeat(40) + '\n', ['next']), false);
  assert.equal(isOwnedBisectLog(previous, previous + 'unexpected text\n', ['next']), false);
  assert.equal(isOwnedBisectLog(previous, '# replaced\n', ['next']), false);
});
