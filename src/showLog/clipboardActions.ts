import {
  getDefaultClipboardWriter,
  type ClipboardWriter
} from '../clipboard';
import type { ShowLogState } from '../showLogShared';
import {
  getShowLogChangeFileName,
  getShowLogChangeFullPath
} from './fileActions';
import {
  findShowLogChange,
  isLoadedShowLogCommitHash
} from './stateLookup';

export type ShowLogClipboardServices = ClipboardWriter;

export async function copyShowLogChangeFileName(
  state: ShowLogState,
  commitHash: string,
  changeId: string,
  services?: ShowLogClipboardServices
): Promise<boolean> {
  const change = findShowLogChange(state, commitHash, changeId);
  if (!change) {
    return false;
  }

  const clipboard = services ?? await getDefaultClipboardWriter();
  await clipboard.writeText(getShowLogChangeFileName(change));
  return true;
}

export async function copyShowLogChangeFullPath(
  state: ShowLogState,
  commitHash: string,
  changeId: string,
  services?: ShowLogClipboardServices
): Promise<boolean> {
  const change = findShowLogChange(state, commitHash, changeId);
  if (!change) {
    return false;
  }

  const clipboard = services ?? await getDefaultClipboardWriter();
  await clipboard.writeText(getShowLogChangeFullPath(change));
  return true;
}

export async function copyShowLogCommitHash(
  state: ShowLogState,
  commitHash: string,
  services?: ShowLogClipboardServices
): Promise<boolean> {
  if (!isLoadedShowLogCommitHash(state, commitHash)) {
    return false;
  }

  const clipboard = services ?? await getDefaultClipboardWriter();
  await clipboard.writeText(commitHash);
  return true;
}

export async function copyShowLogReferenceName(
  state: ShowLogState,
  commitHash: string,
  refName: string,
  services?: ShowLogClipboardServices
): Promise<boolean> {
  const entry = state.kind === 'visible'
    ? state.entries.find((candidate) => candidate.hash === commitHash)
    : undefined;
  if (!entry || !entry.references.some((ref) => ref.name === refName)) {
    return false;
  }

  const clipboard = services ?? await getDefaultClipboardWriter();
  await clipboard.writeText(refName);
  return true;
}
