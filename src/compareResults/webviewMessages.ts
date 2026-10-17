import { renderScopedWebviewPostMessage } from '../webviewMessageOrigin';

export function renderCompareResultsMessageScript(): string {
  return `${renderScopedWebviewPostMessage()}
    function postSingleAction(type, itemId) {
      postMessage({ type, itemId });
    }

    function postMultiAction(type, itemIds) {
      postMessage({ type, itemIds });
    }

`;
}
