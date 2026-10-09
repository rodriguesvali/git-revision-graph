import { getRepositoryRelativeChangePath, getRepositoryRelativeUriPath, getStatusLabel } from '../changePresentation';
import { toOperationError } from '../errorDetail';
import { isAbortError } from '../errors';
import { loadShowLogFileMatchPaths } from '../revisionGraph/backendServices/revisionLogFileSearch';
import { parseRevisionLogQuery } from '../revisionGraph/source/revisionLogQuery';
import type { ShowLogFileFilterState, ShowLogState } from '../showLogShared';
import { ShowLogLoadRequests } from './loadRequests';

export function getInheritedShowLogFileFilter(filterText: string): string {
  try {
    const query = parseRevisionLogQuery(filterText);
    if (query.change === undefined) return '';
    return [query.file !== undefined ? `file:${JSON.stringify(query.file)}` : '',
      `change:${JSON.stringify(query.change)}`].filter(Boolean).join(' ');
  } catch { return ''; }
}

export class ShowLogFileSearch {
  private readonly requests = new ShowLogLoadRequests();
  private readonly filters = new Map<string, string>();

  constructor(
    private readonly getState: () => ShowLogState,
    private readonly applyState: (state: ShowLogState) => void,
    private readonly loadPaths: typeof loadShowLogFileMatchPaths = loadShowLogFileMatchPaths
  ) {}

  invalidate(): void { this.requests.invalidateAndCancel(); }

  reset(): void { this.invalidate(); this.filters.clear(); }

  async show(commitHash: string): Promise<void> {
    const state = this.getState();
    const text = this.filters.get(commitHash) ?? getInheritedShowLogFileFilter(state.filterText);
    await this.set(commitHash, text, state.sourceToken);
  }

  async set(commitHash: string, text: string, sourceToken: string): Promise<void> {
    const state = this.getState();
    if (!isActiveFileSearch(state, commitHash, sourceToken)) return;
    const repository = state.repository;
    if (!repository) return;
    this.filters.delete(commitHash);
    this.filters.set(commitHash, text);
    if (this.filters.size > 100) this.filters.delete(this.filters.keys().next().value!);
    const request = this.requests.activate(this.requests.start());
    const filter: ShowLogFileFilterState = { commitHash, text, loading: true };
    this.applyState({ ...state, fileFilter: filter });
    try {
      const query = parseRevisionLogQuery(text);
      const paths = query.change !== undefined || query.file !== undefined
        ? new Set(await this.loadPaths(repository, commitHash, query, request.signal)) : undefined;
      const current = this.getState();
      if (!this.requests.isCurrent(request) || !isActiveFileSearch(current, commitHash, sourceToken)) return;
      const visibleChangeIds = (current.cachedChanges[commitHash] ?? []).flatMap((change, index) => {
        const path = getRepositoryRelativeChangePath(repository.rootUri.fsPath, change);
        const oldPath = getRepositoryRelativeUriPath(repository.rootUri.fsPath, change.originalUri.fsPath);
        const matchesPath = !paths || paths.has(path) || paths.has(oldPath);
        const matchesText = !query.text || path.toLocaleLowerCase().includes(query.text)
          || getStatusLabel(change.status).toLocaleLowerCase().includes(query.text);
        return matchesPath && matchesText ? [`${commitHash}:${index}`] : [];
      });
      this.applyState({ ...current, fileFilter: { ...filter, loading: false, visibleChangeIds } });
    } catch (error) {
      const current = this.getState();
      if (isAbortError(error) || !this.requests.isCurrent(request) || !isActiveFileSearch(current, commitHash, sourceToken)) return;
      this.applyState({ ...current, fileFilter: { ...filter, loading: false,
        error: toOperationError('Could not filter the changed files.', error) } });
    } finally { this.requests.finish(request); }
  }
}

function isActiveFileSearch(state: ShowLogState, commitHash: string, sourceToken: string): boolean {
  return state.kind === 'visible' && state.sourceToken === sourceToken
    && state.expandedCommitHash === commitHash && !!state.cachedChanges[commitHash]
    && state.entries.some(entry => entry.hash === commitHash);
}
