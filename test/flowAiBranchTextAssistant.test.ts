import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildFlowAiTextImprovementPrompt,
  FLOW_AI_DESCRIPTION_MAX_LENGTH,
  normalizeFlowAiTextImprovementOutput
} from '../src/revisionGraph/flow/aiTextAssistant';

test('builds an AI prompt for a Flow branch description', () => {
  const prompt = buildFlowAiTextImprovementPrompt({
    surface: 'feature',
    field: 'description',
    sourceRefName: 'develop',
    branchName: 'feature/payment-validation',
    text: 'Validate payments'
  });

  assert.match(prompt, /feature branch description/);
  assert.match(prompt, /feature\/payment-validation/);
  assert.match(prompt, /Validate payments/);
  assert.doesNotMatch(prompt, /Pull Request/i);
});

test('normalizes AI branch descriptions to the supported limit', () => {
  const result = normalizeFlowAiTextImprovementOutput(
    'description',
    `  ${'x'.repeat(FLOW_AI_DESCRIPTION_MAX_LENGTH + 10)}  `
  );

  assert.equal(result.length, FLOW_AI_DESCRIPTION_MAX_LENGTH);
});
