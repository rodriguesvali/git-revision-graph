import { isBisectHash } from './git';

export interface BisectSession extends RevisionGraphProtocol.BisectView {
  started: boolean;
  log: string;
  expectedHead: string;
  rebuilding?: boolean;
  returning?: boolean;
  pendingAnswer?: { readonly commit: RevisionGraphProtocol.BisectCommit; readonly answer: 'good' | 'bad' | 'skip' };
}

export function readBisectSessions(value: unknown): BisectSession[] {
  if (!Array.isArray(value) || value.length > 100) return [];
  return value.filter(isBisectSession).map((session) => ({ ...session, busy: false }));
}

function isCommit(value: unknown): value is RevisionGraphProtocol.BisectCommit {
  return isRecord(value) && isBisectHash(value.hash) && typeof value.subject === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isBisectSession(value: unknown): value is BisectSession {
  if (!isRecord(value)) return false;
  return validIdentity(value) && validState(value) && validData(value);
}

function validIdentity(value: Record<string, unknown>): boolean {
  return typeof value.id === 'string' && value.id.length > 0
    && Number.isSafeInteger(value.version) && (value.version as number) > 0
    && typeof value.repositoryPath === 'string' && value.repositoryPath.length > 0
    && isBisectHash(value.expectedHead)
    && typeof value.log === 'string' && value.log.length <= 4 * 1024 * 1024;
}

function validState(value: Record<string, unknown>): boolean {
  return ['preparing', 'testing', 'found', 'inconclusive', 'outside'].includes(String(value.status))
    && isCommit(value.selected) && isCommit(value.original)
    && (value.current === undefined || isCommit(value.current))
    && (value.branch === undefined || (typeof value.branch === 'string' && value.branch.startsWith('refs/heads/')))
    && typeof value.swapped === 'boolean' && typeof value.started === 'boolean';
}

function validData(value: Record<string, unknown>): boolean {
  return typeof value.mergeBaseCheck === 'boolean' && typeof value.busy === 'boolean'
    && (value.error === undefined || typeof value.error === 'string')
    && (value.stepsRemaining === undefined || (Number.isSafeInteger(value.stepsRemaining) && (value.stepsRemaining as number) >= 0))
    && (value.rebuilding === undefined || typeof value.rebuilding === 'boolean')
    && (value.returning === undefined || typeof value.returning === 'boolean')
    && validHistory(value);
}

function validHistory(value: Record<string, unknown>): boolean {
  return Array.isArray(value.candidates) && value.candidates.length <= 10000 && value.candidates.every(isCommit)
    && (value.pendingAnswer === undefined || validAnswer(value.pendingAnswer))
    && Array.isArray(value.history) && value.history.length <= 10000 && value.history.every(validAnswer);
}

function validAnswer(value: unknown): boolean {
  return isRecord(value) && isCommit(value.commit) && ['good', 'bad', 'skip'].includes(String(value.answer));
}

export function bisectView(session: BisectSession): RevisionGraphProtocol.BisectView {
  const { started: _started, log: _log, expectedHead: _expectedHead, rebuilding: _rebuilding, returning: _returning, pendingAnswer: _pendingAnswer, ...view } = session;
  return view;
}
