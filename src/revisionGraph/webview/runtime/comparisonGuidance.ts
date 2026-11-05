function createRevisionGraphComparisonGuidance(
  container: HTMLElement,
  getSelection: () => readonly { readonly id: string }[],
  getTarget: (id: string) => RevisionGraphWebviewTarget | null,
  compareSelected: (base: RevisionGraphWebviewTarget, compare: RevisionGraphWebviewTarget) => void,
  focusFallback: HTMLElement
) {
  let dismissed = false;
  const group = document.createElement('div');
  group.className = 'comparison-guidance';
  group.hidden = true;
  const hint = document.createElement('span');
  hint.className = 'comparison-guidance-hint';
  hint.setAttribute('role', 'status');
  hint.setAttribute('aria-live', 'polite');
  hint.textContent = 'Ctrl/Cmd-click another revision to compare. Keyboard: Ctrl/Cmd+Enter on a reference.';
  const dismiss = document.createElement('button');
  dismiss.type = 'button'; dismiss.className = 'toolbar-button';
  dismiss.textContent = '×'; dismiss.setAttribute('aria-label', 'Dismiss comparison hint');
  const compare = document.createElement('button');
  compare.type = 'button'; compare.className = 'toolbar-button'; compare.textContent = 'Compare';
  group.append(hint, dismiss, compare); container.appendChild(group);

  function targets(): readonly (RevisionGraphWebviewTarget | null)[] {
    return getSelection().map((entry) => getTarget(entry.id));
  }
  function sync(): void {
    const [base, target] = targets();
    const hasPair = !!base && !!target;
    const showHint = !!base && !target && !dismissed;
    group.hidden = !hasPair && !showHint;
    hint.hidden = !showHint; dismiss.hidden = !showHint; compare.hidden = !hasPair;
    if (base && target) compare.setAttribute('aria-label', `Compare ${base.label} to ${target.label}`);
  }
  dismiss.addEventListener('click', () => { dismissed = true; sync(); focusFallback.focus(); });
  compare.addEventListener('click', () => {
    const [base, target] = targets();
    if (base && target) compareSelected(base, target);
  });
  return { sync };
}
