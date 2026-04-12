import { renderRevisionGraphScriptBootstrap } from './script/bootstrap';
import { renderRevisionGraphScriptGraphLogic } from './script/graph';
import { renderRevisionGraphScriptInteractions } from './script/interactions';
import { renderRevisionGraphScriptLayout } from './script/layout';
import { RenderRevisionGraphScriptOptions } from './script/types';

export type { RenderRevisionGraphScriptOptions } from './script/types';

export function renderRevisionGraphScript(options: RenderRevisionGraphScriptOptions): string {
  return `<script nonce="${options.nonce}">${renderRevisionGraphScriptBootstrap(options)}${renderRevisionGraphScriptInteractions()}${renderRevisionGraphScriptGraphLogic()}${renderRevisionGraphScriptLayout()}
  </script>`;
}
