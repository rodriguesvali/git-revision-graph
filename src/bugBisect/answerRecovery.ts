import { isOwnedBisectLog } from './logOwnership';
import type { BisectSession } from './sessionState';

/** The saved intent authorizes exactly one pinned classification on this instance. */
export function isPendingAnswerApplied(session: BisectSession, log: string): boolean {
  const answer = session.pendingAnswer;
  return !!answer && answer.logBefore !== undefined && log !== answer.logBefore
    && isOwnedBisectLog(answer.logBefore, log, [answer.answer, answer.commit.hash]);
}

/** Rebuild's persisted history authorizes only the next answer in that replay. */
export function isRebuildAnswerApplied(session: BisectSession, log: string): boolean {
  if (!session.rebuilding || session.pendingAnswer || log === session.log) return false;
  const recorded = session.log.split(/\r?\n/).filter(line => line.startsWith('git bisect ')).length;
  const answer = recorded > 0 ? session.history[recorded - 1] : undefined;
  return !!answer && isOwnedBisectLog(session.log, log, [answer.answer, answer.commit.hash]);
}
