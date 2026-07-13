import type { RevisionGraphRef } from './model/commitGraphTypes';

export type RevisionLogSource = RevisionGraphProtocol.RevisionLogSource;

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
