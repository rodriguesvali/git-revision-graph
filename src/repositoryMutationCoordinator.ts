import * as path from 'node:path';

import { createAbortError } from './errors';
import type { Repository } from './git';
import type { RefActionServices } from './refActions';

export interface RepositoryMutationLease {
  readonly repositoryPath: string;
  isCurrent(): boolean;
  assertCurrent(): void;
}

export type RepositoryMutationOutcome<T> =
  | { readonly status: 'completed'; readonly value: T }
  | { readonly status: 'rejected' };

export interface RepositoryMutationRunner {
  runRepositoryMutation<T>(
    repository: Repository,
    action: (repository: Repository, services: RefActionServices) => Promise<T> | T
  ): Promise<T | undefined>;
}

export class RepositoryMutationCoordinator {
  private readonly activeTokens = new Map<string, symbol>();
  private readonly generations = new Map<string, number>();
  private disposed = false;

  async run<T>(
    repositoryPath: string,
    action: (lease: RepositoryMutationLease) => Promise<T> | T
  ): Promise<RepositoryMutationOutcome<T>> {
    const key = normalizeRepositoryMutationKey(repositoryPath);
    if (this.disposed || this.activeTokens.has(key)) {
      return { status: 'rejected' };
    }

    const token = Symbol(key);
    const generation = this.generations.get(key) ?? 0;
    this.activeTokens.set(key, token);
    const lease: RepositoryMutationLease = {
      repositoryPath,
      isCurrent: () => (
        !this.disposed
        && (this.generations.get(key) ?? 0) === generation
        && this.activeTokens.get(key) === token
      ),
      assertCurrent() {
        if (!this.isCurrent()) {
          throw createAbortError('The repository operation is no longer current.');
        }
      }
    };

    try {
      lease.assertCurrent();
      return { status: 'completed', value: await action(lease) };
    } finally {
      if (this.activeTokens.get(key) === token) {
        this.activeTokens.delete(key);
      }
    }
  }

  invalidate(repositoryPath: string): void {
    const key = normalizeRepositoryMutationKey(repositoryPath);
    this.generations.set(key, (this.generations.get(key) ?? 0) + 1);
  }

  dispose(): void {
    this.disposed = true;
    this.activeTokens.clear();
    this.generations.clear();
  }
}

export function createMutationGuardedRepository(
  repository: Repository,
  lease: RepositoryMutationLease
): Repository {
  return createGuardedObject(repository, lease);
}

export function createMutationGuardedRefActionServices(
  services: RefActionServices,
  lease: RepositoryMutationLease
): RefActionServices {
  return {
    ...services,
    ui: createGuardedObject(services.ui, lease),
    refreshController: createGuardedObject(services.refreshController, lease),
    referenceManager: createGuardedObject(services.referenceManager, lease),
    ancestryInspector: createGuardedObject(services.ancestryInspector, lease)
  };
}

export async function runGuardedRepositoryMutation<T>(
  coordinator: RepositoryMutationCoordinator,
  repository: Repository,
  services: RefActionServices,
  action: (repository: Repository, services: RefActionServices) => Promise<T> | T
): Promise<RepositoryMutationOutcome<T>> {
  return coordinator.run(repository.rootUri.fsPath, (lease) =>
    action(
      createMutationGuardedRepository(repository, lease),
      createMutationGuardedRefActionServices(services, lease)
    )
  );
}

function createGuardedObject<T extends object>(target: T, lease: RepositoryMutationLease): T {
  return new Proxy(target, {
    get(object, property, receiver) {
      const value = Reflect.get(object, property, receiver);
      if (typeof value !== 'function') {
        return value;
      }

      return (...args: unknown[]) => {
        lease.assertCurrent();
        const result: unknown = Reflect.apply(value, object, args);
        if (isPromiseLike(result)) {
          return Promise.resolve(result).then((resolved) => {
            lease.assertCurrent();
            return resolved;
          });
        }

        lease.assertCurrent();
        return result;
      };
    }
  });
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return !!value
    && (typeof value === 'object' || typeof value === 'function')
    && typeof (value as { readonly then?: unknown }).then === 'function';
}

function normalizeRepositoryMutationKey(repositoryPath: string): string {
  const normalized = path.normalize(path.resolve(repositoryPath));
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}
