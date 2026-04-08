import * as vscode from 'vscode';

import { toErrorDetail } from './errorDetail';
import { Repository, API } from './git';
import { isSameRepositoryPath, reconcileCurrentRepository } from './repositorySelection';
import {
  createBranchFromResolvedReference,
  checkoutResolvedReference,
  compareResolvedRefs,
  compareResolvedRefWithWorktree,
  deleteResolvedReference,
  mergeResolvedReference,
  syncCurrentHeadWithUpstream
} from './refActions';
import {
  buildRevisionGraphScene,
  filterRevisionGraphCommitsToAncestors,
  RevisionGraphRef
} from './revisionGraphData';
import {
  isRefAncestorOfHead,
  loadRevisionGraphCommits,
  openUnifiedDiff,
  pickRevisionGraphRepository,
  showRevisionLog
} from './revisionGraphRepository';
import {
  renderEmptyHtml,
  renderErrorHtml,
  renderRevisionGraphHtml
} from './revisionGraphWebview';
import { REVISION_GRAPH_VIEW_ID, RevisionGraphAncestorFilter, RevisionGraphMessage } from './revisionGraphTypes';
import { createWorkbenchRefActionServices } from './workbenchRefActionServices';

const GRAPH_COMMIT_LIMIT = 600;

export class RevisionGraphViewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  private view: vscode.WebviewView | undefined;
  private currentRepository: Repository | undefined;
  private ancestorFilter: RevisionGraphAncestorFilter | undefined;
  private autoArrangeOnNextRender = true;
  private readonly repoSubscriptions = new Map<string, vscode.Disposable>();
  private readonly disposables: vscode.Disposable[] = [];
  private readonly actionServices = createWorkbenchRefActionServices();

  constructor(
    private readonly git: API
  ) {
    this.setCurrentRepository(reconcileCurrentRepository(git.repositories, undefined));
    this.attachToRepositories(git.repositories);

    this.disposables.push(
      git.onDidOpenRepository((repository) => {
        this.attachRepository(repository);
        this.handleRepositorySetChanged();
      }),
      git.onDidCloseRepository((repository) => {
        this.detachRepository(repository);
        this.handleRepositorySetChanged();
      })
    );
  }

  dispose(): void {
    for (const disposable of this.repoSubscriptions.values()) {
      disposable.dispose();
    }

    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  async resolveWebviewView(view: vscode.WebviewView): Promise<void> {
    this.view = view;
    view.webview.options = {
      enableScripts: true
    };

    view.onDidDispose(() => {
      if (this.view === view) {
        this.view = undefined;
      }
    });

    this.setCurrentRepository(reconcileCurrentRepository(this.git.repositories, this.currentRepository));

    if (!this.currentRepository) {
      this.setCurrentRepository(await pickRevisionGraphRepository(this.git, false));
    }

    view.webview.onDidReceiveMessage(async (message: RevisionGraphMessage) => {
      switch (message.type) {
        case 'refresh':
          await this.render();
          return;
        case 'choose-repository':
          this.setCurrentRepository(await pickRevisionGraphRepository(this.git, true));
          await this.render();
          return;
        case 'filter-ancestor-refs':
          this.ancestorFilter = {
            refName: message.refName,
            refKind: message.refKind
          };
          this.autoArrangeOnNextRender = true;
          await this.render();
          return;
        case 'clear-ancestor-filter':
          this.ancestorFilter = undefined;
          await this.render();
          return;
        case 'compare-selected':
          if (this.currentRepository) {
            await compareResolvedRefs(
              this.currentRepository,
              { refName: message.baseRefName, label: message.baseRefName },
              { refName: message.compareRefName, label: message.compareRefName },
              this.actionServices
            );
          }
          return;
        case 'show-log':
          if (this.currentRepository) {
            await showRevisionLog(this.currentRepository, message.baseRefName, message.compareRefName, GRAPH_COMMIT_LIMIT);
          }
          return;
        case 'open-unified-diff':
          if (this.currentRepository) {
            await openUnifiedDiff(this.currentRepository, message.baseRefName, message.compareRefName);
          }
          return;
        case 'compare-with-worktree':
          if (this.currentRepository) {
            await compareResolvedRefWithWorktree(
              this.currentRepository,
              { refName: message.refName, label: message.refName },
              this.actionServices
            );
          }
          return;
        case 'checkout':
          if (this.currentRepository) {
            await checkoutResolvedReference(
              this.currentRepository,
              { refName: message.refName, label: message.refName, kind: message.refKind as RevisionGraphRef['kind'] },
              this.actionServices
            );
            await this.render();
          }
          return;
        case 'create-branch':
          if (this.currentRepository) {
            await createBranchFromResolvedReference(
              this.currentRepository,
              { refName: message.refName, label: message.refName, kind: message.refKind },
              this.actionServices
            );
            await this.render();
          }
          return;
        case 'sync-current-head':
          if (this.currentRepository) {
            await syncCurrentHeadWithUpstream(
              this.currentRepository,
              this.actionServices
            );
            await this.render();
          }
          return;
        case 'delete':
          if (this.currentRepository) {
            await deleteResolvedReference(
              this.currentRepository,
              { refName: message.refName, label: message.refName, kind: message.refKind },
              this.actionServices
            );
            if (this.ancestorFilter?.refName === message.refName && this.ancestorFilter.refKind === message.refKind) {
              this.ancestorFilter = undefined;
            }
            await this.render();
          }
          return;
        case 'merge':
          if (this.currentRepository) {
            await mergeResolvedReference(
              this.currentRepository,
              { refName: message.refName, label: message.refName },
              this.actionServices
            );
            await this.render();
          }
          return;
      }
    });

    await this.render();
  }

  async open(): Promise<void> {
    await vscode.commands.executeCommand(`${REVISION_GRAPH_VIEW_ID}.focus`);
    this.setCurrentRepository(reconcileCurrentRepository(this.git.repositories, this.currentRepository));
    if (!this.currentRepository) {
      this.setCurrentRepository(await pickRevisionGraphRepository(this.git, false));
    }
    await this.render();
  }

  async chooseRepository(): Promise<void> {
    this.setCurrentRepository(await pickRevisionGraphRepository(this.git, true));
    await this.open();
  }

  async refresh(): Promise<void> {
    await this.render();
  }

  private async render(): Promise<void> {
    if (!this.view) {
      return;
    }

    if (!this.currentRepository) {
      this.view.webview.html = renderEmptyHtml(this.git.repositories.length > 0);
      return;
    }

    try {
      const commits = await loadRevisionGraphCommits(this.currentRepository, GRAPH_COMMIT_LIMIT);
      const visibleCommits = this.ancestorFilter
        ? filterRevisionGraphCommitsToAncestors(commits, this.ancestorFilter.refName, this.ancestorFilter.refKind)
        : commits;
      const scene = buildRevisionGraphScene(visibleCommits.length > 0 ? visibleCommits : commits);
      const mergeBlockedTargets = await getMergeBlockedTargets(
        this.currentRepository,
        this.currentRepository.state.HEAD?.name,
        scene
      );
      this.view.webview.html = renderRevisionGraphHtml(
        vscode.workspace.asRelativePath(this.currentRepository.rootUri, false),
        scene,
        this.currentRepository.state.HEAD?.name,
        this.currentRepository.state.HEAD?.upstream
          ? formatUpstreamLabel(this.currentRepository.state.HEAD.upstream.remote, this.currentRepository.state.HEAD.upstream.name)
          : undefined,
        this.ancestorFilter,
        mergeBlockedTargets,
        this.autoArrangeOnNextRender
      );
      this.autoArrangeOnNextRender = false;
    } catch (error) {
      this.view.webview.html = renderErrorHtml(toErrorDetail(error));
    }
  }

  private attachToRepositories(repositories: readonly Repository[]): void {
    for (const repository of repositories) {
      this.attachRepository(repository);
    }
  }

  private attachRepository(repository: Repository): void {
    const key = repository.rootUri.toString();
    if (this.repoSubscriptions.has(key)) {
      return;
    }

    this.repoSubscriptions.set(
      key,
      vscode.Disposable.from(
        repository.state.onDidChange(() => this.handleRepositoryStateChange(repository)),
        repository.onDidCheckout(() => this.handleRepositoryStateChange(repository))
      )
    );
  }

  private detachRepository(repository: Repository): void {
    const key = repository.rootUri.toString();
    this.repoSubscriptions.get(key)?.dispose();
    this.repoSubscriptions.delete(key);
  }

  private handleRepositorySetChanged(): void {
    this.setCurrentRepository(reconcileCurrentRepository(this.git.repositories, this.currentRepository));
    void this.render();
  }

  private handleRepositoryStateChange(repository: Repository): void {
    const previousRepository = this.currentRepository;
    this.setCurrentRepository(reconcileCurrentRepository(this.git.repositories, this.currentRepository));

    if (isSameRepositoryPath(repository, this.currentRepository) || (!previousRepository && this.currentRepository)) {
      void this.render();
    }
  }

  private setCurrentRepository(repository: Repository | undefined): void {
    if (!isSameRepositoryPath(this.currentRepository, repository)) {
      this.ancestorFilter = undefined;
      this.autoArrangeOnNextRender = true;
    }

    this.currentRepository = repository;
  }
}

export { REVISION_GRAPH_VIEW_ID };

async function getMergeBlockedTargets(
  repository: Repository,
  currentHeadName: string | undefined,
  scene: ReturnType<typeof buildRevisionGraphScene>
): Promise<string[]> {
  if (!currentHeadName) {
    return [];
  }

  const refs = scene.nodes.flatMap((node) => node.refs);
  const uniqueRefs = [
    ...new Map(
      refs.map((ref) => [`${ref.kind}::${ref.name}`, ref] as const)
    ).values()
  ];

  const mergeBlockedEntries = await Promise.all(
    uniqueRefs.map(async (ref) => {
      if (ref.kind === 'head' || ref.name === currentHeadName) {
        return undefined;
      }

      try {
        const isAncestor = await isRefAncestorOfHead(repository, ref.name, currentHeadName);
        return isAncestor ? `${ref.kind}::${ref.name}` : undefined;
      } catch {
        return undefined;
      }
    })
  );

  return mergeBlockedEntries.filter((entry): entry is string => typeof entry === 'string');
}

function formatUpstreamLabel(remoteName: string, refName: string): string {
  return refName.startsWith(`${remoteName}/`) ? refName : `${remoteName}/${refName}`;
}
