import type { ShowLogState } from '../showLogShared';
import { patchExportServices, savePatchExport, type PatchExportServices } from '../patches/exportWorkflow';
import { isLoadedShowLogCommitHash } from './stateLookup';
import { PATCH_MAX_BYTES } from '../patches/input';
import type { CommitPatchFile } from '../patches/files';

export async function formatShowLogPatch(
  getState: () => ShowLogState, hashes: readonly string[], supplied?: PatchExportServices
): Promise<void> {
  const state = getState();
  const selected = new Set(hashes);
  if (!state.repository || state.loading || !selected.size || hashes.length > 1000
    || !hashes.every(hash => isLoadedShowLogCommitHash(state, hash))) return;
  // Match the displayed history, oldest row first; never expand a selected range.
  const entries = state.entries.filter(entry => selected.has(entry.hash)).reverse();
  if (entries.some(entry => entry.parentHashes.length > 1)) throw new Error('Format Patch is not available for merge commits.');
  const services = await patchExportServices(state.repository, supplied);
  const isCurrent = () => getState() === state;
  if (entries.length === 1) {
    const hash = entries[0].hash;
    await savePatchExport(`commit-${hash.slice(0, 8)}.patch`,
      () => services.loadCommit(state.repository!.rootUri.fsPath, hash), isCurrent, services);
    return;
  }
  if (!isCurrent()) return;
  const directory = await services.chooseDirectory();
  if (!directory || !isCurrent()) return;
  const files: CommitPatchFile[] = [];
  let total = 0;
  for (const entry of entries) {
    const bytes = await services.loadCommit(state.repository.rootUri.fsPath, entry.hash);
    if (!isCurrent()) return;
    total += bytes.length;
    if (!bytes.length) throw new Error('A selected commit has no exportable changes.');
    if (total > PATCH_MAX_BYTES) throw new Error('The selected patches exceed the 32 MiB export limit.');
    files.push({ name: `${String(files.length + 1).padStart(4, '0')}-${entry.hash.slice(0, 12)}.patch`, bytes });
  }
  await services.writeCommitPatches(directory, files, isCurrent);
}
