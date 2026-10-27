import type { CompareResultsState } from '../compareResultsShared';
import { patchExportServices, savePatchExport, type PatchExportServices } from '../patches/exportWorkflow';

export async function saveComparePatch(getState: () => CompareResultsState, supplied?: PatchExportServices): Promise<void> {
  const state = getState();
  if (state.kind !== 'between' && state.kind !== 'worktree') return;
  const services = await patchExportServices(state.repository, supplied);
  const name = await (state.kind === 'between'
    ? services.suggestComparisonFileName(state.left.refName, state.right.refName)
    : services.suggestComparisonFileName(state.target.refName));
  await savePatchExport(name, async () => {
    if (state.kind === 'worktree' && services.hasDirtyEditors(state.repository.rootUri.fsPath)) {
      throw new Error('Save unsaved editors before exporting the worktree patch.');
    }
    const bytes = await (state.kind === 'between'
      ? services.loadComparison(state.repository.rootUri.fsPath, state.left.refName, state.right.refName)
      : services.loadComparison(state.repository.rootUri.fsPath, state.target.refName));
    if (state.kind === 'worktree' && services.hasDirtyEditors(state.repository.rootUri.fsPath)) {
      throw new Error('Save unsaved editors and export the worktree patch again.');
    }
    return bytes;
  }, () => getState() === state, services);
}
