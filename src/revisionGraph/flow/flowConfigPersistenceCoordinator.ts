import * as path from 'node:path';
import {
  RepositoryFlowConfigOptionsUpdate,
  updateRepositoryFlowConfigOptions
} from './flowConfig';
import { FlowGovernanceSettings } from './flowTypes';

export type RepositoryFlowConfigOptionsUpdateResult = Awaited<
  ReturnType<typeof updateRepositoryFlowConfigOptions>
>;

export type RepositoryFlowConfigOptionsPersister = (
  repositoryRootPath: string,
  settings: FlowGovernanceSettings | undefined,
  update: RepositoryFlowConfigOptionsUpdate
) => Promise<RepositoryFlowConfigOptionsUpdateResult>;

/** Serializes Flow Governance configuration writes for each repository. */
export class FlowConfigPersistenceCoordinator {
  private readonly tails = new Map<string, Promise<void>>();

  constructor(
    private readonly persistOptions: RepositoryFlowConfigOptionsPersister =
      updateRepositoryFlowConfigOptions
  ) {}

  enqueue(
    repositoryRootPath: string,
    settings: FlowGovernanceSettings | undefined,
    update: RepositoryFlowConfigOptionsUpdate
  ): Promise<RepositoryFlowConfigOptionsUpdateResult> {
    const repositoryKey = normalizeRepositoryKey(repositoryRootPath);
    const previous = this.tails.get(repositoryKey) ?? Promise.resolve();
    const operation = previous.then(() =>
      this.persistOptions(repositoryRootPath, settings, update)
    );
    const tail = operation.then(
      () => undefined,
      () => undefined
    );

    this.tails.set(repositoryKey, tail);
    void tail.then(() => {
      if (this.tails.get(repositoryKey) === tail) {
        this.tails.delete(repositoryKey);
      }
    });

    return operation;
  }
}

function normalizeRepositoryKey(repositoryRootPath: string): string {
  const normalized = path.resolve(repositoryRootPath);
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}
