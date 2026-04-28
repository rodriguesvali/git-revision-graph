import { API, Branch, Change, FetchOptions, Ref, RefQuery, RefType, Remote, Repository, RepositoryState, Status } from '../src/git';

type Listener<T> = (event: T) => void;

export function createEventEmitter<T>(): {
  readonly event: (listener: Listener<T>) => { dispose(): void };
  readonly fire: (value: T) => void;
} {
  const listeners = new Set<Listener<T>>();

  return {
    event(listener) {
      listeners.add(listener);
      return {
        dispose() {
          listeners.delete(listener);
        }
      };
    },
    fire(value) {
      for (const listener of listeners) {
        listener(value);
      }
    }
  };
}

export function createRef(overrides: Partial<Ref> & Pick<Ref, 'type'>): Ref {
  return {
    name: overrides.name,
    commit: overrides.commit,
    remote: overrides.remote,
    type: overrides.type
  };
}

export function createBranch(overrides: Partial<Branch> & Pick<Branch, 'name' | 'type'>): Branch {
  return {
    ...createRef(overrides),
    ahead: overrides.ahead,
    behind: overrides.behind,
    upstream: overrides.upstream
  };
}

export function createChange(overrides: Partial<Change> & { readonly uriPath: string; readonly originalPath?: string; readonly renamePath?: string; readonly status?: Status }): Change {
  return {
    uri: createUri(overrides.uriPath),
    originalUri: createUri(overrides.originalPath ?? overrides.uriPath),
    renameUri: overrides.renamePath ? createUri(overrides.renamePath) : undefined,
    status: overrides.status ?? Status.MODIFIED
  };
}

export function createRepository(options: {
  readonly root: string;
  readonly refs?: Ref[];
  readonly remotes?: Remote[];
  readonly head?: Branch;
  readonly diffBetween?: Change[];
  readonly diffWith?: Change[];
  readonly mergeChanges?: Change[];
  readonly indexChanges?: Change[];
  readonly workingTreeChanges?: Change[];
  readonly untrackedChanges?: Change[];
}): Repository & {
  readonly state: RepositoryState;
  readonly calls: {
    readonly checkout: string[];
    readonly createBranch: Array<{ readonly name: string; readonly checkout: boolean; readonly ref?: string }>;
    readonly deleteBranch: Array<{ readonly name: string; readonly force?: boolean }>;
    readonly deleteTag: string[];
    readonly setBranchUpstream: Array<{ readonly name: string; readonly upstream: string }>;
    readonly merge: string[];
    readonly fetch: Array<FetchOptions | undefined>;
    readonly pull: boolean[];
    readonly push: Array<{ readonly remoteName?: string; readonly branchName?: string; readonly setUpstream?: boolean }>;
  };
} {
  const stateChanges = createEventEmitter<void>();
  const checkoutChanges = createEventEmitter<void>();
  const refs = options.refs ?? [];
  const remotes = options.remotes ?? [];
  const diffBetween = options.diffBetween ?? [];
  const diffWith = options.diffWith ?? [];
  const mergeChanges = options.mergeChanges ?? [];
  const indexChanges = options.indexChanges ?? [];
  const workingTreeChanges = options.workingTreeChanges ?? [];
  const untrackedChanges = options.untrackedChanges ?? [];
  const calls = {
    checkout: [] as string[],
    createBranch: [] as Array<{ readonly name: string; readonly checkout: boolean; readonly ref?: string }>,
    deleteBranch: [] as Array<{ readonly name: string; readonly force?: boolean }>,
    deleteTag: [] as string[],
    setBranchUpstream: [] as Array<{ readonly name: string; readonly upstream: string }>,
    merge: [] as string[],
    fetch: [] as Array<FetchOptions | undefined>,
    pull: [] as boolean[],
    push: [] as Array<{ readonly remoteName?: string; readonly branchName?: string; readonly setUpstream?: boolean }>
  };

  return {
    rootUri: createUri(options.root),
    state: {
      HEAD: options.head,
      refs,
      remotes,
      mergeChanges,
      indexChanges,
      workingTreeChanges,
      untrackedChanges,
      onDidChange: stateChanges.event
    },
    onDidCheckout: checkoutChanges.event,
    async getRefs(_query?: RefQuery): Promise<Ref[]> {
      return refs;
    },
    async show(_ref: string, _path: string): Promise<string> {
      return '';
    },
    async diffBetween(_ref1: string, _ref2: string): Promise<Change[]> {
      return diffBetween;
    },
    async diffWith(_ref: string): Promise<Change[]> {
      return diffWith;
    },
    async checkout(treeish: string): Promise<void> {
      calls.checkout.push(treeish);
    },
    async createBranch(name: string, checkout: boolean, ref?: string): Promise<void> {
      calls.createBranch.push({ name, checkout, ref });
    },
    async deleteBranch(name: string, force?: boolean): Promise<void> {
      calls.deleteBranch.push({ name, force });
    },
    async getBranch(name: string): Promise<Branch> {
      if (options.head?.name === name) {
        return options.head;
      }

      const branch = refs.find((ref) => ref.name === name);
      if (branch) {
        return branch as Branch;
      }

      throw new Error(`Branch ${name} not found.`);
    },
    async deleteTag(name: string): Promise<void> {
      calls.deleteTag.push(name);
    },
    async setBranchUpstream(name: string, upstream: string): Promise<void> {
      calls.setBranchUpstream.push({ name, upstream });
    },
    async merge(ref: string): Promise<void> {
      calls.merge.push(ref);
    },
    async fetch(options?: FetchOptions): Promise<void> {
      calls.fetch.push(options);
    },
    async pull(): Promise<void> {
      calls.pull.push(true);
    },
    async push(remoteName?: string, branchName?: string, setUpstream?: boolean): Promise<void> {
      calls.push.push({ remoteName, branchName, setUpstream });
    },
    calls
  };
}

export function createApi(repositories: Repository[]): API {
  const openEmitter = createEventEmitter<Repository>();
  const closeEmitter = createEventEmitter<Repository>();

  return {
    repositories: [...repositories],
    onDidOpenRepository: openEmitter.event,
    onDidCloseRepository: closeEmitter.event
  };
}

export function createUri(fsPath: string): Repository['rootUri'] {
  return {
    scheme: 'file',
    authority: '',
    path: fsPath,
    query: '',
    fragment: '',
    fsPath,
    with() {
      return this;
    },
    toJSON() {
      return { fsPath };
    },
    toString() {
      return fsPath;
    }
  } as unknown as Repository['rootUri'];
}

export function createHead(name: string, ahead?: number, behind?: number, upstream?: Branch['upstream']): Branch {
  return createBranch({
    type: RefType.Head,
    name,
    ahead,
    behind,
    upstream
  });
}
