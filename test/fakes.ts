import { API, Branch, Change, Ref, RefQuery, RefType, Repository, RepositoryState, Status } from '../src/git';

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
  readonly head?: Branch;
  readonly diffBetween?: Change[];
  readonly diffWith?: Change[];
}): Repository & {
  readonly state: RepositoryState;
  readonly calls: {
    readonly checkout: string[];
    readonly createBranch: Array<{ readonly name: string; readonly checkout: boolean; readonly ref?: string }>;
    readonly setBranchUpstream: Array<{ readonly name: string; readonly upstream: string }>;
    readonly merge: string[];
  };
} {
  const stateChanges = createEventEmitter<void>();
  const checkoutChanges = createEventEmitter<void>();
  const refs = options.refs ?? [];
  const diffBetween = options.diffBetween ?? [];
  const diffWith = options.diffWith ?? [];
  const calls = {
    checkout: [] as string[],
    createBranch: [] as Array<{ readonly name: string; readonly checkout: boolean; readonly ref?: string }>,
    setBranchUpstream: [] as Array<{ readonly name: string; readonly upstream: string }>,
    merge: [] as string[]
  };

  return {
    rootUri: createUri(options.root),
    state: {
      HEAD: options.head,
      refs,
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
    async setBranchUpstream(name: string, upstream: string): Promise<void> {
      calls.setBranchUpstream.push({ name, upstream });
    },
    async merge(ref: string): Promise<void> {
      calls.merge.push(ref);
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

export function createHead(name: string, ahead?: number, behind?: number): Branch {
  return createBranch({
    type: RefType.Head,
    name,
    ahead,
    behind
  });
}
