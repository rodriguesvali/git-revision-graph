import type { RevisionGraphRef } from './model/commitGraphTypes';

export type RevisionLogSource =
  | {
    readonly kind: 'target';
    readonly revision: string;
    readonly label: string;
  }
  | {
    readonly kind: 'range';
    readonly baseRevision: string;
    readonly baseLabel: string;
    readonly compareRevision: string;
    readonly compareLabel: string;
  };

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
