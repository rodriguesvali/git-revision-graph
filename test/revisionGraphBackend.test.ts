import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { DefaultRevisionGraphDocumentBackend } from '../src/revisionGraph/backendServices/document';
import { DefaultRevisionGraphMergeAnalysisBackend } from '../src/revisionGraph/backendServices/mergeAnalysis';
import { DefaultRevisionGraphBackend, RevisionGraphLimitPolicy } from '../src/revisionGraph/backend';
import type { RevisionGraphLoadTraceEvent } from '../src/revisionGraph/loadTrace';
import { buildCommitGraph } from '../src/revisionGraph/model/commitGraph';
import { createDefaultRevisionGraphProjectionOptions } from '../src/revisionGraphTypes';
import { RefType } from '../src/git';
import { configureGitExecutablePath } from '../src/gitExec';
import { createBranch, createRef, createRepository } from './fakes';
import { createFakeGitExecutable } from './fakeGitExecutable';

async function withFakeGitScript<T>(
  script: string,
  run: (repositoryPath: string, callsPath: string) => Promise<T>
): Promise<T> {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'git-revision-graph-backend-'));
  const binDir = path.join(temporaryRoot, 'bin');
  const repositoryPath = path.join(temporaryRoot, 'repo');
  const callsPath = path.join(temporaryRoot, 'git-calls.log');
  const originalCallsPath = process.env.GIT_REVISION_GRAPH_FAKE_GIT_CALLS;

  await fs.mkdir(binDir, { recursive: true });
  await fs.mkdir(repositoryPath, { recursive: true });
  const fakeGit = await createFakeGitExecutable(binDir, 'git', script);
  configureGitExecutablePath(fakeGit.executablePath, fakeGit.argumentPrefix);
  process.env.GIT_REVISION_GRAPH_FAKE_GIT_CALLS = callsPath;

  try {
    return await run(repositoryPath, callsPath);
  } finally {
    configureGitExecutablePath(undefined);
    if (originalCallsPath === undefined) {
      delete process.env.GIT_REVISION_GRAPH_FAKE_GIT_CALLS;
    } else {
      process.env.GIT_REVISION_GRAPH_FAKE_GIT_CALLS = originalCallsPath;
    }
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
}

function createFakeGitProgram(
  body: string,
  recordedCall: 'args' | 'call' | 'none' = 'args'
): string {
  return [
    "const fs = require('node:fs');",
    'const args = process.argv.slice(2);',
    'const callsPath = process.env.GIT_REVISION_GRAPH_FAKE_GIT_CALLS;',
    recordedCall === 'args'
      ? "fs.appendFileSync(callsPath, `${args.join(' ')}\\n`);"
      : recordedCall === 'call'
        ? "fs.appendFileSync(callsPath, 'call\\n');"
        : '',
    body
  ].filter(Boolean).join('\n');
}

test('reuses completed graph snapshot cache entries for cancelable refreshes', async () => {
  await withFakeGitScript(
    createFakeGitProgram(
      "process.stdout.write('head1\\x1f\\x1fAda\\x1f2026-05-01\\x1fBootstrap\\x1fHEAD -> main\\x1e');",
      'call'
    ),
    async (repositoryPath, callsPath) => {
      const backend = new DefaultRevisionGraphBackend();
      const repository = createRepository({
        root: repositoryPath,
        head: createBranch({ type: RefType.Head, name: 'main', commit: 'head1' }),
        refs: [
          createRef({ type: RefType.Head, name: 'main', commit: 'head1' })
        ]
      });
      const limitPolicy: RevisionGraphLimitPolicy = {
        initialLimit: 50,
        steppedLimits: [],
        minVisibleNodes: 1,
        graphCommandTimeoutMs: 60000
      };
      const events: RevisionGraphLoadTraceEvent[] = [];

      const firstSnapshot = await backend.loadGraphSnapshot(
        repository,
        createDefaultRevisionGraphProjectionOptions(),
        limitPolicy,
        undefined,
        (event) => events.push(event)
      );
      const abortController = new AbortController();
      const secondSnapshot = await backend.loadGraphSnapshot(
        repository,
        createDefaultRevisionGraphProjectionOptions(),
        limitPolicy,
        abortController.signal,
        (event) => events.push(event)
      );
      const calls = await fs.readFile(callsPath, 'utf8');

      assert.equal(firstSnapshot.graph.orderedCommits.length, 1);
      assert.equal(secondSnapshot, firstSnapshot);
      assert.equal(calls.trim().split('\n').length, 1);
      assert.ok(events.some((event) =>
        event.phase === 'snapshot.cache'
        && event.detail?.includes('result=hit')
        && event.detail.includes('signal=true')
        && event.detail.includes('reason=completed')
      ));
    }
  );
});

test('clears completed graph snapshot cache entries on request', async () => {
  await withFakeGitScript(
    createFakeGitProgram(
      "process.stdout.write('head1\\x1f\\x1fAda\\x1f2026-05-01\\x1fBootstrap\\x1fHEAD -> main\\x1e');",
      'call'
    ),
    async (repositoryPath, callsPath) => {
      const backend = new DefaultRevisionGraphBackend();
      const repository = createRepository({
        root: repositoryPath,
        head: createBranch({ type: RefType.Head, name: 'main', commit: 'head1' }),
        refs: [
          createRef({ type: RefType.Head, name: 'main', commit: 'head1' })
        ]
      });
      const limitPolicy: RevisionGraphLimitPolicy = {
        initialLimit: 50,
        steppedLimits: [],
        minVisibleNodes: 1,
        graphCommandTimeoutMs: 60000
      };

      await backend.loadGraphSnapshot(
        repository,
        createDefaultRevisionGraphProjectionOptions(),
        limitPolicy
      );
      backend.clearGraphSnapshotCache();
      await backend.loadGraphSnapshot(
        repository,
        createDefaultRevisionGraphProjectionOptions(),
        limitPolicy
      );

      const calls = await fs.readFile(callsPath, 'utf8');
      assert.equal(calls.trim().split('\n').length, 2);
    }
  );
});

test('reuses graph snapshot cache entries when ref names change on the same commits', async () => {
  await withFakeGitScript(
    createFakeGitProgram(
      "process.stdout.write('head1\\x1f\\x1fAda\\x1f2026-05-01\\x1fBootstrap\\x1fHEAD -> main\\x1e');",
      'call'
    ),
    async (repositoryPath, callsPath) => {
      const backend = new DefaultRevisionGraphBackend();
      const refs = [
        createRef({ type: RefType.Head, name: 'main', commit: 'head1' })
      ];
      const repository = createRepository({
        root: repositoryPath,
        head: createBranch({ type: RefType.Head, name: 'main', commit: 'head1' }),
        refs
      });
      const limitPolicy: RevisionGraphLimitPolicy = {
        initialLimit: 50,
        steppedLimits: [],
        minVisibleNodes: 1,
        graphCommandTimeoutMs: 60000
      };
      const events: RevisionGraphLoadTraceEvent[] = [];

      await backend.loadGraphSnapshot(
        repository,
        createDefaultRevisionGraphProjectionOptions(),
        limitPolicy,
        undefined,
        (event) => events.push(event)
      );
      refs.splice(
        0,
        refs.length,
        createRef({ type: RefType.Head, name: 'release/2026', commit: 'head1' })
      );
      (repository.state as { HEAD: ReturnType<typeof createBranch> }).HEAD = createBranch({
        type: RefType.Head,
        name: 'release/2026',
        commit: 'head1'
      });

      await backend.loadGraphSnapshot(
        repository,
        createDefaultRevisionGraphProjectionOptions(),
        limitPolicy,
        undefined,
        (event) => events.push(event)
      );
      const calls = await fs.readFile(callsPath, 'utf8');

      assert.equal(calls.trim().split('\n').length, 1);
      assert.ok(events.some((event) =>
        event.phase === 'snapshot.cache'
        && event.detail?.includes('result=hit')
        && event.detail.includes('reason=completed')
      ));
    }
  );
});

test('graph snapshot loading uses request-scoped refs when provided', async () => {
  await withFakeGitScript(
    createFakeGitProgram(
      "process.stdout.write('head1\\x1f\\x1fAda\\x1f2026-05-01\\x1fBootstrap\\x1forigin/main\\x1e');",
      'call'
    ),
    async (repositoryPath, callsPath) => {
      const backend = new DefaultRevisionGraphBackend();
      const repository = createRepository({
        root: repositoryPath,
        head: createBranch({ type: RefType.Head, name: 'main', commit: 'head1' }),
        refs: [
          createRef({ type: RefType.Head, name: 'main', commit: 'head1' })
        ]
      });
      repository.getRefs = async () => {
        throw new Error('repository.getRefs should not be called when request-scoped refs are provided.');
      };
      const limitPolicy: RevisionGraphLimitPolicy = {
        initialLimit: 50,
        steppedLimits: [],
        minVisibleNodes: 1,
        graphCommandTimeoutMs: 60000
      };

      const snapshot = await backend.loadGraphSnapshot(
        repository,
        createDefaultRevisionGraphProjectionOptions(),
        limitPolicy,
        undefined,
        undefined,
        {
          repositoryRefs: [
            createRef({ type: RefType.RemoteHead, remote: 'origin', name: 'origin/main', commit: 'head1' })
          ]
        }
      );
      const calls = await fs.readFile(callsPath, 'utf8');

      assert.equal(calls.trim().split('\n').length, 1);
      assert.deepEqual(snapshot.graph.orderedCommits[0]?.refs, [
        { name: 'origin/main', kind: 'remote' }
      ]);
    }
  );
});

test('uses the graph limit policy timeout for snapshot git log commands', async () => {
  await withFakeGitScript(
    createFakeGitProgram(
      "setTimeout(() => process.stdout.write('head1\\x1f\\x1fAda\\x1f2026-05-01\\x1fBootstrap\\x1fHEAD -> main\\x1e'), 1_000);",
      'call'
    ),
    async (repositoryPath) => {
      const backend = new DefaultRevisionGraphBackend();
      const repository = createRepository({
        root: repositoryPath,
        head: createBranch({ type: RefType.Head, name: 'main', commit: 'head1' }),
        refs: [
          createRef({ type: RefType.Head, name: 'main', commit: 'head1' })
        ]
      });
      const limitPolicy: RevisionGraphLimitPolicy = {
        initialLimit: 50,
        steppedLimits: [],
        minVisibleNodes: 1,
        graphCommandTimeoutMs: 25
      };

      await assert.rejects(
        backend.loadGraphSnapshot(
          repository,
          createDefaultRevisionGraphProjectionOptions(),
          limitPolicy
        ),
        (error: unknown) => error instanceof Error
          && error.name === 'TimeoutError'
          && error.message.includes('25 ms')
      );
    }
  );
});

test('loads filtered show log pages across message author hashes and refs', async () => {
  await withFakeGitScript(
    createFakeGitProgram(
      "process.stdout.write('\\x1eaaa111aaa111\\x1f\\x1fAda\\x1f2026-05-03\\x1forigin/main\\x1fFix parser\\x1fMatch body\\x1e\\x1ebbb222bbb222\\x1f\\x1fLinus\\x1f2026-05-02\\x1ftag: v1.0.0\\x1fUpdate docs\\x1fRelease notes\\x1e\\x1eccc333ccc333\\x1f\\x1fGrace\\x1f2026-05-01\\x1f\\x1fRefactor cache\\x1fSecond match\\x1e');"
    ),
    async (repositoryPath) => {
      const backend = new DefaultRevisionGraphBackend();
      const repository = createRepository({ root: repositoryPath });

      const firstPage = await backend.loadRevisionLog(
        repository,
        { kind: 'target', revision: 'main', label: 'main' },
        1,
        0,
        false,
        'match'
      );
      const secondPage = await backend.loadRevisionLog(
        repository,
        { kind: 'target', revision: 'main', label: 'main' },
        1,
        1,
        false,
        'match'
      );

      assert.deepEqual(firstPage.entries.map((entry) => entry.shortHash), ['aaa111a']);
      assert.equal(firstPage.hasMore, true);
      assert.deepEqual(secondPage.entries.map((entry) => entry.shortHash), ['ccc333c']);
      assert.equal(secondPage.hasMore, false);

      const authorMatch = await backend.loadRevisionLog(
        repository,
        { kind: 'target', revision: 'main', label: 'main' },
        1,
        0,
        false,
        'linus'
      );
      assert.deepEqual(authorMatch.entries.map((entry) => entry.shortHash), ['bbb222b']);
      const tagMatch = await backend.loadRevisionLog(
        repository,
        { kind: 'target', revision: 'main', label: 'main' },
        1,
        0,
        false,
        'tag:v1.0.0'
      );
      assert.deepEqual(tagMatch.entries.map((entry) => entry.shortHash), ['bbb222b']);
    }
  );
});

test('loads unified diffs through the document backend with bounded git args', async () => {
  await withFakeGitScript(
    createFakeGitProgram(
      "process.stdout.write('diff --git a/file.txt b/file.txt\\n');"
    ),
    async (repositoryPath, callsPath) => {
      const backend = new DefaultRevisionGraphDocumentBackend();
      const repository = createRepository({ root: repositoryPath });

      const diff = await backend.loadUnifiedDiff(repository, '--option-like-left', 'right1234');
      const calls = await fs.readFile(callsPath, 'utf8');

      assert.equal(diff, 'diff --git a/file.txt b/file.txt\n');
      assert.equal(
        calls.trim(),
        'diff --no-color --end-of-options --option-like-left right1234'
      );
    }
  );
});

test('loads worktree unified diffs with sorted unique untracked file patches', async () => {
  await withFakeGitScript(
    createFakeGitProgram(
      [
        "if (args[2] === '--no-index') {",
        "  process.stdout.write(`diff --git a/${args[5]} b/${args[5]}\\n`);",
        '  process.exitCode = 1;',
        '} else {',
        "  process.stdout.write('diff --git a/tracked.txt b/tracked.txt\\n');",
        '}'
      ].join('\n')
    ),
    async (repositoryPath, callsPath) => {
      const backend = new DefaultRevisionGraphDocumentBackend();
      const repository = createRepository({ root: repositoryPath });

      const diff = await backend.loadUnifiedDiffWithWorktree(
        repository,
        '--option-like-ref',
        ['src/z file.ts', 'src/a.ts', 'src/a.ts']
      );
      const calls = await fs.readFile(callsPath, 'utf8');

      assert.equal(
        diff,
        [
          'diff --git a/tracked.txt b/tracked.txt',
          '',
          'diff --git a/src/a.ts b/src/a.ts',
          '',
          'diff --git a/src/z file.ts b/src/z file.ts',
          ''
        ].join('\n')
      );
      assert.equal(
        calls,
        [
          'diff --no-color --end-of-options --option-like-ref',
          'diff --no-color --no-index -- /dev/null src/a.ts',
          'diff --no-color --no-index -- /dev/null src/z file.ts',
          ''
        ].join('\n')
      );
    }
  );
});

test('rejects worktree unified diff paths outside the repository before running git', async () => {
  const backend = new DefaultRevisionGraphDocumentBackend();
  const repository = createRepository({ root: '/workspace/repo' });

  await assert.rejects(
    backend.loadUnifiedDiffWithWorktree(repository, 'main', ['../outside.txt']),
    /outside the repository/
  );
});

test('rejects worktree unified diff errors reported for stale untracked files', async () => {
  await withFakeGitScript(
    createFakeGitProgram(
      [
        "if (args[2] === '--no-index') {",
        "  process.stderr.write(`error: Could not access '${args[5]}'\\n`);",
        '  process.exitCode = 1;',
        '}'
      ].join('\n'),
      'none'
    ),
    async (repositoryPath) => {
      const backend = new DefaultRevisionGraphDocumentBackend();
      const repository = createRepository({ root: repositoryPath });

      await assert.rejects(
        backend.loadUnifiedDiffWithWorktree(repository, 'main', ['stale.txt']),
        /Could not access 'stale\.txt'/
      );
    }
  );
});

test('loads commit details through the document backend with bounded git args', async () => {
  await withFakeGitScript(
    createFakeGitProgram(
      "process.stdout.write('commit --option-like-hash\\n');"
    ),
    async (repositoryPath, callsPath) => {
      const backend = new DefaultRevisionGraphDocumentBackend();
      const repository = createRepository({ root: repositoryPath });

      const details = await backend.loadCommitDetails(repository, '--option-like-hash');
      const calls = await fs.readFile(callsPath, 'utf8');

      assert.equal(details, 'commit --option-like-hash\n');
      assert.equal(
        calls.trim(),
        'show --stat --patch --format=fuller --no-color --end-of-options --option-like-hash'
      );
    }
  );
});

test('loads merge-blocked targets through graph analysis and batched merged-ref fallback', async () => {
  await withFakeGitScript(
    createFakeGitProgram(
      [
        "if (args[0] === 'for-each-ref') {",
        "  process.stdout.write('refs/heads/release/1.x\\nrefs/remotes/origin/release/1.x\\nrefs/tags/v1.0.0\\n');",
        '} else {',
        '  process.exitCode = 2;',
        '}'
      ].join('\n')
    ),
    async (repositoryPath, callsPath) => {
      const backend = new DefaultRevisionGraphMergeAnalysisBackend();
      const repository = createRepository({ root: repositoryPath });
      const snapshot = {
        graph: buildCommitGraph([
          {
            hash: 'head1',
            parents: [],
            author: 'Ada',
            date: '2026-06-05',
            subject: 'HEAD',
            refs: [{ name: 'main', kind: 'head' }]
          }
        ]),
        loadedAt: Date.now(),
        requestedLimit: 50
      };

      const blocked = await backend.getMergeBlockedTargets(
        repository,
        snapshot,
        'main',
        [
          { kind: 'branch', name: 'release/1.x', id: 'branch:release/1.x', hash: 'missing-release', title: 'release/1.x' },
          { kind: 'remote', name: 'origin/release/1.x', id: 'remote:origin/release/1.x', hash: 'missing-remote', title: 'origin/release/1.x' },
          { kind: 'tag', name: 'v1.0.0', id: 'tag:v1.0.0', hash: 'missing-tag', title: 'v1.0.0' },
          { kind: 'branch', name: 'topic/demo', id: 'branch:topic/demo', hash: 'missing-topic', title: 'topic/demo' }
        ]
      );
      const calls = await fs.readFile(callsPath, 'utf8');

      assert.deepEqual(blocked, [
        'branch::release/1.x',
        'remote::origin/release/1.x',
        'tag::v1.0.0'
      ]);
      assert.deepEqual(
        calls.trim().split('\n').sort(),
        [
          'for-each-ref --merged=refs/heads/main --format=%(refname) refs/heads refs/remotes refs/tags refs/stash'
        ]
      );
    }
  );
});
