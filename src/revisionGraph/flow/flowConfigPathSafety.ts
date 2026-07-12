import { lstat, realpath } from 'node:fs/promises';
import * as path from 'node:path';

export interface RepositoryConfigPath {
  readonly path: string;
  readonly relativePath: string;
}

export type RepositoryConfigPathInspection =
  | {
    readonly ok: true;
    readonly path: string;
    readonly relativePath: string;
    readonly exists: boolean;
  }
  | { readonly ok: false; readonly message: string };

export function resolveRepositoryConfigPath(
  repositoryRootPath: string,
  configPath: string
):
  | { readonly ok: true; readonly value: RepositoryConfigPath }
  | { readonly ok: false; readonly message: string } {
  if (typeof configPath !== 'string' || configPath.trim().length === 0) {
    return { ok: false, message: 'Flow Governance config path must be a non-empty repository-relative path.' };
  }

  if (path.isAbsolute(configPath)) {
    return { ok: false, message: 'Flow Governance config path must be relative to the repository root.' };
  }

  const root = path.resolve(repositoryRootPath);
  const resolved = path.resolve(root, configPath);
  const relativePath = path.relative(root, resolved);
  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return { ok: false, message: 'Flow Governance config path must stay inside the repository root.' };
  }

  return {
    ok: true,
    value: {
      path: resolved,
      relativePath: relativePath.split(path.sep).join('/')
    }
  };
}

export async function inspectRepositoryConfigPath(
  repositoryRootPath: string,
  configPath: string
): Promise<RepositoryConfigPathInspection> {
  const resolved = resolveRepositoryConfigPath(repositoryRootPath, configPath);
  if (!resolved.ok) {
    return resolved;
  }

  let canonicalRoot: string;
  try {
    canonicalRoot = await realpath(repositoryRootPath);
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return {
        ok: true,
        path: resolved.value.path,
        relativePath: resolved.value.relativePath,
        exists: false
      };
    }
    return { ok: false, message: `Could not resolve repository path: ${getErrorMessage(error)}` };
  }

  const canonicalPath = path.resolve(canonicalRoot, resolved.value.relativePath);
  const canonicalRelativePath = path.relative(canonicalRoot, canonicalPath);
  if (!canonicalRelativePath || canonicalRelativePath.startsWith('..') || path.isAbsolute(canonicalRelativePath)) {
    return { ok: false, message: 'Flow Governance config path must stay inside the repository root.' };
  }

  const segments = canonicalRelativePath.split(path.sep);
  let currentPath = canonicalRoot;
  for (const segment of segments.slice(0, -1)) {
    currentPath = path.join(currentPath, segment);
    const ancestor = await inspectPath(currentPath);
    if (ancestor.status === 'missing') {
      continue;
    }
    if (ancestor.status === 'error') {
      return { ok: false, message: ancestor.message };
    }
    if (ancestor.isSymbolicLink) {
      return { ok: false, message: 'Flow Governance config path must not contain symbolic-link or junction ancestors.' };
    }
    if (!ancestor.isDirectory) {
      return { ok: false, message: 'Flow Governance config path has a non-directory ancestor.' };
    }
  }

  const target = await inspectPath(canonicalPath);
  if (target.status === 'missing') {
    return {
      ok: true,
      path: canonicalPath,
      relativePath: canonicalRelativePath.split(path.sep).join('/'),
      exists: false
    };
  }
  if (target.status === 'error') {
    return { ok: false, message: target.message };
  }
  if (target.isSymbolicLink) {
    return { ok: false, message: 'Flow Governance config file must not be a symbolic link or junction.' };
  }
  if (!target.isFile) {
    return { ok: false, message: 'Flow Governance config path must reference a regular file.' };
  }

  return {
    ok: true,
    path: canonicalPath,
    relativePath: canonicalRelativePath.split(path.sep).join('/'),
    exists: true
  };
}

async function inspectPath(filePath: string): Promise<
  | { readonly status: 'present'; readonly isSymbolicLink: boolean; readonly isDirectory: boolean; readonly isFile: boolean }
  | { readonly status: 'missing' }
  | { readonly status: 'error'; readonly message: string }
> {
  try {
    const stat = await lstat(filePath);
    return {
      status: 'present',
      isSymbolicLink: stat.isSymbolicLink(),
      isDirectory: stat.isDirectory(),
      isFile: stat.isFile()
    };
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return { status: 'missing' };
    }
    return { status: 'error', message: `Could not inspect Flow Governance config path: ${getErrorMessage(error)}` };
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
