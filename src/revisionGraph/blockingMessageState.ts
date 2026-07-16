import { RefActionServices } from '../refActions';

export function withCurrentStateBeforeBlockingMessage(
  services: RefActionServices,
  postCurrentState: () => void
): RefActionServices {
  return {
    ...services,
    ui: {
      ...services.ui,
      async showInformationMessage(message, options) {
        if (options?.modal) {
          postCurrentState();
        }

        await services.ui.showInformationMessage(message, options);
      },
      async showWarningMessage(message, options) {
        if (options?.modal) {
          postCurrentState();
        }

        await services.ui.showWarningMessage(message, options);
      },
      async showErrorMessage(message, options) {
        postCurrentState();
        await services.ui.showErrorMessage(message, options);
      }
    }
  };
}
