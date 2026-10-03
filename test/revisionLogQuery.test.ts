import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRevisionLogQuery, buildRevisionLogQueryGitArgs } from '../src/revisionGraph/source/revisionLogQuery';

test('ordinary text preserves the existing case-insensitive literal phrase', () => {
  for (const input of ['  Fix  parser  ', 'tag:v1.7.3', 'author:Ada', 'https://file:example', 'if(']) {
    assert.deepEqual(parseRevisionLogQuery(input), { text: input.trim().toLocaleLowerCase() });
  }
  assert.deepEqual(parseRevisionLogQuery(undefined), { text: '' });
});

test('file and change filters are independent of metadata phrase and preserve value case', () => {
  assert.deepEqual(parseRevisionLogQuery('Fix parser FILE:src/Auth/ change:"Validate Token("'),
    { text: 'fix parser', file: 'src/Auth/', change: 'Validate Token(' });
  assert.deepEqual(parseRevisionLogQuery('file:"src/auth token.ts" fix parser'),
    { text: 'fix parser', file: 'src/auth token.ts' });
  assert.deepEqual(parseRevisionLogQuery('change:"file:src/ and change:literal"'),
    { text: '', change: 'file:src/ and change:literal' });
  assert.deepEqual(parseRevisionLogQuery(String.raw`file:src\auth\token.ts change:"say \"hello\" \\"`),
    { text: '', file: 'src/auth/token.ts', change: 'say "hello" \\' });
});

test('invalid operator values produce actionable errors', () => {
  for (const input of ['file:', 'change:', 'file:""', 'change:" "', 'file:"open',
    'change:"open', 'file:"src"extra', 'file:a file:b', 'change:a change:b']) {
    assert.throws(() => parseRevisionLogQuery(input), /value|quote|space|only one/);
  }
  for (const input of ['file:/etc/passwd', 'file:C:/secret', String.raw`file:\\server\share`,
    'file:../outside', 'file:src/../../outside']) {
    assert.throws(() => parseRevisionLogQuery(input), /repository-relative/);
  }
  for (const value of ['x\0y', 'x\ny', 'x\ry', 'x'.repeat(1025)]) {
    assert.throws(() => parseRevisionLogQuery(`change:"${value}"`), /single line/);
  }
});

test('native query arguments escape regex and pathspec syntax and only inspect explicit hashes', () => {
  const hash = 'a'.repeat(40);
  const args = buildRevisionLogQueryGitArgs([hash], parseRevisionLogQuery(String.raw`file::(glob)* change:"if(x) + [a].* \\"`));
  assert.ok(args.includes('-Gif\\(x\\) \\+ \\[a\\]\\.\\* \\\\'));
  assert.deepEqual(args.slice(-4), ['--end-of-options', hash, '--', ':(literal):(glob)*']);
  assert.ok(args.includes('--no-walk=unsorted'));
  assert.ok(args.includes('--diff-filter=ACDMRTUXB'));
  assert.ok(args.includes('--root'));
  assert.ok(args.includes('--no-ext-diff'));
  assert.ok(args.includes('--no-textconv'));
  assert.ok(args.includes('-m'));
  assert.ok(args.includes('--first-parent'));
  assert.ok(args.includes('--no-show-signature'));
  assert.throws(() => buildRevisionLogQueryGitArgs([], { text: '' }), /valid commit hashes/);
  assert.throws(() => buildRevisionLogQueryGitArgs(['--all'], { text: '' }), /valid commit hashes/);
  assert.throws(() => buildRevisionLogQueryGitArgs([hash + '..HEAD'], { text: '' }), /valid commit hashes/);
});
