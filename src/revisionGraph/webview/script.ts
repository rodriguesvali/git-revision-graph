import { renderRevisionGraphScriptBootstrap } from './script/bootstrap';
import { renderRevisionGraphScriptGraphLogic } from './script/graph';
import { renderRevisionGraphScriptInteractions } from './script/interactions';
import { renderRevisionGraphScriptLayout } from './script/layout';
import { renderRevisionGraphScriptMessageBuilders } from './script/messages';
import { RenderRevisionGraphScriptOptions } from './script/types';
import { renderWebviewDisplayHelpers } from '../../webviewDisplayHelpers';

export type { RenderRevisionGraphScriptOptions } from './script/types';

export function renderRevisionGraphScript(options: RenderRevisionGraphScriptOptions): string {
  return `<script nonce="${options.nonce}">${renderWebviewDisplayHelpers()}${renderRevisionGraphScriptMessageBuilders()}${renderRevisionGraphScriptBootstrap(options)}${renderRevisionGraphScriptInteractions()}${renderRevisionGraphScriptGraphLogic()}${renderRevisionGraphScriptLayout()}
  </script>`;
}
