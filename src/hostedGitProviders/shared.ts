import type { HostedGitProvider } from './types';

export function parseRemoteUrl(remoteUrl: string): URL | undefined {
  try {
    return new URL(remoteUrl);
  } catch {
    return undefined;
  }
}

export function parsePathParts(pathname: string): readonly string[] | undefined {
  const rawParts = pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  return decodeRemoteComponents(rawParts);
}

export function decodeRemoteComponents(values: readonly string[]): readonly string[] | undefined {
  const decoded: string[] = [];
  for (const value of values) {
    try {
      decoded.push(decodeURIComponent(value));
    } catch {
      return undefined;
    }
  }
  return decoded;
}

export function normalizeRepositoryName(repositoryName: string): string | undefined {
  return normalizePathComponent(repositoryName.replace(/\.git$/i, ''));
}

export function normalizePathComponents(values: readonly string[]): readonly string[] | undefined {
  const normalized: string[] = [];
  for (const value of values) {
    const component = normalizePathComponent(value);
    if (!component) {
      return undefined;
    }
    normalized.push(component);
  }
  return normalized;
}

export function normalizePathComponent(value: string): string | undefined {
  const normalized = normalizeValue(value);
  return normalized && normalized !== '.' && normalized !== '..' && !/[\\/\u0000-\u001f\u007f]/.test(normalized)
    ? normalized
    : undefined;
}

export function normalizeValue(value: string): string | undefined {
  const normalized = value.trim();
  return normalized || undefined;
}

export function encodePath(parts: readonly string[]): string {
  return parts.map(encodeURIComponent).join('/');
}

export function createRepositoryIdentity(
  provider: HostedGitProvider,
  parts: readonly string[],
  preserveCase = false
): string {
  const identityParts = preserveCase ? parts : parts.map((part) => part.toLowerCase());
  return `${provider}:${identityParts.join('\u0000')}`;
}
