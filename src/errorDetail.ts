interface GitLikeError {
  readonly message?: string;
  readonly stderr?: string;
  readonly exitCode?: number;
  readonly gitErrorCode?: string;
  readonly code?: number | string;
}

export function toErrorDetail(error: unknown): string {
  const gitError = asGitLikeError(error);
  const primaryDetail = normalizeErrorText(gitError?.stderr)
    ?? normalizeErrorText(gitError?.message)
    ?? normalizePrimitiveError(error)
    ?? 'Unknown error.';

  const suffixes: string[] = [];
  if (gitError?.gitErrorCode) {
    suffixes.push(`[${gitError.gitErrorCode}]`);
  }

  if (typeof gitError?.exitCode === 'number') {
    suffixes.push(`(exit code: ${gitError.exitCode})`);
  } else if (typeof gitError?.code === 'number') {
    suffixes.push(`(exit code: ${gitError.code})`);
  }

  return suffixes.length > 0 ? `${primaryDetail} ${suffixes.join(' ')}` : primaryDetail;
}

export function toOperationError(message: string, error: unknown): string {
  return `${message} ${toErrorDetail(error)}`;
}

export function isNonInteractiveGitAuthenticationError(error: unknown): boolean {
  const gitError = asGitLikeError(error);
  const text = [
    normalizeErrorText(gitError?.stderr),
    normalizeErrorText(gitError?.message),
    normalizePrimitiveError(error)
  ]
    .filter((value): value is string => !!value)
    .join(' ')
    .toLowerCase();

  return (
    text.includes('could not read username')
    || text.includes('could not read password')
  ) && (
    text.includes('terminal prompts disabled')
    || text.includes('no such device or address')
  );
}

export function hasGitErrorCode(error: unknown, gitErrorCode: string): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  return 'gitErrorCode' in error && error.gitErrorCode === gitErrorCode;
}

function asGitLikeError(error: unknown): GitLikeError | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  return error as GitLikeError;
}

function normalizeErrorText(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizePrimitiveError(error: unknown): string | undefined {
  if (typeof error === 'string') {
    return normalizeErrorText(error);
  }

  if (typeof error === 'number' || typeof error === 'boolean' || typeof error === 'bigint') {
    return String(error);
  }

  return undefined;
}
