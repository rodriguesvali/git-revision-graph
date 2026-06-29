import { RefActionServices } from '../refActions';

export function withCurrentStateBeforeBlockingMessage(
  services: RefActionServices,
  postCurrentState: () => void
): RefActionServices {
  return {
    ...services,
    ui: {
      ...services.ui,
      async showErrorMessage(message, options) {
        if (options?.modal) {
          postCurrentState();
        }

        await services.ui.showErrorMessage(message, options);
      }
    }
  };
}
