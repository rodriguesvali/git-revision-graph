import * as path from 'node:path';
import * as vscode from 'vscode';

import {
  API,
  Branch,
  Change,
  GitExtension,
  Ref,
  RefType,
  Repository,
  Status
} from './git';

const EMPTY_SCHEME = 'git-ext-empty';
const REF_SCHEME = 'git-ext-ref';

type RefNode = RepositoryNode | CategoryNode | RemoteNode | ReferenceNode;
type RefCategory = 'branches' | 'tags' | 'remotes';

interface RepositoryNode {
  readonly kind: 'repository';
  readonly repository: Repository;
}

interface CategoryNode {
  readonly kind: 'category';
  readonly repository: Repository;
  readonly category: RefCategory;
}

interface RemoteNode {
  readonly kind: 'remote';
  readonly repository: Repository;
  readonly remote: string;
}

interface ReferenceNode {
  readonly kind: 'ref';
  readonly repository: Repository;
  readonly ref: Ref;
}

interface RefQuickPickItem extends vscode.QuickPickItem {
  readonly repository: Repository;
  readonly ref: Ref;
  readonly refName: string;
}

interface ChangeQuickPickItem extends vscode.QuickPickItem {
  readonly change: Change;
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const git = await getGitApi();
  if (!git) {
    void vscode.window.showWarningMessage(
      'Git Refs Explorer precisa da extensao nativa vscode.git ativa para funcionar.'
    );
    return;
  }

  const provider = new GitRefsTreeDataProvider(git);
  const treeView = vscode.window.createTreeView('gitRefs.refsView', {
    treeDataProvider: provider,
    showCollapseAll: true
  });

  const refContentProvider = new RefContentProvider(git);

  context.subscriptions.push(
    treeView,
    provider,
    vscode.workspace.registerTextDocumentContentProvider(EMPTY_SCHEME, new EmptyContentProvider()),
    vscode.workspace.registerTextDocumentContentProvider(REF_SCHEME, refContentProvider),
    vscode.commands.registerCommand('gitRefs.refresh', () => {
      provider.refresh();
      updateViewMessage(treeView, git);
    }),
    vscode.commands.registerCommand('gitRefs.compareRefs', async (node?: RefNode) => {
      await compareRefs(git, node);
    }),
    vscode.commands.registerCommand('gitRefs.compareWithWorktree', async (node?: RefNode) => {
      await compareWithWorktree(git, node);
    }),
    vscode.commands.registerCommand('gitRefs.checkout', async (node?: RefNode) => {
      await checkoutReference(git, node, provider, treeView);
    }),
    vscode.commands.registerCommand('gitRefs.merge', async (node?: RefNode) => {
      await mergeReference(git, node, provider);
    })
  );

  updateViewMessage(treeView, git);
}

export function deactivate(): void {}

class GitRefsTreeDataProvider implements vscode.TreeDataProvider<RefNode>, vscode.Disposable {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<RefNode | undefined>();
  private readonly repoSubscriptions = new Map<string, vscode.Disposable>();
  private readonly disposables: vscode.Disposable[] = [];

  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  constructor(private readonly git: API) {
    this.attachToRepositories(git.repositories);

    this.disposables.push(
      git.onDidOpenRepository((repository) => {
        this.attachRepository(repository);
        this.refresh();
      }),
      git.onDidCloseRepository((repository) => {
        this.detachRepository(repository);
        this.refresh();
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

    this.onDidChangeTreeDataEmitter.dispose();
  }

  refresh(node?: RefNode): void {
    this.onDidChangeTreeDataEmitter.fire(node);
  }

  getTreeItem(node: RefNode): vscode.TreeItem {
    switch (node.kind) {
      case 'repository': {
        const item = new vscode.TreeItem(
          vscode.workspace.asRelativePath(node.repository.rootUri, false),
          vscode.TreeItemCollapsibleState.Expanded
        );
        item.contextValue = 'git-repository';
        item.iconPath = new vscode.ThemeIcon('repo');
        item.tooltip = node.repository.rootUri.fsPath;
        return item;
      }
      case 'category': {
        const label = node.category === 'branches' ? 'Branches' : node.category === 'tags' ? 'Tags' : 'Remotes';
        const icon = node.category === 'branches' ? 'git-branch' : node.category === 'tags' ? 'tag' : 'cloud';
        const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Expanded);
        item.contextValue = `git-category-${node.category}`;
        item.iconPath = new vscode.ThemeIcon(icon);
        return item;
      }
      case 'remote': {
        const item = new vscode.TreeItem(node.remote, vscode.TreeItemCollapsibleState.Collapsed);
        item.contextValue = 'git-remote-group';
        item.iconPath = new vscode.ThemeIcon('cloud');
        return item;
      }
      case 'ref': {
        const item = new vscode.TreeItem(
          getReferenceShortLabel(node.ref),
          vscode.TreeItemCollapsibleState.None
        );
        item.contextValue = 'git-ref';
        item.description = getReferenceDescription(node.repository, node.ref);
        item.tooltip = getReferenceTooltip(node.repository, node.ref);
        item.iconPath = new vscode.ThemeIcon(getReferenceIcon(node.ref));
        item.command = {
          command: 'gitRefs.compareWithWorktree',
          title: 'Compare With Worktree',
          arguments: [node]
        };
        return item;
      }
    }
  }

  async getChildren(node?: RefNode): Promise<RefNode[]> {
    const repositories = [...this.git.repositories].sort((left, right) =>
      left.rootUri.fsPath.localeCompare(right.rootUri.fsPath)
    );

    if (!node) {
      if (repositories.length <= 1) {
        return repositories.length === 0 ? [] : this.getRepositoryChildren(repositories[0]);
      }

      return repositories.map<RepositoryNode>((repository) => ({
        kind: 'repository',
        repository
      }));
    }

    if (node.kind === 'repository') {
      return this.getRepositoryChildren(node.repository);
    }

    if (node.kind === 'category') {
      return this.getCategoryChildren(node.repository, node.category);
    }

    if (node.kind === 'remote') {
      const refs = await node.repository.getRefs({ sort: 'alphabetically' });
      return refs
        .filter((ref) => ref.type === RefType.RemoteHead && ref.remote === node.remote)
        .sort(compareRefsByName)
        .map<ReferenceNode>((ref) => ({
          kind: 'ref',
          repository: node.repository,
          ref
        }));
    }

    return [];
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
        repository.state.onDidChange(() => this.refresh()),
        repository.onDidCheckout(() => this.refresh())
      )
    );
  }

  private detachRepository(repository: Repository): void {
    const key = repository.rootUri.toString();
    this.repoSubscriptions.get(key)?.dispose();
    this.repoSubscriptions.delete(key);
  }

  private getRepositoryChildren(repository: Repository): RefNode[] {
    return [
      { kind: 'category', repository, category: 'branches' },
      { kind: 'category', repository, category: 'tags' },
      { kind: 'category', repository, category: 'remotes' }
    ];
  }

  private async getCategoryChildren(repository: Repository, category: RefCategory): Promise<RefNode[]> {
    const refs = await repository.getRefs({ sort: 'alphabetically' });

    if (category === 'branches') {
      return refs
        .filter((ref) => ref.type === RefType.Head)
        .sort(compareRefsByName)
        .map<ReferenceNode>((ref) => ({
          kind: 'ref',
          repository,
          ref
        }));
    }

    if (category === 'tags') {
      return refs
        .filter((ref) => ref.type === RefType.Tag)
        .sort(compareRefsByName)
        .map<ReferenceNode>((ref) => ({
          kind: 'ref',
          repository,
          ref
        }));
    }

    const remotes = [
      ...new Set(
        refs
          .filter((ref) => ref.type === RefType.RemoteHead)
          .map((ref) => ref.remote)
          .filter((remote): remote is string => typeof remote === 'string' && remote.length > 0)
      )
    ].sort((left, right) => left.localeCompare(right));

    return remotes.map<RemoteNode>((remote) => ({
      kind: 'remote',
      repository,
      remote
    }));
  }
}

class EmptyContentProvider implements vscode.TextDocumentContentProvider {
  provideTextDocumentContent(): string {
    return '';
  }
}

class RefContentProvider implements vscode.TextDocumentContentProvider {
  constructor(private readonly git: API) {}

  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const params = new URLSearchParams(uri.query);
    const repositoryPath = params.get('repo');
    const ref = params.get('ref');
    const filePath = params.get('path');

    if (!repositoryPath || !ref || !filePath) {
      return '';
    }

    const repository = this.git.repositories.find((candidate) => candidate.rootUri.fsPath === repositoryPath);
    if (!repository) {
      return '';
    }

    const relativePath = path.relative(repository.rootUri.fsPath, filePath);
    if (!relativePath || relativePath.startsWith('..')) {
      return '';
    }

    try {
      return await repository.show(ref, relativePath);
    } catch {
      return '';
    }
  }
}

async function compareRefs(git: API, node?: RefNode): Promise<void> {
  const repository = await resolveRepository(git, node);
  if (!repository) {
    return;
  }

  const first = isReferenceNode(node)
    ? toQuickPickItem(repository, node.ref)
    : await pickReference(repository, 'Escolha a primeira referencia para comparar');
  if (!first) {
    return;
  }

  const second = await pickReference(
    repository,
    `Compare ${first.label} com...`,
    first.refName
  );
  if (!second) {
    return;
  }

  try {
    const changes = await repository.diffBetween(first.refName, second.refName);
    if (changes.length === 0) {
      void vscode.window.showInformationMessage(
        `Nenhuma diferenca encontrada entre ${first.label} e ${second.label}.`
      );
      return;
    }

    const pickedChange = await pickChange(
      changes,
      `Arquivos alterados entre ${first.label} e ${second.label}`
    );
    if (!pickedChange) {
      return;
    }

    await openChangeDiffBetweenRefs(repository, pickedChange.change, first.refName, second.refName);
  } catch (error) {
    await showError('Nao foi possivel comparar as referencias.', error);
  }
}

async function compareWithWorktree(git: API, node?: RefNode): Promise<void> {
  const repository = await resolveRepository(git, node);
  if (!repository) {
    return;
  }

  const selected = isReferenceNode(node)
    ? toQuickPickItem(repository, node.ref)
    : await pickReference(repository, 'Escolha a referencia para comparar com a worktree');
  if (!selected) {
    return;
  }

  try {
    const changes = await repository.diffWith(selected.refName);
    if (changes.length === 0) {
      void vscode.window.showInformationMessage(
        `A worktree ja esta alinhada com ${selected.label}.`
      );
      return;
    }

    const pickedChange = await pickChange(
      changes,
      `Arquivos alterados entre ${selected.label} e a worktree`
    );
    if (!pickedChange) {
      return;
    }

    await openChangeDiffWithWorktree(repository, pickedChange.change, selected.refName);
  } catch (error) {
    await showError('Nao foi possivel comparar a referencia com a worktree.', error);
  }
}

async function checkoutReference(
  git: API,
  node: RefNode | undefined,
  provider: GitRefsTreeDataProvider,
  treeView: vscode.TreeView<RefNode>
): Promise<void> {
  const repository = await resolveRepository(git, node);
  if (!repository) {
    return;
  }

  const selected = isReferenceNode(node)
    ? toQuickPickItem(repository, node.ref)
    : await pickReference(repository, 'Escolha a referencia para fazer checkout');
  if (!selected) {
    return;
  }

  try {
    if (selected.ref.type === RefType.Head && repository.state.HEAD?.name === selected.ref.name) {
      void vscode.window.showInformationMessage(`${selected.label} ja esta selecionada.`);
      return;
    }

    if (selected.ref.type === RefType.RemoteHead) {
      const suggestedName = getSuggestedLocalBranchName(selected.ref);
      const branchName = await vscode.window.showInputBox({
        prompt: `Criar branch local rastreando ${selected.label}`,
        value: suggestedName,
        validateInput: (value) => (value.trim().length === 0 ? 'Informe um nome de branch.' : undefined)
      });

      if (!branchName) {
        return;
      }

      await repository.createBranch(branchName, true, selected.refName);
      await repository.setBranchUpstream(branchName, selected.refName);
      void vscode.window.showInformationMessage(
        `Branch ${branchName} criada e selecionada a partir de ${selected.label}.`
      );
    } else {
      const confirmation = await vscode.window.showWarningMessage(
        `Fazer checkout de ${selected.label}?`,
        { modal: true },
        'Checkout'
      );

      if (confirmation !== 'Checkout') {
        return;
      }

      await repository.checkout(selected.refName);
      void vscode.window.showInformationMessage(`Checkout concluido para ${selected.label}.`);
    }

    provider.refresh();
    updateViewMessage(treeView, git);
  } catch (error) {
    await showError('Nao foi possivel fazer checkout da referencia.', error);
  }
}

async function mergeReference(
  git: API,
  node: RefNode | undefined,
  provider: GitRefsTreeDataProvider
): Promise<void> {
  const repository = await resolveRepository(git, node);
  if (!repository) {
    return;
  }

  const selected = isReferenceNode(node)
    ? toQuickPickItem(repository, node.ref)
    : await pickReference(repository, 'Escolha a referencia para fazer merge');
  if (!selected) {
    return;
  }

  const currentBranch = repository.state.HEAD?.name ?? 'HEAD atual';
  if (selected.ref.type === RefType.Head && selected.ref.name === repository.state.HEAD?.name) {
    void vscode.window.showInformationMessage('A branch atual nao pode ser merged nela mesma.');
    return;
  }

  const confirmation = await vscode.window.showWarningMessage(
    `Fazer merge de ${selected.label} em ${currentBranch}?`,
    { modal: true },
    'Merge'
  );

  if (confirmation !== 'Merge') {
    return;
  }

  try {
    await repository.merge(selected.refName);
    provider.refresh();
    void vscode.window.showInformationMessage(
      `Merge de ${selected.label} iniciado em ${currentBranch}.`
    );
  } catch (error) {
    await showError(
      'Merge nao concluido. Se houve conflitos, finalize pela experiencia de Source Control do VS Code.',
      error
    );
  }
}

async function getGitApi(): Promise<API | undefined> {
  const extension = vscode.extensions.getExtension<GitExtension>('vscode.git');
  if (!extension) {
    return undefined;
  }

  const gitExtension = extension.isActive ? extension.exports : await extension.activate();
  return gitExtension.getAPI(1);
}

async function resolveRepository(git: API, node?: RefNode): Promise<Repository | undefined> {
  if (node) {
    return node.repository;
  }

  if (git.repositories.length === 1) {
    return git.repositories[0];
  }

  if (git.repositories.length === 0) {
    void vscode.window.showInformationMessage('Nenhum repositorio Git aberto no workspace.');
    return undefined;
  }

  const picked = await vscode.window.showQuickPick(
    git.repositories
      .map((repository) => ({
        label: vscode.workspace.asRelativePath(repository.rootUri, false),
        description: repository.rootUri.fsPath,
        repository
      }))
      .sort((left, right) => left.label.localeCompare(right.label)),
    {
      placeHolder: 'Escolha o repositorio'
    }
  );

  return picked?.repository;
}

async function pickReference(
  repository: Repository,
  placeHolder: string,
  excludeRefName?: string
): Promise<RefQuickPickItem | undefined> {
  const refs = await repository.getRefs({ sort: 'alphabetically' });
  const items = refs
    .filter((ref) => {
      const refName = getReferenceHandle(ref);
      return refName.length > 0 && refName !== excludeRefName;
    })
    .sort(compareRefsByName)
    .map((ref) => toQuickPickItem(repository, ref));

  return vscode.window.showQuickPick(items, { placeHolder });
}

async function pickChange(
  changes: Change[],
  placeHolder: string
): Promise<ChangeQuickPickItem | undefined> {
  const items = changes
    .map<ChangeQuickPickItem>((change) => {
      const fileUri = getTargetUri(change);
      return {
        label: path.basename(fileUri.fsPath),
        description: vscode.workspace.asRelativePath(fileUri, false),
        detail: getStatusLabel(change.status),
        change
      };
    })
    .sort((left, right) => (left.description ?? '').localeCompare(right.description ?? ''));

  return vscode.window.showQuickPick(items, { placeHolder, matchOnDescription: true, matchOnDetail: true });
}

function toQuickPickItem(repository: Repository, ref: Ref): RefQuickPickItem {
  return {
    label: getReferenceShortLabel(ref),
    description: getReferenceDescription(repository, ref),
    detail: getReferenceHandle(ref),
    repository,
    ref,
    refName: getReferenceHandle(ref)
  };
}

function buildRefUri(repository: Repository, ref: string, fileUri: vscode.Uri): vscode.Uri {
  const query = new URLSearchParams({
    repo: repository.rootUri.fsPath,
    ref,
    path: fileUri.fsPath
  });

  return vscode.Uri.from({
    scheme: REF_SCHEME,
    path: fileUri.fsPath,
    query: query.toString()
  });
}

function buildEmptyUri(fileUri: vscode.Uri): vscode.Uri {
  return vscode.Uri.from({
    scheme: EMPTY_SCHEME,
    path: fileUri.fsPath
  });
}

async function openChangeDiffBetweenRefs(
  repository: Repository,
  change: Change,
  leftRef: string,
  rightRef: string
): Promise<void> {
  const leftPath = getLeftUri(change);
  const rightPath = getRightUri(change);
  const leftUri = isAddition(change.status) ? buildEmptyUri(rightPath) : buildRefUri(repository, leftRef, leftPath);
  const rightUri = isDeletion(change.status) ? buildEmptyUri(leftPath) : buildRefUri(repository, rightRef, rightPath);
  const title = `${leftRef} <-> ${rightRef} • ${vscode.workspace.asRelativePath(rightPath, false)}`;

  await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title);
}

async function openChangeDiffWithWorktree(
  repository: Repository,
  change: Change,
  ref: string
): Promise<void> {
  const leftPath = getLeftUri(change);
  const rightPath = getRightUri(change);
  const leftUri = isAddition(change.status) ? buildEmptyUri(rightPath) : buildRefUri(repository, ref, leftPath);
  const rightUri = isDeletion(change.status) ? buildEmptyUri(leftPath) : rightPath;
  const title = `${ref} <-> worktree • ${vscode.workspace.asRelativePath(rightPath, false)}`;

  await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title);
}

function getReferenceHandle(ref: Ref): string {
  if (ref.type === RefType.RemoteHead && ref.remote && ref.name) {
    return ref.name.startsWith(`${ref.remote}/`) ? ref.name : `${ref.remote}/${ref.name}`;
  }

  return ref.name ?? ref.commit ?? '';
}

function getReferenceShortLabel(ref: Ref): string {
  if (ref.type === RefType.RemoteHead && ref.remote && ref.name) {
    return ref.name.startsWith(`${ref.remote}/`)
      ? ref.name.slice(ref.remote.length + 1)
      : ref.name;
  }

  return ref.name ?? ref.commit ?? '<unknown>';
}

function getReferenceDescription(repository: Repository, ref: Ref): string | undefined {
  if (ref.type === RefType.Head && repository.state.HEAD?.name === ref.name) {
    const head = repository.state.HEAD as Branch;
    const counters = [
      typeof head.ahead === 'number' && head.ahead > 0 ? `+${head.ahead}` : undefined,
      typeof head.behind === 'number' && head.behind > 0 ? `-${head.behind}` : undefined
    ].filter(Boolean);

    return counters.length > 0 ? `current ${counters.join(' ')}` : 'current';
  }

  if (ref.type === RefType.RemoteHead && ref.remote) {
    return ref.remote;
  }

  return ref.commit ? ref.commit.slice(0, 8) : undefined;
}

function getReferenceTooltip(repository: Repository, ref: Ref): string {
  const parts = [getReferenceHandle(ref)];
  const description = getReferenceDescription(repository, ref);

  if (description) {
    parts.push(description);
  }

  if (ref.commit) {
    parts.push(ref.commit);
  }

  return parts.join('\n');
}

function getReferenceIcon(ref: Ref): string {
  switch (ref.type) {
    case RefType.Head:
      return 'git-branch';
    case RefType.RemoteHead:
      return 'cloud';
    case RefType.Tag:
      return 'tag';
  }

  return 'git-commit';
}

function getSuggestedLocalBranchName(ref: Ref): string {
  const label = getReferenceShortLabel(ref);
  return label.includes('/') ? label.split('/').at(-1) ?? label : label;
}

function getTargetUri(change: Change): vscode.Uri {
  return change.renameUri ?? change.uri;
}

function getLeftUri(change: Change): vscode.Uri {
  return change.originalUri;
}

function getRightUri(change: Change): vscode.Uri {
  return change.renameUri ?? change.uri;
}

function isAddition(status: Status): boolean {
  return status === Status.INDEX_ADDED || status === Status.UNTRACKED;
}

function isDeletion(status: Status): boolean {
  return status === Status.INDEX_DELETED || status === Status.DELETED;
}

function compareRefsByName(left: Ref, right: Ref): number {
  return getReferenceShortLabel(left).localeCompare(getReferenceShortLabel(right));
}

function getStatusLabel(status: Status): string {
  switch (status) {
    case Status.INDEX_ADDED:
    case Status.UNTRACKED:
      return 'Added';
    case Status.INDEX_DELETED:
    case Status.DELETED:
      return 'Deleted';
    case Status.INDEX_RENAMED:
    case Status.INTENT_TO_RENAME:
      return 'Renamed';
    case Status.BOTH_MODIFIED:
    case Status.MODIFIED:
    case Status.INDEX_MODIFIED:
      return 'Modified';
    default:
      return 'Changed';
  }
}

function isReferenceNode(node: RefNode | undefined): node is ReferenceNode {
  return node?.kind === 'ref';
}

function updateViewMessage(treeView: vscode.TreeView<RefNode>, git: API): void {
  treeView.message = git.repositories.length === 0
    ? 'Abra um workspace com um repositorio Git para visualizar as referencias.'
    : undefined;
}

async function showError(message: string, error: unknown): Promise<void> {
  const detail = error instanceof Error ? error.message : String(error);
  await vscode.window.showErrorMessage(`${message} ${detail}`);
}
