import { CommitGraph } from '../model/commitGraphTypes';

export interface RevisionGraphSnapshot {
  readonly graph: CommitGraph;
  readonly loadedAt: number;
  readonly requestedLimit: number;
}
