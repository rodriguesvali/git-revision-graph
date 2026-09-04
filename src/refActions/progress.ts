import type { RefActionProgress, RefActionProgressMode } from './types';

export function createRefActionProgress<TStartResult = void>(
  onStart: (label: string, mode: RefActionProgressMode) => TStartResult,
  onStop: (startResult: TStartResult) => void
): RefActionProgress {
  return {
    run: async (label, mode, operation) => {
      const startResult = onStart(label, mode);
      try {
        return await operation();
      } finally {
        onStop(startResult);
      }
    }
  };
}

export interface LatestRefActionProgress {
  readonly progress: RefActionProgress;
  invalidate(): void;
}

export function createLatestRefActionProgress(
  onStart: (label: string, mode: RefActionProgressMode) => void,
  onStop: () => void
): LatestRefActionProgress {
  let currentOwner: symbol | undefined;
  return {
    progress: createRefActionProgress(
      (label, mode) => {
        const owner = Symbol(label);
        currentOwner = owner;
        onStart(label, mode);
        return owner;
      },
      (owner) => {
        if (currentOwner !== owner) {
          return;
        }
        currentOwner = undefined;
        onStop();
      }
    ),
    invalidate() {
      currentOwner = undefined;
    }
  };
}
