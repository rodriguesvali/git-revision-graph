type RevisionGraphWebviewContextMenuAction =
  | 'abort-merge'
  | 'checkout'
  | 'clear-selection'
  | 'compare-selected'
  | 'compare-with-worktree'
  | 'copy-hash'
  | 'copy-ref-name'
  | 'create-branch'
  | 'create-tag'
  | 'delete-ref'
  | 'delete-remote-tag'
  | 'focus-descendants'
  | 'focus-range'
  | 'merge'
  | 'publish-branch'
  | 'push-tag'
  | 'remote-tag-loading'
  | 'reset-to-commit'
  | 'retry-remote-tag-state'
  | 'show-log-range'
  | 'show-log-target'
  | 'stash-apply'
  | 'stash-drop'
  | 'stash-pop'
  | 'stash-save'
  | 'unified-diff';

interface RevisionGraphWebviewContextMenuItem {
  readonly section: string;
  readonly label: string;
  readonly action: RevisionGraphWebviewContextMenuAction;
  readonly primary?: boolean;
  readonly destructive?: boolean;
  readonly disabled?: boolean;
}

interface RevisionGraphWebviewContextMenuComparisonTargets {
  readonly base: RevisionGraphWebviewTarget;
  readonly compare: RevisionGraphWebviewTarget;
}

interface RevisionGraphWebviewContextMenuPlanInput {
  readonly target: RevisionGraphWebviewTarget;
  readonly comparisonTargets: RevisionGraphWebviewContextMenuComparisonTargets | null;
  readonly currentHeadName: string | null;
  readonly publishedLocalBranchNames: ReadonlySet<string>;
  readonly isWorkspaceDirty: boolean;
  readonly hasMergeConflicts: boolean;
  readonly hasConflictedMerge: boolean;
  readonly mergeBlockedTargets: ReadonlySet<string>;
  readonly remoteTagState?: string;
  readonly focusRangeActionLabel: string | null;
  readonly focusDescendantsActionLabel: string | null;
  readonly hasSelection: boolean;
}

interface RevisionGraphWebviewContextMenuPlan {
  readonly items: readonly RevisionGraphWebviewContextMenuItem[];
  readonly shouldRequestRemoteTagState: boolean;
}

interface RevisionGraphWebviewContextSubmenuPlacementInput {
  readonly anchorLeft: number;
  readonly anchorRight: number;
  readonly anchorTop: number;
  readonly submenuWidth: number;
  readonly submenuHeight: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly margin?: number;
  readonly overlap?: number;
}

interface RevisionGraphWebviewContextSubmenuPlacement {
  readonly left: number;
  readonly top: number;
}

interface RevisionGraphWebviewContextSubmenuCloseScheduler {
  schedule(group: HTMLElement, close: () => void): void;
  cancel(group?: HTMLElement | null): void;
}

function calculateRevisionGraphWebviewContextSubmenuPlacement(
  input: RevisionGraphWebviewContextSubmenuPlacementInput
): RevisionGraphWebviewContextSubmenuPlacement {
  const margin = input.margin ?? 8;
  const overlap = input.overlap ?? 1;
  let left = input.anchorRight - overlap;
  if (left + input.submenuWidth > input.viewportWidth - margin) {
    left = input.anchorLeft - input.submenuWidth + overlap;
  }
  let top = input.anchorTop - 6;
  if (top + input.submenuHeight > input.viewportHeight - margin) {
    top = input.viewportHeight - input.submenuHeight - margin;
  }
  if (top < margin) {
    top = margin;
  }
  return {
    left: Math.max(margin, left),
    top
  };
}

function createRevisionGraphWebviewContextSubmenuCloseScheduler(
  timer: Pick<Window, 'setTimeout' | 'clearTimeout'> = window,
  delayMs = 120
): RevisionGraphWebviewContextSubmenuCloseScheduler {
  let closeTimer = 0;
  let pendingGroup: HTMLElement | null = null;
  const cancel = (group: HTMLElement | null = null) => {
    if (group && pendingGroup !== group) {
      return;
    }
    if (closeTimer) {
      timer.clearTimeout(closeTimer);
      closeTimer = 0;
    }
    pendingGroup = null;
  };
  return {
    schedule(group, close) {
      cancel();
      pendingGroup = group;
      closeTimer = timer.setTimeout(() => {
        closeTimer = 0;
        pendingGroup = null;
        close();
      }, delayMs);
    },
    cancel
  };
}

function getRevisionGraphWebviewContextMenuComparisonTargets(
  selectedTargets: readonly RevisionGraphWebviewTarget[],
  target: RevisionGraphWebviewTarget
): RevisionGraphWebviewContextMenuComparisonTargets | null {
  if (selectedTargets.length !== 2) {
    return null;
  }
  const [base, compare] = selectedTargets;
  if (!base || !compare || !isRevisionGraphWebviewContextMenuSelectedTarget(base, compare, target)) {
    return null;
  }
  return { base, compare };
}

function createRevisionGraphWebviewContextMenuPlan(
  input: RevisionGraphWebviewContextMenuPlanInput
): RevisionGraphWebviewContextMenuPlan {
  if (input.comparisonTargets) {
    return {
      items: createRevisionGraphWebviewComparisonContextMenuItems(input),
      shouldRequestRemoteTagState: false
    };
  }
  return createRevisionGraphWebviewTargetContextMenuPlan(input);
}

function createRevisionGraphWebviewComparisonContextMenuItems(
  input: RevisionGraphWebviewContextMenuPlanInput
): RevisionGraphWebviewContextMenuItem[] {
  const items: RevisionGraphWebviewContextMenuItem[] = [];
  addRevisionGraphWebviewContextMenuItem(items, 'Compare', 'Compare', 'compare-selected', { primary: true });
  addRevisionGraphWebviewContextMenuItem(items, 'Compare', 'Show Log', 'show-log-range');
  addRevisionGraphWebviewContextMenuItem(items, 'Compare', 'Unified Diff', 'unified-diff');
  if (input.focusRangeActionLabel) {
    addRevisionGraphWebviewContextMenuItem(
      items,
      'Compare',
      input.focusRangeActionLabel,
      'focus-range'
    );
  }
  addRevisionGraphWebviewInspectionItems(items, input.target, false);
  addRevisionGraphWebviewWorkspaceMutationItems(items, input);
  addRevisionGraphWebviewContextMenuItem(items, 'Selection', 'Clear Selection', 'clear-selection');
  return items;
}

function createRevisionGraphWebviewTargetContextMenuPlan(
  input: RevisionGraphWebviewContextMenuPlanInput
): RevisionGraphWebviewContextMenuPlan {
  const items: RevisionGraphWebviewContextMenuItem[] = [];
  addRevisionGraphWebviewInspectionItems(items, input.target, true);
  addRevisionGraphWebviewContextMenuItem(
    items,
    'Compare',
    'Compare With Worktree',
    'compare-with-worktree'
  );
  addRevisionGraphWebviewNavigationItems(items, input);
  addRevisionGraphWebviewWorkspaceMutationItems(items, input);
  addRevisionGraphWebviewStashItems(items, input.target);
  addRevisionGraphWebviewCreationItems(items, input);
  const shouldRequestRemoteTagState = addRevisionGraphWebviewRemoteTagItems(items, input);
  addRevisionGraphWebviewReferenceMutationItems(items, input);
  if (input.hasSelection) {
    addRevisionGraphWebviewContextMenuItem(items, 'Selection', 'Clear Selection', 'clear-selection');
  }
  return { items, shouldRequestRemoteTagState };
}

function addRevisionGraphWebviewInspectionItems(
  items: RevisionGraphWebviewContextMenuItem[],
  target: RevisionGraphWebviewTarget,
  includeTargetLog: boolean
): void {
  if (includeTargetLog) {
    addRevisionGraphWebviewContextMenuItem(items, 'Inspect', 'Show Log', 'show-log-target');
  }
  addRevisionGraphWebviewContextMenuItem(items, 'Inspect', 'Copy Hash', 'copy-hash');
  if (target.kind !== 'commit') {
    addRevisionGraphWebviewContextMenuItem(items, 'Inspect', 'Copy Ref Name', 'copy-ref-name');
  }
}

function addRevisionGraphWebviewNavigationItems(
  items: RevisionGraphWebviewContextMenuItem[],
  input: RevisionGraphWebviewContextMenuPlanInput
): void {
  if (input.focusDescendantsActionLabel) {
    addRevisionGraphWebviewContextMenuItem(
      items,
      'Navigate',
      input.focusDescendantsActionLabel,
      'focus-descendants'
    );
  }
  if (canCheckoutRevisionGraphWebviewContextMenuTarget(input.target, input.currentHeadName)) {
    addRevisionGraphWebviewContextMenuItem(
      items,
      'Branch Operations',
      'Checkout to: ' + (input.target.label || input.target.name),
      'checkout'
    );
  }
}

function addRevisionGraphWebviewWorkspaceMutationItems(
  items: RevisionGraphWebviewContextMenuItem[],
  input: RevisionGraphWebviewContextMenuPlanInput
): void {
  const isCurrentHead = isRevisionGraphWebviewContextMenuCurrentHead(
    input.target,
    input.currentHeadName
  );
  if (input.target.kind === 'head' && input.hasConflictedMerge) {
    addRevisionGraphWebviewContextMenuItem(
      items,
      'Destructive',
      'Abort Merge',
      'abort-merge',
      { destructive: true }
    );
  }
  if (input.target.kind !== 'head' && input.target.kind !== 'stash' && !isCurrentHead) {
    addRevisionGraphWebviewContextMenuItem(
      items,
      'Destructive',
      'Reset to this',
      'reset-to-commit',
      { destructive: true }
    );
  }
  if (
    input.target.kind === 'head'
    && input.isWorkspaceDirty
    && !input.hasMergeConflicts
  ) {
    addRevisionGraphWebviewContextMenuItem(items, 'Stash', 'Stash Save', 'stash-save');
  }
}

function addRevisionGraphWebviewStashItems(
  items: RevisionGraphWebviewContextMenuItem[],
  target: RevisionGraphWebviewTarget
): void {
  if (target.kind !== 'stash') {
    return;
  }
  addRevisionGraphWebviewContextMenuItem(items, 'Stash', 'Stash Apply', 'stash-apply');
  addRevisionGraphWebviewContextMenuItem(items, 'Stash', 'Stash Pop', 'stash-pop');
  addRevisionGraphWebviewContextMenuItem(
    items,
    'Destructive',
    'Remove Stash',
    'stash-drop',
    { destructive: true }
  );
}

function addRevisionGraphWebviewCreationItems(
  items: RevisionGraphWebviewContextMenuItem[],
  input: RevisionGraphWebviewContextMenuPlanInput
): void {
  const target = input.target;
  if (
    (target.kind === 'head' || target.kind === 'branch')
    && !input.publishedLocalBranchNames.has(target.name)
  ) {
    addRevisionGraphWebviewContextMenuItem(
      items,
      'Create And Publish',
      'Publish Branch to Remote',
      'publish-branch'
    );
  }
  if (target.kind !== 'stash') {
    addRevisionGraphWebviewContextMenuItem(
      items,
      'Create And Publish',
      'Create New Branch',
      'create-branch'
    );
    addRevisionGraphWebviewContextMenuItem(items, 'Create And Publish', 'Create Tag', 'create-tag');
  }
}

function addRevisionGraphWebviewRemoteTagItems(
  items: RevisionGraphWebviewContextMenuItem[],
  input: RevisionGraphWebviewContextMenuPlanInput
): boolean {
  if (input.target.kind !== 'tag') {
    return false;
  }
  if (input.remoteTagState === 'published') {
    addRevisionGraphWebviewContextMenuItem(
      items,
      'Destructive',
      'Delete Remote Tag',
      'delete-remote-tag',
      { destructive: true }
    );
    return false;
  }
  if (input.remoteTagState === 'unpublished') {
    addRevisionGraphWebviewContextMenuItem(items, 'Create And Publish', 'Push Tag to Remote', 'push-tag');
    return false;
  }
  if (input.remoteTagState === 'unknown') {
    addRevisionGraphWebviewContextMenuItem(
      items,
      'Create And Publish',
      'Retry Remote Tag Check',
      'retry-remote-tag-state'
    );
    return false;
  }
  addRevisionGraphWebviewContextMenuItem(
    items,
    'Create And Publish',
    'Checking Remote Tag...',
    'remote-tag-loading',
    { disabled: true }
  );
  return true;
}

function addRevisionGraphWebviewReferenceMutationItems(
  items: RevisionGraphWebviewContextMenuItem[],
  input: RevisionGraphWebviewContextMenuPlanInput
): void {
  const target = input.target;
  if (
    target.kind === 'commit'
    || target.kind === 'stash'
    || isRevisionGraphWebviewContextMenuCurrentHead(target, input.currentHeadName)
  ) {
    return;
  }
  if (!(target.kind === 'remote' && target.name.endsWith('/HEAD'))) {
    addRevisionGraphWebviewContextMenuItem(
      items,
      'Destructive',
      getRevisionGraphWebviewContextMenuDeleteLabel(target),
      'delete-ref',
      { destructive: true }
    );
  }
  if (!input.mergeBlockedTargets.has(target.kind + '::' + target.name)) {
    addRevisionGraphWebviewContextMenuItem(
      items,
      'Branch Operations',
      'Merge Into ' + (input.currentHeadName || 'Current HEAD'),
      'merge'
    );
  }
}

function addRevisionGraphWebviewContextMenuItem(
  items: RevisionGraphWebviewContextMenuItem[],
  section: string,
  label: string,
  action: RevisionGraphWebviewContextMenuAction,
  options: Pick<RevisionGraphWebviewContextMenuItem, 'primary' | 'destructive' | 'disabled'> = {}
): void {
  items.push({ section, label, action, ...options });
}

function isRevisionGraphWebviewContextMenuSelectedTarget(
  base: RevisionGraphWebviewTarget,
  compare: RevisionGraphWebviewTarget,
  target: RevisionGraphWebviewTarget
): boolean {
  return base.id === target.id
    || compare.id === target.id
    || base.hash === target.hash
    || compare.hash === target.hash;
}

function isRevisionGraphWebviewContextMenuCurrentHead(
  target: RevisionGraphWebviewTarget,
  currentHeadName: string | null
): boolean {
  return target.kind === 'head'
    || (target.kind === 'branch' && !!currentHeadName && target.name === currentHeadName);
}

function canCheckoutRevisionGraphWebviewContextMenuTarget(
  target: RevisionGraphWebviewTarget,
  currentHeadName: string | null
): boolean {
  return target.kind !== 'commit'
    && target.kind !== 'tag'
    && target.kind !== 'stash'
    && !isRevisionGraphWebviewContextMenuCurrentHead(target, currentHeadName);
}

function getRevisionGraphWebviewContextMenuDeleteLabel(
  target: RevisionGraphWebviewTarget
): string {
  const targetLabel = target.label || target.name;
  if (target.kind === 'tag') {
    return 'Delete Tag: ' + targetLabel;
  }
  if (target.kind === 'remote') {
    return 'Delete Remote Branch: ' + targetLabel;
  }
  return 'Delete Branch: ' + targetLabel;
}
