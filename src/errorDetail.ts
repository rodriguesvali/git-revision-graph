interface GitLikeError {
  readonly message?: string;
  readonly stderr?: string;
  readonly exitCode?: number;
  readonly gitErrorCode?: string;
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
  }

  return suffixes.length > 0 ? `${primaryDetail} ${suffixes.join(' ')}` : primaryDetail;
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
