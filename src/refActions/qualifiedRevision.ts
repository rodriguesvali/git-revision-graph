import type { RefActionKind } from './types';

/** Reference names supplied by vscode.git and the graph are short names. */
export function qualifiedRevision(name: string, kind?: RefActionKind): string {
  switch (kind) {
    case 'head': return name === 'HEAD' ? name : `refs/heads/${name}`;
    case 'branch': return `refs/heads/${name}`;
    case 'remote': return `refs/remotes/${name}`;
    case 'tag': return `refs/tags/${name}`;
    case 'stash': return name === 'stash' ? 'refs/stash' : name;
    default: return name;
  }
}
