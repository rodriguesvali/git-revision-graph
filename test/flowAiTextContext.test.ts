import test from 'node:test';
import assert from 'node:assert/strict';

import type { RevisionGraphDocumentBackend } from '../src/revisionGraph/backend';
import {
  createFlowAiTextContextProvider,
  FLOW_AI_CONTEXT_MAX_CHARS,
  truncateFlowAiContext
} from '../src/revisionGraph/flow/aiTextContext';
import { createRepository } from './fakes';

test('Flow AI delivery context loads only bounded project-document changes', async () => {
  const calls: Array<{ readonly left: string; readonly right: string; readonly options: DiffOptions }> = [];
  const backend = {
    async loadUnifiedDiff(_repository: unknown, left: string, right: string, options: DiffOptions) {
      calls.push({ left, right, options });
      return 'diff --git a/project-context/3.deliver/release.md b/project-context/3.deliver/release.md\n+Delivered AI assistant';
    }
  } as unknown as RevisionGraphDocumentBackend;
  const context = await createFlowAiTextContextProvider(backend).load(
    createRepository({ root: '/workspace/repo' }),
    createPullRequestInput('project-document-diff'),
    createCancellationToken()
  );

  assert.match(context ?? '', /Delivered AI assistant/);
  assert.equal(calls[0]?.left, 'release/2.0.0');
  assert.equal(calls[0]?.right, 'bug/BUG-731-payment-rounding');
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

test('Flow AI code context excludes sensitive and unsafe paths before loading the diff', async () => {
  let selectedPaths: readonly string[] | undefined;
  const backend = {
    async loadChangedPaths() {
      return [
        { status: 'M', paths: ['src/payment.ts'] },
        { status: 'M', paths: ['.env'] },
        { status: 'R100', paths: ['credentials.json', 'src/config.ts'] },
        { status: 'A', paths: ['test/payment.test.ts'] }
      ];
    },
    async loadUnifiedDiff(_repository: unknown, _left: string, _right: string, options: DiffOptions) {
      selectedPaths = options.paths;
      return 'diff --git a/src/payment.ts b/src/payment.ts\n+roundCorrectly();';
    }
  } as unknown as RevisionGraphDocumentBackend;
  const context = await createFlowAiTextContextProvider(backend).load(
    createRepository({ root: '/workspace/repo' }),
    createPullRequestInput('code-diff'),
    createCancellationToken()
  );

  assert.deepEqual(selectedPaths, ['src/payment.ts', 'test/payment.test.ts']);
  assert.match(context ?? '', /2 changed file\(s\) were omitted by safety or size policy/);
  assert.match(context ?? '', /M: src\/payment\.ts/);
  assert.match(context ?? '', /A: test\/payment\.test\.ts/);
  assert.doesNotMatch(context ?? '', /\.env|credentials\.json/);
});

test('Flow AI context skips titles and marks source-specific truncation', async () => {
  let loadCount = 0;
  const provider = createFlowAiTextContextProvider({
    async loadUnifiedDiff() {
      loadCount += 1;
      return 'unused';
    }
  } as unknown as RevisionGraphDocumentBackend);
  const input = createPullRequestInput('project-document-diff');
  const context = await provider.load(
    createRepository({ root: '/workspace/repo' }),
    { ...input, field: 'title' },
    createCancellationToken()
  );

  assert.equal(context, undefined);
  assert.equal(loadCount, 0);
  const documents = truncateFlowAiContext(
    'x'.repeat(FLOW_AI_CONTEXT_MAX_CHARS + 10),
    'project-document-diff'
  );
  const code = truncateFlowAiContext(
    'x'.repeat(FLOW_AI_CONTEXT_MAX_CHARS + 10),
    'code-diff'
  );
  assert.match(documents, /project-document diff truncated/);
  assert.match(code, /code diff truncated/);
});

interface DiffOptions {
  readonly paths?: readonly string[];
  readonly signal?: AbortSignal;
  readonly maxOutputBytes?: number;
}

function createPullRequestInput(contextSource: 'project-document-diff' | 'code-diff') {
  return {
    surface: 'pull-request' as const,
    field: 'description' as const,
    sourceRefName: 'bug/BUG-731-payment-rounding',
    targetRefName: 'release/2.0.0',
    title: 'Correct payment rounding',
    description: 'Correct rounding in the release payment summary',
    promptContext: {
      transition: 'bug-to-release' as const,
      sourceKind: 'bug' as const,
      targetKind: 'release' as const,
      promptKind: 'defect' as const,
      contextSource
    }
  };
}

function createCancellationToken(): never {
  return {
    isCancellationRequested: false,
    onCancellationRequested() {
      return { dispose() {} };
    }
  } as never;
}
