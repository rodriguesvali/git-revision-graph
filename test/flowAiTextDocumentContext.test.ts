import test from 'node:test';
import assert from 'node:assert/strict';

import type { RevisionGraphDocumentBackend } from '../src/revisionGraph/backend';
import {
  createFlowAiTextDocumentContextProvider,
  FLOW_AI_DOCUMENT_CONTEXT_MAX_CHARS,
  truncateFlowAiDocumentContext
} from '../src/revisionGraph/flow/aiTextDocumentContext';
import { createRepository } from './fakes';

test('Flow AI description context loads only bounded project-document changes', async () => {
  const calls: Array<{
    readonly left: string;
    readonly right: string;
    readonly options: {
      readonly paths?: readonly string[];
      readonly signal?: AbortSignal;
      readonly maxOutputBytes?: number;
    };
  }> = [];
  const backend = {
    async loadUnifiedDiff(_repository: unknown, left: string, right: string, options: never) {
      calls.push({ left, right, options });
      return 'diff --git a/project-context/3.deliver/release.md b/project-context/3.deliver/release.md\n+Delivered AI assistant';
    }
  } as unknown as RevisionGraphDocumentBackend;
  const provider = createFlowAiTextDocumentContextProvider(backend);
  const context = await provider.load(
    createRepository({ root: '/workspace/repo' }),
    {
      surface: 'pull-request',
      field: 'description',
      sourceRefName: 'release/2.0.0',
      targetRefName: 'main',
      title: 'Promote release 2.0.0',
      description: 'Promotion context'
    },
    createCancellationToken()
  );

  assert.match(context ?? '', /Delivered AI assistant/);
  assert.equal(calls[0]?.left, 'main');
  assert.equal(calls[0]?.right, 'release/2.0.0');
  assert.deepEqual(calls[0]?.options.paths, [
    'README.md',
    'CHANGELOG.md',
    'project-context/1.define',
    'project-context/2.build/features',
    'project-context/3.deliver'
  ]);
  assert.equal(calls[0]?.options.maxOutputBytes, 1024 * 1024);
  assert.ok(calls[0]?.options.signal);
});

test('Flow AI document context skips titles and truncates oversized diffs', async () => {
  let loadCount = 0;
  const provider = createFlowAiTextDocumentContextProvider({
    async loadUnifiedDiff() {
      loadCount += 1;
      return 'unused';
    }
  } as unknown as RevisionGraphDocumentBackend);
  const context = await provider.load(
    createRepository({ root: '/workspace/repo' }),
    {
      surface: 'pull-request',
      field: 'title',
      sourceRefName: 'release/2.0.0',
      targetRefName: 'main',
      title: 'Promote release 2.0.0',
      description: 'Promotion context'
    },
    createCancellationToken()
  );

  assert.equal(context, undefined);
  assert.equal(loadCount, 0);
  const truncated = truncateFlowAiDocumentContext('x'.repeat(FLOW_AI_DOCUMENT_CONTEXT_MAX_CHARS + 10));
  assert.ok(truncated.startsWith('x'.repeat(FLOW_AI_DOCUMENT_CONTEXT_MAX_CHARS)));
  assert.match(truncated, /project-document diff truncated/);
});

function createCancellationToken(): never {
  return {
    isCancellationRequested: false,
    onCancellationRequested() {
      return { dispose() {} };
    }
  } as never;
}
