import type { RefActionProgress, RefActionProgressMode } from './types';

export function createRefActionProgress(
  onStart: (label: string, mode: RefActionProgressMode) => void,
  onStop: () => void
): RefActionProgress {
  return {
    run: async (label, mode, operation) => {
      onStart(label, mode);
      try {
        return await operation();
      } finally {
        onStop();
      }
    }
  };
}
