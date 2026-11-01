import { execGit } from '../../gitExec';
import type { Repository } from '../../git';
import { qualifiedRevision } from '../../refActions/qualifiedRevision';
import type { RevisionLogHistorySnapshot, RevisionLogSource } from '../revisionLogTypes';

const REVISION_LOG_MAX_OUTPUT_BYTES = 12 * 1024 * 1024;
const DEFAULT_GIT_COMMAND_TIMEOUT_MS = 15000;
const REVISION_LOG_ANCHOR_SCAN_BATCH_SIZE = 10000;
const REVISION_LOG_ANCHOR_SCAN_MAX_COMMITS = 200000;

export async function prepareRevisionLogHistory(
  repository: Repository,
  source: RevisionLogSource,
  showAllBranches: boolean,
  filterText: string | undefined,
  snapshot: RevisionLogHistorySnapshot | 'capture' | undefined,
  signal?: AbortSignal
): Promise<{ effectiveSource: RevisionLogSource; refSnapshot: string | undefined; anchorOffset: number; currentSnapshot: RevisionLogHistorySnapshot | undefined }> {
  const requestKey = JSON.stringify({ source, showAllBranches, filterText: filterText ?? '' });
  if (typeof snapshot === 'object') {
    if (snapshot.repositoryPath !== repository.rootUri.fsPath || snapshot.requestKey !== requestKey) {
      throw new Error('The log history snapshot does not match the current request.');
    }
    return { effectiveSource: snapshot.source, refSnapshot: snapshot.refSnapshot,
      anchorOffset: snapshot.anchorOffset, currentSnapshot: snapshot };
  }
  const resolvedSource = await resolveHistorySource(repository, source, snapshot === 'capture', signal);
  const refSnapshot = showAllBranches && resolvedSource.kind === 'target'
    ? await captureRevisionTips(repository, signal) : undefined;
  const anchor = refSnapshot !== undefined && resolvedSource.kind === 'target'
    ? await findAllBranchesAnchor(repository, resolvedSource.revision, refSnapshot, signal) : undefined;
  const effectiveSource: RevisionLogSource = anchor && resolvedSource.kind === 'target'
    ? { ...resolvedSource, revision: anchor.hash } : resolvedSource;
  const anchorOffset = anchor?.offset ?? 0;
  const currentSnapshot = snapshot === 'capture' ? {
    repositoryPath: repository.rootUri.fsPath, requestKey, source: effectiveSource, refSnapshot, anchorOffset
  } : undefined;
  return { effectiveSource, refSnapshot, anchorOffset, currentSnapshot };
}

async function resolveHistorySource(repository: Repository, source: RevisionLogSource, capture: boolean, signal?: AbortSignal): Promise<RevisionLogSource> {
  if (source.kind === 'target') {
    if (!source.refKind && !capture) return source;
    const revision = source.refKind
      ? await resolveLogTarget(repository, source.revision, source.refKind, signal)
      : await resolveLogCommit(repository, source.revision, signal);
    return { kind: 'target', revision, label: source.label };
  }
  if (!capture) return source;
  const baseRevision = await resolveLogCommit(repository, source.baseRevision, signal);
  const compareRevision = await resolveLogCommit(repository, source.compareRevision, signal);
  return { ...source, baseRevision, compareRevision };
}

async function resolveLogCommit(repository: Repository, revision: string, signal?: AbortSignal): Promise<string> {
  const hash = (await execGit(repository.rootUri.fsPath, ['rev-parse', '--verify', '--end-of-options', `${revision}^{commit}`],
    { signal, timeoutMs: DEFAULT_GIT_COMMAND_TIMEOUT_MS, maxOutputBytes: REVISION_LOG_MAX_OUTPUT_BYTES })).trim();
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(hash)) throw new Error('The selected revision does not resolve to a commit.');
  return hash;
}

async function resolveLogTarget(repository: Repository, revision: string, kind: RevisionGraphProtocol.TargetKind, signal?: AbortSignal): Promise<string> {
  if (kind === 'stash' && revision !== 'stash') throw new Error('Invalid stash reference.');
  const qualified = qualifiedRevision(revision, kind);
  const options = { signal, timeoutMs: DEFAULT_GIT_COMMAND_TIMEOUT_MS, maxOutputBytes: REVISION_LOG_MAX_OUTPUT_BYTES };
  const object = qualified.startsWith('refs/')
    ? (await execGit(repository.rootUri.fsPath, ['show-ref', '--verify', '--hash', '--', qualified], options)).trim()
    : qualified;
  const hash = (await execGit(repository.rootUri.fsPath, ['rev-parse', '--verify', '--end-of-options', `${object}^{commit}`], options)).trim();
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(hash)) throw new Error('The selected reference does not resolve to a commit.');
  return hash;
}

async function captureRevisionTips(repository: Repository, signal?: AbortSignal): Promise<string> {
  const output = await execGit(repository.rootUri.fsPath, ['rev-list', '--no-walk=unsorted', '--all'],
    { signal, timeoutMs: DEFAULT_GIT_COMMAND_TIMEOUT_MS, maxOutputBytes: REVISION_LOG_MAX_OUTPUT_BYTES });
  const hashes = output.trim() ? output.trim().split(/\r?\n/) : [];
  if (hashes.some(hash => !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(hash))) {
    throw new Error('Could not capture valid repository revision tips.');
  }
  return hashes.length ? `${hashes.join('\n')}\n` : '';
}

async function findAllBranchesAnchor(repository: Repository, revision: string, refSnapshot: string, signal?: AbortSignal): Promise<{ hash: string; offset: number }> {
  const options = { signal, timeoutMs: DEFAULT_GIT_COMMAND_TIMEOUT_MS, maxOutputBytes: REVISION_LOG_MAX_OUTPUT_BYTES };
  const hash = (await execGit(repository.rootUri.fsPath,
    ['rev-parse', '--verify', '--end-of-options', `${revision}^{commit}`], options)).trim();
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(hash)) throw new Error('Could not resolve the selected revision to a commit.');
  for (let offset = 0; offset < REVISION_LOG_ANCHOR_SCAN_MAX_COMMITS; offset += REVISION_LOG_ANCHOR_SCAN_BATCH_SIZE) {
    const output = await execGit(repository.rootUri.fsPath,
      ['rev-list', '--topo-order', '--stdin', `--max-count=${REVISION_LOG_ANCHOR_SCAN_BATCH_SIZE}`,
        `--skip=${offset}`, '--end-of-options', hash], { ...options, stdin: refSnapshot });
    const hashes = output.trim() ? output.trim().split('\n') : [];
    const index = hashes.indexOf(hash);
    if (index >= 0) return { hash, offset: offset + index };
    if (hashes.length < REVISION_LOG_ANCHOR_SCAN_BATCH_SIZE) break;
  }
  throw new Error('The selected revision could not be located within the first 200,000 commits of the all-branches history.');
}
