import { formatShortCommitHash } from '../commitHash';
import type { Repository } from '../git';
import {
  checkoutResolvedReference,
  createTagFromResolvedReference,
  type RefActionServices,
  type RefActionTarget
} from '../refActions';
import {
  createMutationGuardedRefActionServices,
  createMutationGuardedRepository,
  type RepositoryMutationCoordinator
} from '../repositoryMutationCoordinator';
import type { ShowLogState } from '../showLogShared';
import { showModalErrorMessage } from '../workbenchMessages';
import { getVisibleShowLogRepository } from './stateLookup';

export type ShowLogCommitRefAction = 'checkout' | 'create-tag';

export interface ShowLogCommitRefActionUi {
  showErrorMessage(message: string): Promise<void>;
}

export interface ShowLogCommitRefActionWorkflows {
  checkout(
    repository: Repository,
    target: RefActionTarget,
    services: RefActionServices
  ): Promise<void>;
  createTag(
    repository: Repository,
    target: RefActionTarget,
    services: RefActionServices
  ): Promise<void>;
}

export interface ShowLogCommitRefActionOutcome {
  readonly status: 'completed' | 'rejected';
}

const DEFAULT_WORKFLOWS: ShowLogCommitRefActionWorkflows = {
  checkout: checkoutResolvedReference,
  createTag: createTagFromResolvedReference
};

export async function runShowLogCommitRefAction(
  state: ShowLogState,
  commitHash: string,
  action: ShowLogCommitRefAction,
  services: RefActionServices | undefined,
  mutationCoordinator?: RepositoryMutationCoordinator,
  ui?: ShowLogCommitRefActionUi,
  workflows: ShowLogCommitRefActionWorkflows = DEFAULT_WORKFLOWS
): Promise<ShowLogCommitRefActionOutcome> {
  const repository = getVisibleShowLogRepository(state);
  const target = getShowLogCommitRefActionTarget(state, commitHash);
  if (!repository || !target) {
    return { status: 'completed' };
  }

  if (!services) {
    const actionUi = ui ?? getDefaultShowLogCommitRefActionUi();
    await actionUi.showErrorMessage(
      action === 'checkout'
        ? 'Could not check out the commit because Git actions are not ready yet.'
        : 'Could not create the tag because Git actions are not ready yet.'
    );
    return { status: 'completed' };
  }

  const execute = async (currentRepository: Repository, currentServices: RefActionServices) => {
    if (action === 'checkout') {
      await workflows.checkout(currentRepository, target, currentServices);
    } else {
      await workflows.createTag(currentRepository, target, currentServices);
    }
  };
  if (!mutationCoordinator) {
    await execute(repository, services);
    return { status: 'completed' };
  }

  return mutationCoordinator.run(repository.rootUri.fsPath, (lease) => execute(
    createMutationGuardedRepository(repository, lease),
    createMutationGuardedRefActionServices(services, lease)
  ));
}

export function getShowLogCommitRefActionTarget(
  state: ShowLogState,
  commitHash: string
): RefActionTarget | undefined {
  if (state.kind !== 'visible') {
    return undefined;
  }

  const entry = state.entries.find((item) => item.hash === commitHash);
  return entry
    ? {
      refName: entry.hash,
      label: entry.shortHash || formatShortCommitHash(entry.hash),
      kind: 'commit'
    }
    : undefined;
}

function getDefaultShowLogCommitRefActionUi(): ShowLogCommitRefActionUi {
  return {
    showErrorMessage: showModalErrorMessage
  };
}
