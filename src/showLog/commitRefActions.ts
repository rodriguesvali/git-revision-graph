import { formatShortCommitHash } from '../commitHash';
import type { Repository } from '../git';
import {
  createBranchFromResolvedReference,
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
  createBranch(
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
  readonly refreshRequested: boolean;
}

const DEFAULT_WORKFLOWS: ShowLogCommitRefActionWorkflows = {
  createBranch: createBranchFromResolvedReference,
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
    return { status: 'completed', refreshRequested: false };
  }

  if (!services) {
    const actionUi = ui ?? getDefaultShowLogCommitRefActionUi();
    await actionUi.showErrorMessage(
      action === 'checkout'
        ? 'Could not create the branch because Git actions are not ready yet.'
        : 'Could not create the tag because Git actions are not ready yet.'
    );
    return { status: 'completed', refreshRequested: false };
  }

  let refreshRequested = false;
  const execute = async (currentRepository: Repository, currentServices: RefActionServices) => {
    const observedRepository = observeBranchCreation(currentRepository, () => {
      refreshRequested = true;
    });
    const observedServices = observeRefreshRequests(currentServices, () => {
      refreshRequested = true;
    });
    if (action === 'checkout') {
      await workflows.createBranch(observedRepository, target, observedServices);
    } else {
      await workflows.createTag(observedRepository, target, observedServices);
    }
  };
  if (!mutationCoordinator) {
    await execute(repository, services);
    return { status: 'completed', refreshRequested };
  }

  const outcome = await mutationCoordinator.run(repository.rootUri.fsPath, (lease) => execute(
    createMutationGuardedRepository(repository, lease),
    createMutationGuardedRefActionServices(services, lease)
  ));
  return outcome.status === 'rejected'
    ? { status: 'rejected', refreshRequested: false }
    : { status: 'completed', refreshRequested };
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

function observeRefreshRequests(
  services: RefActionServices,
  onRefresh: () => void
): RefActionServices {
  return {
    ...services,
    refreshController: {
      prepare: (request) => services.refreshController.prepare(request),
      refresh: (request) => {
        services.refreshController.refresh(request);
        onRefresh();
      }
    }
  };
}

function observeBranchCreation(
  repository: Repository,
  onCreated: () => void
): Repository {
  return new Proxy(repository, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (property !== 'createBranch' || typeof value !== 'function') {
        return value;
      }

      return async (...args: Parameters<Repository['createBranch']>) => {
        await Reflect.apply(value, target, args);
        onCreated();
      };
    }
  });
}
