const SENSITIVE_BASENAMES = new Set([
  '.dev.vars',
  '.dockercfg',
  '.env',
  '.envrc',
  '.git-credentials',
  '.netrc',
  '.npmrc',
  '.pypirc',
  'application-default-credentials.json',
  'application_default_credentials.json',
  'auth.json',
  'credentials',
  'credentials.json',
  'credentials.yaml',
  'credentials.yml',
  'id_dsa',
  'id_ecdsa',
  'id_ed25519',
  'id_rsa',
  'kubeconfig',
  'private-key',
  'private_key',
  'secrets.json',
  'secrets.yaml',
  'secrets.yml',
  'service-account.json',
  'terraform.tfstate',
  'terraform.tfstate.backup'
]);

const SENSITIVE_EXTENSIONS = [
  '.der',
  '.jks',
  '.kdbx',
  '.key',
  '.keystore',
  '.ovpn',
  '.p12',
  '.p8',
  '.pem',
  '.pfx',
  '.pk8',
  '.pkcs8',
  '.tfstate'
];

const SENSITIVE_DIRECTORY_SEGMENTS = new Set([
  '.aws',
  '.gnupg',
  '.secrets',
  '.ssh',
  'credentials',
  'secrets'
]);

const SENSITIVE_STRUCTURED_DATA_EXTENSIONS = new Set([
  '.json',
  '.yaml',
  '.yml'
]);

const AI_CONTEXT_REDACTION_MARKER = '[REDACTED SENSITIVE VALUE]';
const ASSIGNMENT_PATTERN = /^([ +\-]?)([^:=\r\n]{1,160})(\s*[:=]\s*)(.+)$/;
const SENSITIVE_ASSIGNMENT_NAME_PATTERN =
  /(?:^|_)(?:api_?key|access_?key|access_?token|auth_?token|client_?secret|connection_?string|credentials?|database_?url|password|passwd|private_?key|refresh_?token|secret(?:_?access_?key)?|token)(?:_|$)/i;
const PRIVATE_KEY_BEGIN_PATTERN = /^[ +\-]?-----BEGIN [^-]*PRIVATE KEY-----/i;
const PRIVATE_KEY_END_PATTERN = /^[ +\-]?-----END [^-]*PRIVATE KEY-----/i;
const INLINE_SECRET_PATTERNS = [
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  /\bglpat-[A-Za-z0-9_-]{20,}\b/g,
  /\bsk-[A-Za-z0-9_-]{20,}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
  /\bBearer\s+[A-Za-z0-9._~+/-]{12,}={0,2}/gi
];
const CREDENTIAL_URL_PATTERN =
  /([a-z][a-z0-9+.-]*:\/\/[^:\s/@]+:)[^@\s/]+@/gi;

export interface SanitizedAiContext {
  readonly text: string;
  readonly redacted: boolean;
}

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

  const segments = normalized.split('/');
  const basename = segments.at(-1) ?? normalized;
  return SENSITIVE_BASENAMES.has(basename)
    || basename.startsWith('.env.')
    || basename.includes('private-key')
    || basename.includes('private_key')
    || SENSITIVE_EXTENSIONS.some((extension) => basename.endsWith(extension))
    || basename.endsWith('.tfstate.backup')
    || isSensitiveStructuredDataBasename(basename)
    || segments.slice(0, -1).some((segment) => SENSITIVE_DIRECTORY_SEGMENTS.has(segment))
    || normalized === '.docker/config.json'
    || normalized.endsWith('/.docker/config.json')
    || normalized === '.aws/credentials'
    || normalized.endsWith('/.aws/credentials');
}

function isSensitiveStructuredDataBasename(basename: string): boolean {
  const extensionStart = basename.lastIndexOf('.');
  if (extensionStart < 0) return false;
  const extension = basename.slice(extensionStart);
  if (!SENSITIVE_STRUCTURED_DATA_EXTENSIONS.has(extension)) return false;
  const stem = basename.slice(0, extensionStart);
  return /(?:^|[._-])(?:credentials?|secrets?|service-account|service_account)(?:[._-]|$)/i.test(stem);
}

export function sanitizeAiContextText(value: string): SanitizedAiContext {
  let redacted = false;
  let insidePrivateKey = false;
  const lines: string[] = [];

  for (const line of value.split(/\r?\n/)) {
    if (PRIVATE_KEY_BEGIN_PATTERN.test(line)) {
      lines.push(`${readDiffPrefix(line)}${AI_CONTEXT_REDACTION_MARKER}`);
      redacted = true;
      insidePrivateKey = true;
      continue;
    }
    if (insidePrivateKey) {
      redacted = true;
      if (PRIVATE_KEY_END_PATTERN.test(line)) {
        insidePrivateKey = false;
      }
      continue;
    }

    const sanitizedLine = sanitizeAiContextLine(line);
    redacted ||= sanitizedLine !== line;
    lines.push(sanitizedLine);
  }

  return {
    text: lines.join('\n'),
    redacted
  };
}

function sanitizeAiContextLine(value: string): string {
  const assignment = value.match(ASSIGNMENT_PATTERN);
  const normalizedAssignmentName = assignment?.[2]
    .replace(/[^a-z0-9]+/gi, '_')
    .toLowerCase();
  if (assignment && normalizedAssignmentName
    && SENSITIVE_ASSIGNMENT_NAME_PATTERN.test(normalizedAssignmentName)) {
    return `${assignment[1]}${assignment[2]}${assignment[3]}${AI_CONTEXT_REDACTION_MARKER}`;
  }

  let sanitized = value.replace(
    CREDENTIAL_URL_PATTERN,
    `$1${AI_CONTEXT_REDACTION_MARKER}@`
  );
  for (const pattern of INLINE_SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, AI_CONTEXT_REDACTION_MARKER);
  }
  return sanitized;
}

function readDiffPrefix(value: string): string {
  return /^[ +\-]/.test(value) ? value[0] : '';
}
