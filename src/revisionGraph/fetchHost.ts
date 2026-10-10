import * as vscode from 'vscode';
import type { Repository } from '../git';
import type { RefActionServices } from '../refActions';
import type { RevisionGraphFetchWorkflowHost } from './fetchWorkflow';

type FetchEffects = Pick<RevisionGraphFetchWorkflowHost, 'postCurrentState' | 'refresh' | 'prepareRefresh' | 'createCurrentRepositoryRefreshRequest'>;

export function createRevisionGraphFetchHost(
  services: RefActionServices,
  effects: FetchEffects,
  getRepository: () => Repository | undefined,
  assertMutationCurrent?: () => void,
  signal?: AbortSignal
): RevisionGraphFetchWorkflowHost {
  return {
    ...effects,
    ui: services.ui,
    progress: services.progress!,
    getCurrentRepositoryLabel() {
      const repository = getRepository();
      return repository ? vscode.workspace.asRelativePath(repository.rootUri, false) || repository.rootUri.fsPath : 'the current repository';
    },
    assertMutationCurrent,
    signal
  };
}
