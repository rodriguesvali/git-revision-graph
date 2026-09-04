import type { Repository } from '../git';
import type { RefActionServices } from '../refActions';
import { isShowLogStateForRepository, type ShowLogState } from '../showLogShared';

interface ShowLogProcessingFeedbackOptions {
  readonly repository: Repository;
  readonly sourceToken: string;
  readonly getState: () => ShowLogState;
  readonly applyState: (state: ShowLogState) => void;
}

export function withShowLogProcessingFeedback(
  services: RefActionServices,
  options: ShowLogProcessingFeedbackOptions
): RefActionServices {
  return {
    ...services,
    progress: {
      run: async (label, _mode, operation) => {
        setProcessingFeedback(options, true, label);
        try {
          return await operation();
        } finally {
          setProcessingFeedback(options, false);
        }
      }
    }
  };
}

function setProcessingFeedback(
  options: ShowLogProcessingFeedbackOptions,
  loading: boolean,
  loadingLabel?: string
): void {
  const state = options.getState();
  if (
    state.kind !== 'visible'
    || state.sourceToken !== options.sourceToken
    || !isShowLogStateForRepository(state, options.repository)
  ) {
    return;
  }

  options.applyState({ ...state, loading, loadingLabel });
}
