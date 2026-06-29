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

  const exitCode = getGitExitCode(error);
  if (exitCode !== undefined) {
    suffixes.push(`(exit code: ${exitCode})`);
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

export function isRemotePermissionDeniedError(error: unknown): boolean {
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
    text.includes('permission to ') && text.includes(' denied')
  ) || (
    text.includes('write access to repository not granted')
  ) || (
    text.includes('the requested url returned error: 403')
  ) || (
    text.includes('request failed') && text.includes('403')
  ) || (
    text.includes('protected branch') && (
      text.includes('hook declined')
      || text.includes('update failed')
    )
  ) || (
    text.includes('remote: error: gh006')
  ) || (
    text.includes('forbidden') && (
      text.includes('remote')
      || text.includes('repository')
      || text.includes('server')
    )
  );
}

export function isMissingUpstreamConfigurationError(error: unknown): boolean {
  const gitError = asGitLikeError(error);
  const stderr = normalizeErrorText(gitError?.stderr);
  return stderr?.toLowerCase().includes('has no upstream information') ?? false;
}

export function hasGitErrorCode(error: unknown, gitErrorCode: string): boolean {
  const gitError = asGitLikeError(error);
  return gitError?.gitErrorCode === gitErrorCode;
}

export function hasGitExitCode(error: unknown, exitCode: number): boolean {
  return getGitExitCode(error) === exitCode;
}

function asGitLikeError(error: unknown): GitLikeError | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  return error as GitLikeError;
}

function getGitExitCode(error: unknown): number | undefined {
  const gitError = asGitLikeError(error);
  if (typeof gitError?.exitCode === 'number') {
    return gitError.exitCode;
  }

  if (typeof gitError?.code === 'number') {
    return gitError.code;
  }

  return undefined;
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
