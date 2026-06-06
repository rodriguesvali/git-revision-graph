import type { ShowLogState } from '../showLogShared';
import {
  getShowLogChangeFileName,
  getShowLogChangeFullPath
} from './fileActions';
import {
  findShowLogChange,
  isLoadedShowLogCommitHash
} from './stateLookup';

export interface ShowLogClipboardServices {
  writeText(text: string): Promise<void>;
}

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

  const clipboard = services ?? await getDefaultShowLogClipboardServices();
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

  const clipboard = services ?? await getDefaultShowLogClipboardServices();
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

  const clipboard = services ?? await getDefaultShowLogClipboardServices();
  await clipboard.writeText(commitHash);
  return true;
}

async function getDefaultShowLogClipboardServices(): Promise<ShowLogClipboardServices> {
  const vscode = await import('vscode');
  return {
    async writeText(text) {
      await vscode.env.clipboard.writeText(text);
    }
  };
}
