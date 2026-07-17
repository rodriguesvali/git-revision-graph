const SENSITIVE_BASENAMES = new Set([
  '.env',
  '.netrc',
  '.npmrc',
  '.pypirc',
  'credentials',
  'credentials.json',
  'id_dsa',
  'id_ecdsa',
  'id_ed25519',
  'id_rsa',
  'secrets.json'
]);

const SENSITIVE_EXTENSIONS = [
  '.jks',
  '.key',
  '.keystore',
  '.p12',
  '.pem',
  '.pfx'
];

export function normalizeAiContextPath(value: string): string | undefined {
  const normalized = value.replace(/\\/g, '/').replace(/^\.\//, '');
  if (
    normalized.length === 0
    || normalized.startsWith('/')
    || /^[a-z]:\//i.test(normalized)
    || normalized.split('/').some((segment) => segment === '..')
  ) {
    return undefined;
  }
  return normalized;
}

export function isSensitiveAiContextPath(value: string): boolean {
  const normalized = normalizeAiContextPath(value)?.toLowerCase();
  if (!normalized) {
    return true;
  }

  const basename = normalized.split('/').at(-1) ?? normalized;
  return SENSITIVE_BASENAMES.has(basename)
    || basename.startsWith('.env.')
    || basename.includes('private-key')
    || SENSITIVE_EXTENSIONS.some((extension) => basename.endsWith(extension))
    || normalized === '.aws/credentials'
    || normalized.endsWith('/.aws/credentials');
}
