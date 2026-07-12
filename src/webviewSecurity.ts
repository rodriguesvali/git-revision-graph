import { randomBytes } from 'node:crypto';

export function createWebviewNonce(): string {
  return randomBytes(16).toString('base64url');
}

export function createWebviewContentSecurityPolicy(nonce: string, scriptSource?: string): string {
  return [
    "default-src 'none'",
    "style-src 'unsafe-inline'",
    `script-src ${scriptSource ? `${scriptSource} ` : ''}'nonce-${nonce}'`
  ].join('; ') + ';';
}
