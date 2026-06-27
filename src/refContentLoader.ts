import * as path from 'node:path';

import { toOperationError } from './errorDetail';
import { execGit } from './gitExec';
import type { Repository } from './git';

const REF_CONTENT_MAX_OUTPUT_BYTES = 24 * 1024 * 1024;
const REF_CONTENT_TIMEOUT_MS = 15_000;

export interface RefContentRequest {
  readonly repositoryPath: string;
  readonly ref: string;
  readonly filePath: string;
}

export type RefContentExecutor = (
  repositoryPath: string,
  args: readonly string[],
  options: { readonly maxOutputBytes: number; readonly timeoutMs: number }
) => Promise<string>;

export async function loadRefContent(
  request: RefContentRequest,
  repositories: readonly Repository[],
  executeGit: RefContentExecutor = execGit
): Promise<string> {
  const repository = repositories.find(
    (candidate) => candidate.rootUri.fsPath === request.repositoryPath
  );
  if (!repository) {
    throw new Error('The repository for this revision document is no longer open.');
  }

  const relativePath = path.relative(repository.rootUri.fsPath, request.filePath);
  if (
    !relativePath
    || relativePath === '..'
    || relativePath.startsWith(`..${path.sep}`)
    || path.isAbsolute(relativePath)
  ) {
    throw new Error('The revision document path is outside its repository.');
  }

  try {
    return await executeGit(
      repository.rootUri.fsPath,
      ['show', '--end-of-options', `${request.ref}:${relativePath.split(path.sep).join('/')}`],
      {
        maxOutputBytes: REF_CONTENT_MAX_OUTPUT_BYTES,
        timeoutMs: REF_CONTENT_TIMEOUT_MS
      }
    );
  } catch (error) {
    throw new Error(toOperationError('Could not load the selected revision content.', error));
  }
}
