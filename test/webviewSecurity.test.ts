import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createWebviewContentSecurityPolicy,
  createWebviewNonce
} from '../src/webviewSecurity';

test('createWebviewNonce creates cryptographic base64url-friendly nonces', () => {
  const first = createWebviewNonce();
  const second = createWebviewNonce();

  assert.match(first, /^[A-Za-z0-9_-]{22}$/);
  assert.match(second, /^[A-Za-z0-9_-]{22}$/);
  assert.notEqual(first, second);
});

test('createWebviewContentSecurityPolicy allows only inline styles and nonce scripts', () => {
  assert.equal(
    createWebviewContentSecurityPolicy('abc123'),
    "default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-abc123';"
  );
});

test('createWebviewContentSecurityPolicy permits only the supplied webview asset origin', () => {
  assert.equal(
    createWebviewContentSecurityPolicy('abc123', 'vscode-webview-resource:'),
    "default-src 'none'; style-src 'unsafe-inline'; script-src vscode-webview-resource: 'nonce-abc123';"
  );
});
