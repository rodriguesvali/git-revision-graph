interface RevisionGraphContextMenuKeyboardDependencies {
  readonly menu: HTMLElement;
  readonly references: HTMLElement;
  readonly getReference: (event: KeyboardEvent) => HTMLElement | null;
  readonly getTarget: (id: string) => RevisionGraphWebviewTarget | null;
  readonly select: (id: string, additive: boolean) => void;
  readonly open: (x: number, y: number, target: RevisionGraphWebviewTarget) => void;
  readonly close: () => void;
  readonly hideTooltip: () => void;
  readonly openSubmenu: (group: HTMLElement) => void;
  readonly closeSubmenu: (group: HTMLElement) => void;
}

interface RevisionGraphContextMenuFocusSnapshot {
  readonly key: string;
  readonly parentKey: string | null;
}

function createRevisionGraphContextMenuKeyboard(dependencies: RevisionGraphContextMenuKeyboardDependencies) {
  const { menu, references } = dependencies;
  let invoker: HTMLElement | null = null;
  let focusOnOpen = false;
  let newInvocation = false;

  function setInvoker(element: HTMLElement | null, keyboard = false): void {
    invoker = element;
    focusOnOpen = keyboard;
    newInvocation = true;
  }

  function restoreInvoker(): void {
    const id = invoker?.getAttribute('data-ref-id');
    const replacement = Array.from(references.querySelectorAll<HTMLElement>('[data-ref-id]'))
      .find((element) => element.getAttribute('data-ref-id') === id);
    const target = invoker?.isConnected ? invoker : replacement;
    if (target && target.getClientRects().length > 0) target.focus({ preventScroll: true });
  }

  function closed(restoreFocus = false): void {
    if (restoreFocus) restoreInvoker();
    invoker = null;
    focusOnOpen = false;
    newInvocation = false;
  }

  function beforeAction(event: MouseEvent): void {
    // Restore before the action can open a dialog or another editor.
    if (event.detail === 0 && menu.contains(document.activeElement)) restoreInvoker();
  }

  function beforeRender(): RevisionGraphContextMenuFocusSnapshot | null {
    if (newInvocation) { newInvocation = false; return null; }
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || !menu.contains(active)) return null;
    const parent = active.closest('.context-submenu')?.parentElement;
    return { key: active.dataset.menuKey ?? '', parentKey: parent?.querySelector<HTMLElement>('.context-submenu-trigger')?.dataset.menuKey ?? null };
  }

  function afterRender(snapshot: RevisionGraphContextMenuFocusSnapshot | null): void {
    const items = Array.from(menu.querySelectorAll<HTMLButtonElement>('.context-menu-item'));
    const target = items.find((item) => item.dataset.menuKey === snapshot?.key &&
      (item.closest('.context-submenu')?.parentElement?.querySelector<HTMLElement>('.context-submenu-trigger')?.dataset.menuKey ?? null) === snapshot?.parentKey);
    if (target && !target.disabled) {
      const group = target.closest('.context-submenu')?.parentElement;
      if (group) dependencies.openSubmenu(group);
      focusRevisionGraphMenuItem(target);
    } else if (snapshot || focusOnOpen) {
      focusRevisionGraphMenuItem(getRevisionGraphMenuItems(menu)[0]);
    }
    focusOnOpen = false;
  }

  function referenceKeydown(event: KeyboardEvent): void {
    const reference = dependencies.getReference(event);
    const id = reference?.getAttribute('data-ref-id');
    if (!reference || !id) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      dependencies.select(id, event.ctrlKey || event.metaKey);
      return;
    }
    if (!isRevisionGraphContextMenuShortcut(event)) return;
    const target = dependencies.getTarget(id);
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    dependencies.hideTooltip();
    setInvoker(reference, true);
    const rect = reference.getBoundingClientRect();
    dependencies.open(rect.left + 8, rect.bottom, target);
  }

  function dismiss(): void {
    closed(true);
    dependencies.close();
  }

  function submenuKeydown(event: KeyboardEvent, item: HTMLElement): boolean {
    const submenu = item.closest('.context-submenu');
    if (submenu && (event.key === 'ArrowLeft' || event.key === 'Escape')) {
      const group = submenu.parentElement;
      if (group) {
        dependencies.closeSubmenu(group);
        focusRevisionGraphMenuItem(group.querySelector<HTMLElement>('.context-submenu-trigger'));
      }
      return true;
    }
    if (!item.classList.contains('context-submenu-trigger')) return false;
    if (!['ArrowRight', 'Enter', ' '].includes(event.key)) return false;
    if (item.parentElement) dependencies.openSubmenu(item.parentElement);
    focusRevisionGraphMenuItem(getRevisionGraphMenuItems(item.parentElement?.querySelector<HTMLElement>('.context-submenu'))[0]);
    return true;
  }

  function keydown(event: KeyboardEvent): void {
    const item = document.activeElement;
    if (!(item instanceof HTMLElement) || !menu.contains(item)) return;
    if (event.key === 'Tab') {
      event.stopPropagation();
      dismiss();
      return; // Native Tab advances from the restored reference.
    }
    if (submenuKeydown(event, item)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      dismiss();
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const scope = item.closest<HTMLElement>('.context-submenu') ?? menu;
    const items = getRevisionGraphMenuItems(scope);
    const index = getRevisionGraphMenuNavigationIndex(event.key, items.indexOf(item), items.length);
    if (index === null) return;
    event.preventDefault();
    event.stopPropagation();
    focusRevisionGraphMenuItem(items[index]);
  }

  menu.addEventListener('keydown', keydown);
  return { setInvoker, closed, beforeAction, beforeRender, afterRender, referenceKeydown };
}

function isRevisionGraphContextMenuShortcut(event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  return event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10');
}

function getRevisionGraphMenuItems(scope: HTMLElement | null | undefined): HTMLElement[] {
  if (!scope) return [];
  return Array.from(scope.querySelectorAll<HTMLButtonElement>('.context-menu-item'))
    .filter((item) => !item.disabled && (item.closest('.context-submenu') ?? item.closest('.context-menu')) === scope);
}

function focusRevisionGraphMenuItem(item: HTMLElement | null | undefined): void {
  if (!item) return;
  item.focus({ preventScroll: true });
  item.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
}

function getRevisionGraphMenuNavigationIndex(key: string, current: number, count: number): number | null {
  if (count === 0) return null;
  switch (key) {
    case 'Home': return 0;
    case 'End': return count - 1;
    case 'ArrowDown': return (current + 1) % count;
    case 'ArrowUp': return (current - 1 + count) % count;
    default: return null;
  }
}
