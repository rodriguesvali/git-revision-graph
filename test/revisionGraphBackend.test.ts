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
import { createBranch, createRef, createRepository } from './fakes';

async function withFakeGitScript<T>(
  script: string,
  run: (repositoryPath: string, callsPath: string) => Promise<T>
): Promise<T> {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'git-revision-graph-backend-'));
  const binDir = path.join(temporaryRoot, 'bin');
  const repositoryPath = path.join(temporaryRoot, 'repo');
  const gitPath = path.join(binDir, 'git');
  const callsPath = path.join(temporaryRoot, 'git-calls.log');
  const originalPath = process.env.PATH ?? '';
  const originalCallsPath = process.env.GIT_REVISION_GRAPH_FAKE_GIT_CALLS;

  await fs.mkdir(binDir, { recursive: true });
  await fs.mkdir(repositoryPath, { recursive: true });
  await fs.writeFile(gitPath, script, { encoding: 'utf8', mode: 0o755 });
  process.env.PATH = `${binDir}:${originalPath}`;
  process.env.GIT_REVISION_GRAPH_FAKE_GIT_CALLS = callsPath;

  try {
    return await run(repositoryPath, callsPath);
  } finally {
    process.env.PATH = originalPath;
    if (originalCallsPath === undefined) {
      delete process.env.GIT_REVISION_GRAPH_FAKE_GIT_CALLS;
    } else {
      process.env.GIT_REVISION_GRAPH_FAKE_GIT_CALLS = originalCallsPath;
    }
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
}

test('reuses completed graph snapshot cache entries for cancelable refreshes', async () => {
  await withFakeGitScript(
    [
      '#!/bin/sh',
      'echo call >> "$GIT_REVISION_GRAPH_FAKE_GIT_CALLS"',
      "printf 'head1\\037\\037Ada\\0372026-05-01\\037Bootstrap\\037HEAD -> main\\036'"
    ].join('\n'),
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
    [
      '#!/bin/sh',
      'echo call >> "$GIT_REVISION_GRAPH_FAKE_GIT_CALLS"',
      "printf 'head1\\037\\037Ada\\0372026-05-01\\037Bootstrap\\037HEAD -> main\\036'"
    ].join('\n'),
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
    [
      '#!/bin/sh',
      'echo call >> "$GIT_REVISION_GRAPH_FAKE_GIT_CALLS"',
      "printf 'head1\\037\\037Ada\\0372026-05-01\\037Bootstrap\\037HEAD -> main\\036'"
    ].join('\n'),
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
    [
      '#!/bin/sh',
      'echo call >> "$GIT_REVISION_GRAPH_FAKE_GIT_CALLS"',
      "printf 'head1\\037\\037Ada\\0372026-05-01\\037Bootstrap\\037origin/main\\036'"
    ].join('\n'),
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
    [
      '#!/bin/sh',
      'echo call >> "$GIT_REVISION_GRAPH_FAKE_GIT_CALLS"',
      'sleep 1',
      "printf 'head1\\037\\037Ada\\0372026-05-01\\037Bootstrap\\037HEAD -> main\\036'"
    ].join('\n'),
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
    [
      '#!/bin/sh',
      'echo "$*" >> "$GIT_REVISION_GRAPH_FAKE_GIT_CALLS"',
      "printf '\\036aaa111aaa111\\037\\037Ada\\0372026-05-03\\037origin/main\\037Fix parser\\037Match body\\036'",
      "printf '\\036bbb222bbb222\\037\\037Linus\\0372026-05-02\\037tag: v1.0.0\\037Update docs\\037Release notes\\036'",
      "printf '\\036ccc333ccc333\\037\\037Grace\\0372026-05-01\\037\\037Refactor cache\\037Second match\\036'"
    ].join('\n'),
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
    [
      '#!/bin/sh',
      'echo "$*" >> "$GIT_REVISION_GRAPH_FAKE_GIT_CALLS"',
      "printf 'diff --git a/file.txt b/file.txt\\n'"
    ].join('\n'),
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

test('loads commit details through the document backend with bounded git args', async () => {
  await withFakeGitScript(
    [
      '#!/bin/sh',
      'echo "$*" >> "$GIT_REVISION_GRAPH_FAKE_GIT_CALLS"',
      "printf 'commit --option-like-hash\\n'"
    ].join('\n'),
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
    [
      '#!/bin/sh',
      'echo "$*" >> "$GIT_REVISION_GRAPH_FAKE_GIT_CALLS"',
      'if [ "$1" = "for-each-ref" ]; then',
      "  printf 'refs/heads/release/1.x\\nrefs/remotes/origin/release/1.x\\nrefs/tags/v1.0.0\\n'",
      '  exit 0',
      'fi',
      'exit 2'
    ].join('\n'),
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
