import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const runtimePath = `${projectRoot}/out/webview/revisionGraph.js`;
const sourceMapPath = `${runtimePath}.map`;
const wrapperStart = '(function initializeRevisionGraphWebviewRuntime() {';
const wrapperEnd = '})();';

const source = readFileSync(runtimePath, 'utf8');
const isWrapped = source.startsWith(wrapperStart);
if (!isWrapped) {
  const sourceMapCommentMatch = source.match(/\n?\/\/# sourceMappingURL=.*?\s*$/);
  const sourceMapComment = sourceMapCommentMatch?.[0].trim() ?? '';
  const body = sourceMapCommentMatch
    ? source.slice(0, sourceMapCommentMatch.index).trimEnd()
    : source.trimEnd();
  const wrappedSource = `${wrapperStart}\n${body}\n${wrapperEnd}\n${sourceMapComment}\n`;
  writeFileSync(runtimePath, wrappedSource, 'utf8');

}

const sourceMap = JSON.parse(readFileSync(sourceMapPath, 'utf8'));
if (sourceMap.x_revisionGraphRuntimeWrapped !== true) {
  if (!isWrapped || !String(sourceMap.mappings ?? '').startsWith(';')) {
    sourceMap.mappings = `;${sourceMap.mappings ?? ''}`;
  }
  sourceMap.x_revisionGraphRuntimeWrapped = true;
  writeFileSync(sourceMapPath, JSON.stringify(sourceMap), 'utf8');
}
