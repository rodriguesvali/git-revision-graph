import type { RevisionGraphRef } from './model/commitGraphTypes';

export type RevisionLogSource = RevisionGraphProtocol.RevisionLogSource;

export const REVISION_LOG_FILTER_SCAN_MAX_COMMITS = 2000;

/** Host-only history identity retained across pages of one Show Log view. */
export interface RevisionLogHistorySnapshot {
  readonly repositoryPath: string;
  readonly requestKey: string;
  readonly source: RevisionLogSource;
  readonly refSnapshot?: string;
  readonly anchorOffset: number;
}

export interface RevisionLogEntry {
  readonly hash: string;
  readonly shortHash: string;
  readonly author: string;
  readonly date: string;
  readonly subject: string;
  readonly message: string;
  readonly parentHashes: readonly string[];
  readonly references: readonly RevisionGraphRef[];
  readonly shortStat:
    | {
      readonly files: number;
      readonly insertions: number;
      readonly deletions: number;
    }
    | undefined;
}
