import test from 'node:test';
import assert from 'node:assert/strict';

import { selectFittedFlowAiTextPrompt } from '../src/revisionGraph/flow/aiTextPromptFitting';

test('Flow AI prompt fitting preserves provider order when the full prompt fits', async () => {
  const first = createModel('first', 1_000, () => 20);
  const larger = createModel('larger', 8_000, () => 20);

  const fitted = await selectFittedFlowAiTextPrompt(
    [first, larger],
    {
      surface: 'release',
      field: 'description',
      sourceRefName: 'main',
      releaseName: '2.0.0',
      text: 'Next stable release'
    },
    createCancellationToken()
  );

  assert.equal(fitted?.model.id, 'first');
  assert.match(fitted?.prompt ?? '', /Next stable release/);
});

test('Flow AI prompt fitting uses the largest window and reduces only optional context', async () => {
  const small = createModel('small', 500, () => 300);
  const larger = createModel('larger', 1_800, countPromptWithDocumentChars);
  const documentContext = 'x'.repeat(20_000);

  const fitted = await selectFittedFlowAiTextPrompt(
    [small, larger],
    createPullRequestDescriptionInput(documentContext),
    createCancellationToken()
  );

  assert.equal(fitted?.model.id, 'larger');
  assert.match(fitted?.prompt ?? '', /Existing promotion description/);
  assert.match(fitted?.prompt ?? '', /project-document diff truncated/);
  const retainedDocumentChars = (fitted?.prompt.match(/x/g) ?? []).length;
  assert.ok(retainedDocumentChars >= 1_000);
  assert.ok(retainedDocumentChars < documentContext.length);
  assert.ok(countPromptWithDocumentChars(fitted?.prompt ?? '') <= larger.maxInputTokens - 256);
});

test('Flow AI prompt fitting drops optional documents when only essential form content fits', async () => {
  const model = createModel('essential-only', 1_400, countPromptWithDocumentChars);
  const fitted = await selectFittedFlowAiTextPrompt(
    [model],
    createPullRequestDescriptionInput('x'.repeat(2_000)),
    createCancellationToken()
  );

  assert.equal(fitted?.model.id, 'essential-only');
  assert.match(fitted?.prompt ?? '', /Existing promotion description/);
  assert.match(fitted?.prompt ?? '', /Project-document changes were omitted to fit the model/);
  assert.doesNotMatch(fitted?.prompt ?? '', /BEGIN UNTRUSTED PROJECT-DOCUMENT DIFF/);
});

test('Flow AI prompt fitting reports no selection when essential content cannot fit', async () => {
  const fitted = await selectFittedFlowAiTextPrompt(
    [createModel('too-small', 300, () => 300)],
    createPullRequestDescriptionInput('x'.repeat(2_000)),
    createCancellationToken()
  );

  assert.equal(fitted, undefined);
});

interface TestModel {
  readonly id: string;
  readonly maxInputTokens: number;
  countTokens(text: string): Promise<number>;
}

function createModel(id: string, maxInputTokens: number, count: (text: string) => number): TestModel {
  return {
    id,
    maxInputTokens,
    async countTokens(text) { return count(text); }
  };
}

function countPromptWithDocumentChars(prompt: string): number {
  return 300 + (prompt.match(/x/g) ?? []).length;
}

function createPullRequestDescriptionInput(content: string) {
  return {
    surface: 'pull-request' as const,
    field: 'description' as const,
    sourceRefName: 'release/2.0.0',
    targetRefName: 'main',
    title: 'Promote release 2.0.0',
    description: 'Existing promotion description',
    promptContext: {
      transition: 'release-to-main' as const,
      sourceKind: 'release' as const,
      targetKind: 'main' as const,
      promptKind: 'release' as const,
      contextSource: 'project-document-diff' as const,
      content
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
