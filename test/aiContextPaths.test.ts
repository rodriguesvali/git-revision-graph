import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isSensitiveAiContextPath,
  sanitizeAiContextText
} from '../src/aiContextPaths';

test('AI context path policy rejects common credential and private-state locations', () => {
  const sensitivePaths = [
    '.envrc',
    '.docker/config.json',
    '.aws/credentials',
    '.secrets/token.txt',
    'config/secrets.yaml',
    'config/private_key',
    'infrastructure/terraform.tfstate',
    'infrastructure/deployment.tfstate.backup',
    'service-account.json',
    'config/service-account-production.json',
    'config/production-credentials.yaml',
    'certificates/client.pkcs8'
  ];
  for (const path of sensitivePaths) {
    assert.equal(isSensitiveAiContextPath(path), true, path);
  }

  assert.equal(isSensitiveAiContextPath('src/environment.ts'), false);
  assert.equal(isSensitiveAiContextPath('src/config.ts'), false);
  assert.equal(isSensitiveAiContextPath('docs/security.md'), false);
});

test('AI context sanitizer removes high-confidence secret values and preserves safe context', () => {
  const sensitiveValues = [
    'example-super-secret-value-123456789',
    'opaque-aws-secret-value-123456789',
    'opaque-token-value-123456789',
    'AKIAIOSFODNN7EXAMPLE',
    'ghp_abcdefghijklmnopqrstuvwxyz123456',
    'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.signaturepayload123',
    'bearer-token-value-123456789',
    'password-in-url',
    'private-key-material'
  ];
  const result = sanitizeAiContextText([
    '+const apiKey = "example-super-secret-value-123456789";',
    '+AWS_SECRET_ACCESS_KEY=opaque-aws-secret-value-123456789',
    '+token = opaque-token-value-123456789',
    '+aws_access_key_id = AKIAIOSFODNN7EXAMPLE',
    '+token = ghp_abcdefghijklmnopqrstuvwxyz123456',
    '+jwt: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.signaturepayload123',
    '+Authorization: Bearer bearer-token-value-123456789',
    '+remote = https://user:password-in-url@example.test/repository.git',
    '+-----BEGIN PRIVATE KEY-----',
    '+private-key-material',
    '+-----END PRIVATE KEY-----',
    '+const environment = "test";'
  ].join('\n'));

  assert.equal(result.redacted, true);
  for (const value of sensitiveValues) {
    assert.equal(result.text.includes(value), false, value);
  }
  assert.match(result.text, /\[REDACTED SENSITIVE VALUE\]/);
  assert.match(result.text, /\+const environment = "test";/);
});

test('AI context sanitizer leaves ordinary diffs unchanged', () => {
  const diff = [
    'diff --git a/src/app.ts b/src/app.ts',
    '+const environment = "test";',
    '+renderApplication();'
  ].join('\n');

  assert.deepEqual(sanitizeAiContextText(diff), {
    text: diff,
    redacted: false
  });
});
