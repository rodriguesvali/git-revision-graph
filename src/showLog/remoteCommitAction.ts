import type { Repository } from '../git';
import { resolveHostedGitRemote } from '../hostedGitRemote';
import { buildRemoteCommitUrl } from './remoteCommitUrl';

export interface ShowLogRemoteCommitServices {
  openExternal(url: string): Promise<void>;
  showInformationMessage(message: string): Promise<void>;
}

export async function openShowLogCommitOnRemote(
  repository: Repository,
  commitHash: string,
  services?: ShowLogRemoteCommitServices
): Promise<boolean> {
  const remoteServices = services ?? await getDefaultShowLogRemoteCommitServices();
  const url = buildRemoteCommitUrl(repository, commitHash);
  if (!url) {
    const remote = resolveHostedGitRemote(repository);
    const message = remote
      ? `${remote.providerLabel} does not expose a verified commit link for this remote.`
      : 'No supported Git hosting remote is configured for this repository.';
    await remoteServices.showInformationMessage(message);
    return false;
  }

  await remoteServices.openExternal(url);
  return true;
}

async function getDefaultShowLogRemoteCommitServices(): Promise<ShowLogRemoteCommitServices> {
  const vscode = await import('vscode');
  return {
    async openExternal(url) {
      await vscode.env.openExternal(vscode.Uri.parse(url));
    },
    async showInformationMessage(message) {
      await vscode.window.showInformationMessage(message);
    }
  };
}
