import { execGitWithResult, GitExecOptions, GitExecResult } from '../gitExec';
import { RemoteTagPublicationState } from '../revisionGraphTypes';

const DEFAULT_REMOTE_TAG_STATE_MAX_OUTPUT_BYTES = 1024 * 1024;
const DEFAULT_REMOTE_TAG_STATE_TIMEOUT_MS = 3000;

export interface ResolveRemoteTagPublicationStateOptions {
  readonly repositoryPath: string;
  readonly remoteNames: readonly string[];
  readonly tagName: string;
  readonly maxOutputBytes?: number;
  readonly timeoutMs?: number;
  readonly execGit?: (
    repositoryPath: string,
    args: readonly string[],
    options?: GitExecOptions
  ) => Promise<GitExecResult>;
}

export interface RemoteTagPublicationRequestContext {
  readonly repositoryPath: string | undefined;
  readonly state: object;
}

export async function resolveRemoteTagPublicationState(
  options: ResolveRemoteTagPublicationStateOptions
): Promise<RemoteTagPublicationState> {
  let sawUnknown = false;

  for (const remoteName of options.remoteNames) {
    const state = await resolveRemoteTagStateForRemote(options, remoteName);
    if (state === 'published') {
      return 'published';
    }

    if (state === 'unknown') {
      sawUnknown = true;
    }
  }

  return sawUnknown ? 'unknown' : 'unpublished';
}

export function isRemoteTagPublicationStateResponseCurrent(
  requestContext: RemoteTagPublicationRequestContext,
  currentRepositoryPath: string | undefined,
  currentState: object
): boolean {
  return !!requestContext.repositoryPath
    && requestContext.repositoryPath === currentRepositoryPath
    && requestContext.state === currentState;
}

function parseRemoteTagNames(stdout: string): Set<string> {
  const names = new Set<string>();
  for (const line of stdout.split(/\r?\n/)) {
    const [, refName] = line.trim().split(/\s+/);
    if (refName?.startsWith('refs/tags/')) {
      names.add(refName.slice('refs/tags/'.length));
    }
  }

  return names;
}

async function resolveRemoteTagStateForRemote(
  options: ResolveRemoteTagPublicationStateOptions,
  remoteName: string
): Promise<RemoteTagPublicationState> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_REMOTE_TAG_STATE_TIMEOUT_MS
  );
  const execGit = options.execGit ?? execGitWithResult;

  try {
    const { stdout } = await execGit(
      options.repositoryPath,
      ['ls-remote', '--tags', '--refs', remoteName, `refs/tags/${options.tagName}`],
      {
        maxOutputBytes: options.maxOutputBytes ?? DEFAULT_REMOTE_TAG_STATE_MAX_OUTPUT_BYTES,
        signal: controller.signal
      }
    );
    return parseRemoteTagNames(stdout).has(options.tagName) ? 'published' : 'unpublished';
  } catch {
    return 'unknown';
  } finally {
    clearTimeout(timeout);
  }
}
