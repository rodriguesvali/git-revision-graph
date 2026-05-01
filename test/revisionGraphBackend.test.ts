import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { DefaultRevisionGraphBackend, RevisionGraphLimitPolicy } from '../src/revisionGraph/backend';
import type { RevisionGraphLoadTraceEvent } from '../src/revisionGraph/loadTrace';
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
        minVisibleNodes: 1
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
