import type { Repository } from '../git';
import type { loadCommitPatch, loadComparisonPatch } from './exportGit';
import type { CommitPatchFile } from './files';
import type { RefSelection } from '../refActions/types';

export interface PatchExportServices {
  suggestComparisonFileName(source: RefSelection, target?: RefSelection): Promise<string>;
  chooseDirectory(): Promise<string | undefined>;
  writeCommitPatches(directory: string, files: readonly CommitPatchFile[], isCurrent: () => boolean): Promise<void>;
  chooseDestination(defaultName: string): Promise<string | undefined>;
  writeFile(destination: string, bytes: Uint8Array): Promise<void>;
  hasDirtyEditors(root: string): boolean;
  loadCommit: typeof loadCommitPatch;
  loadComparison: typeof loadComparisonPatch;
}

export class PatchExportRequest {
  private busy = false;
  async run(action: () => Promise<void>): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try { await action(); } finally { this.busy = false; }
  }
}

export async function patchExportServices(repository: Repository, services?: PatchExportServices): Promise<PatchExportServices> {
  return services ?? (await import('../workbenchPatchFiles')).createPatchExportServices(repository.rootUri);
}

export async function savePatchExport(
  defaultName: string, load: () => Promise<Buffer>, isCurrent: () => boolean,
  services: Pick<PatchExportServices, 'chooseDestination' | 'writeFile'>
): Promise<void> {
  if (!isCurrent()) return;
  const destination = await services.chooseDestination(defaultName);
  if (!destination || !isCurrent()) return;
  const bytes = await load();
  if (!isCurrent()) return;
  if (!bytes.length) throw new Error('There are no changes to save as a patch.');
  await services.writeFile(destination, bytes);
}
