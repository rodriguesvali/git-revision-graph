import { execGit } from '../../gitExec';
import { Repository } from '../../git';

export interface RevisionGraphDocumentBackend {
  loadUnifiedDiff(repository: Repository, left: string, right: string): Promise<string>;
  loadCommitDetails(repository: Repository, commitHash: string): Promise<string>;
}

const DEFAULT_GIT_COMMAND_TIMEOUT_MS = 15000;
const UNIFIED_DIFF_MAX_OUTPUT_BYTES = 32 * 1024 * 1024;
const COMMIT_DETAILS_MAX_OUTPUT_BYTES = 24 * 1024 * 1024;

export class DefaultRevisionGraphDocumentBackend implements RevisionGraphDocumentBackend {
  async loadUnifiedDiff(repository: Repository, left: string, right: string): Promise<string> {
    return execGit(
      repository.rootUri.fsPath,
      ['diff', '--no-color', '--end-of-options', left, right],
      {
        maxOutputBytes: UNIFIED_DIFF_MAX_OUTPUT_BYTES,
        timeoutMs: DEFAULT_GIT_COMMAND_TIMEOUT_MS
      }
    );
  }

  async loadCommitDetails(repository: Repository, commitHash: string): Promise<string> {
    return execGit(
      repository.rootUri.fsPath,
      ['show', '--stat', '--patch', '--format=fuller', '--no-color', '--end-of-options', commitHash],
      {
        maxOutputBytes: COMMIT_DETAILS_MAX_OUTPUT_BYTES,
        timeoutMs: DEFAULT_GIT_COMMAND_TIMEOUT_MS
      }
    );
  }
}
