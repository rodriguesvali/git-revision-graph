import { Repository } from '../git';
import {
  deleteRemoteTagResolvedReference,
  pushTagResolvedReference,
  RefActionKind,
  RefActionServices
} from '../refActions';
import { getRepositoryRemoteNames } from '../refActions/shared';
import { RemoteTagPublicationState } from '../revisionGraphTypes';
import {
  RemoteTagPublicationRequestContext,
  resolveRemoteTagPublicationState
} from './remoteTagState';
import type { RepositoryMutationRunner } from '../repositoryMutationCoordinator';

export interface RevisionGraphRemoteTagWorkflowHost extends Partial<RepositoryMutationRunner> {
  readonly actionServices: RefActionServices;
  getCurrentRepository(): Repository | undefined;
  createRemoteTagPublicationRequestContext(repository: Repository): RemoteTagPublicationRequestContext;
  postRemoteTagStateIfCurrent(
    requestContext: RemoteTagPublicationRequestContext,
    tagName: string,
    state: RemoteTagPublicationState
  ): void;
}

export interface RevisionGraphRemoteTagWorkflowDependencies {
  getRepositoryRemoteNames?(repository: Repository): readonly string[] | Promise<readonly string[]>;
  resolveRemoteTagPublicationState?(options: {
    readonly repositoryPath: string;
    readonly remoteNames: readonly string[];
    readonly tagName: string;
  }): Promise<RemoteTagPublicationState>;
  pushTagResolvedReference?(
    repository: Repository,
    target: { readonly refName: string; readonly label: string; readonly kind: RefActionKind },
    services: RefActionServices
  ): Promise<boolean>;
  deleteRemoteTagResolvedReference?(
    repository: Repository,
    target: { readonly refName: string; readonly label: string; readonly kind: RefActionKind },
    services: RefActionServices
  ): Promise<boolean>;
}

export class RevisionGraphRemoteTagWorkflow {
  private readonly getRepositoryRemoteNames: NonNullable<
    RevisionGraphRemoteTagWorkflowDependencies['getRepositoryRemoteNames']
  >;
  private readonly resolveRemoteTagPublicationState: NonNullable<
    RevisionGraphRemoteTagWorkflowDependencies['resolveRemoteTagPublicationState']
  >;
  private readonly pushTagResolvedReference: NonNullable<
    RevisionGraphRemoteTagWorkflowDependencies['pushTagResolvedReference']
  >;
  private readonly deleteRemoteTagResolvedReference: NonNullable<
    RevisionGraphRemoteTagWorkflowDependencies['deleteRemoteTagResolvedReference']
  >;

  constructor(
    private readonly host: RevisionGraphRemoteTagWorkflowHost,
    dependencies: RevisionGraphRemoteTagWorkflowDependencies = {}
  ) {
    this.getRepositoryRemoteNames = dependencies.getRepositoryRemoteNames ?? getRepositoryRemoteNames;
    this.resolveRemoteTagPublicationState =
      dependencies.resolveRemoteTagPublicationState ?? resolveRemoteTagPublicationState;
    this.pushTagResolvedReference = dependencies.pushTagResolvedReference ?? pushTagResolvedReference;
    this.deleteRemoteTagResolvedReference =
      dependencies.deleteRemoteTagResolvedReference ?? deleteRemoteTagResolvedReference;
  }

  async resolveRemoteTagState(refName: string): Promise<void> {
    const repository = this.host.getCurrentRepository();
    if (!repository) {
      return;
    }

    const requestContext = this.host.createRemoteTagPublicationRequestContext(repository);
    const state = await this.resolveTagPublicationStateForRepository(repository, refName);
    this.host.postRemoteTagStateIfCurrent(requestContext, refName, state);
  }

  async pushTag(
    refName: string,
    label: string,
    refKind: RefActionKind
  ): Promise<void> {
    const repository = this.host.getCurrentRepository();
    if (!repository) {
      return;
    }

    const requestContext = this.host.createRemoteTagPublicationRequestContext(repository);
    const pushed = this.host.runRepositoryMutation
      ? await this.host.runRepositoryMutation(repository, (guardedRepository, services) =>
        this.pushTagResolvedReference(
          guardedRepository,
          { refName, label, kind: refKind },
          services
        ))
      : await this.pushTagResolvedReference(
        repository,
        { refName, label, kind: refKind },
        this.host.actionServices
      );
    if (pushed) {
      this.host.postRemoteTagStateIfCurrent(requestContext, refName, 'published');
    }
  }

  async deleteRemoteTag(
    refName: string,
    label: string,
    refKind: RefActionKind
  ): Promise<void> {
    const repository = this.host.getCurrentRepository();
    if (!repository) {
      return;
    }

    const requestContext = this.host.createRemoteTagPublicationRequestContext(repository);
    const deleted = this.host.runRepositoryMutation
      ? await this.host.runRepositoryMutation(repository, (guardedRepository, services) =>
        this.deleteRemoteTagResolvedReference(
          guardedRepository,
          { refName, label, kind: refKind },
          services
        ))
      : await this.deleteRemoteTagResolvedReference(
        repository,
        { refName, label, kind: refKind },
        this.host.actionServices
      );
    if (deleted) {
      this.host.postRemoteTagStateIfCurrent(requestContext, refName, 'unpublished');
    }
  }

  private async resolveTagPublicationStateForRepository(
    repository: Repository,
    tagName: string
  ): Promise<RemoteTagPublicationState> {
    try {
      const remoteNames = await this.getRepositoryRemoteNames(repository);
      return this.resolveRemoteTagPublicationState({
        repositoryPath: repository.rootUri.fsPath,
        remoteNames,
        tagName
      });
    } catch {
      return 'unknown';
    }
  }
}
