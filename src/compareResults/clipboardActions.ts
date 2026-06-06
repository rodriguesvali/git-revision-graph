import type { CompareResultsState } from '../compareResultsShared';
import {
  getCompareResultItemFileNameList,
  getCompareResultItemFullPathList
} from './itemActions';
import { getCompareResultItems } from './viewState';

export interface CompareResultsClipboardServices {
  writeText(text: string): Promise<void>;
}

export async function copyCompareResultFileNames(
  state: CompareResultsState,
  itemIds: readonly string[],
  services?: CompareResultsClipboardServices
): Promise<boolean> {
  const items = getSelectedCompareResultItems(state, itemIds);
  if (items.length === 0) {
    return false;
  }

  const clipboard = services ?? await getDefaultCompareResultsClipboardServices();
  await clipboard.writeText(getCompareResultItemFileNameList(items));
  return true;
}

export async function copyCompareResultFullPaths(
  state: CompareResultsState,
  itemIds: readonly string[],
  services?: CompareResultsClipboardServices
): Promise<boolean> {
  const items = getSelectedCompareResultItems(state, itemIds);
  if (items.length === 0) {
    return false;
  }

  const clipboard = services ?? await getDefaultCompareResultsClipboardServices();
  await clipboard.writeText(getCompareResultItemFullPathList(items));
  return true;
}

function getSelectedCompareResultItems(
  state: CompareResultsState,
  itemIds: readonly string[]
) {
  const selectedIds = new Set(itemIds);
  return getCompareResultItems(state).filter((item) => selectedIds.has(item.id));
}

async function getDefaultCompareResultsClipboardServices(): Promise<CompareResultsClipboardServices> {
  const vscode = await import('vscode');
  return {
    async writeText(text) {
      await vscode.env.clipboard.writeText(text);
    }
  };
}
