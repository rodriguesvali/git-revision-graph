function createBisectDialog(post: (message: RevisionGraphProtocol.MessageOf<'bisect-control'>) => void) {
  let state: RevisionGraphProtocol.BisectView | null = null;
  let root: string | undefined;
  let shown = false;
  let pending = false;
  let swapped = false;
  const banner = element('div', '', 'bisect-banner');
  const backdrop = element('div', '', 'bisect-backdrop');
  const dialog = element('div', '', 'bisect-dialog');
  const announcement = element('span', '', 'bisect-announcement');
  announcement.setAttribute('role', 'status'); announcement.setAttribute('aria-live', 'polite');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'bisect-title');
  backdrop.append(dialog);
  banner.hidden = true; backdrop.hidden = true;
  document.body.appendChild(banner); document.body.appendChild(backdrop);
  document.body.appendChild(announcement);
  const focus = createRevisionGraphFlowDialogFocus(hide);
  backdrop.addEventListener('keydown', (event) => focus.keydown(event));

  function element<Tag extends keyof HTMLElementTagNameMap>(tag: Tag, text = '', className = ''): HTMLElementTagNameMap[Tag] {
    const node = document.createElement(tag); node.textContent = text; node.className = className; return node;
  }
  function hide(): void { shown = false; backdrop.hidden = true; focus.close(); renderBanner(); }
  function show(): void { focus.capture(); shown = true; render(); }
  function request(action: RevisionGraphProtocol.BisectControl, commitHash?: string): void {
    if (!state || pending || state.busy) return;
    const message: RevisionGraphProtocol.MessageOf<'bisect-control'> = {
      type: 'bisect-control', repositoryPath: state.repositoryPath, id: state.id, version: state.version, action,
      ...(commitHash ? { commitHash } : {})
    };
    if (action !== 'copy' && action !== 'inspect' && action !== 'scm') { pending = true; render(); }
    post(message);
  }
  function button(label: string, click: () => void, key: string, primary = false): HTMLButtonElement {
    const node = element('button', label, primary ? 'bisect-primary' : ''); node.type = 'button';
    node.dataset.bisectAction = key; node.disabled = key !== 'hide' && (pending || state?.busy === true);
    node.addEventListener('click', click); return node;
  }
  function control(label: string, action: RevisionGraphProtocol.BisectControl, primary = false, hash?: string): HTMLButtonElement {
    return button(label, () => request(action, hash), `${action}:${hash ?? ''}`, primary);
  }
  function renderBanner(): void {
    banner.replaceChildren(); banner.hidden = !state || shown;
    if (!state) return;
    const label = state.status === 'preparing' ? 'Bug search ready to start'
      : state.status === 'testing' ? `Bug search active · testing ${state.current?.hash.slice(0, 7) ?? ''}` : 'Bug search result ready';
    banner.append(element('span', label), button('Resume', show, 'resume'), control('Stop…', 'stop'));
  }
  function render(): void {
    renderBanner(); backdrop.hidden = !shown || !state;
    if (!state || !shown) return;
    const active = document.activeElement as HTMLElement | null;
    const activeKey = dialog.contains(active) ? active?.dataset.bisectAction : undefined;
    const historyOpen = dialog.querySelector('details')?.open === true;
    dialog.replaceChildren();
    dialog.setAttribute('aria-busy', String(state.busy || pending));
    const heading = element('div', '', 'bisect-heading');
    const title = element('h2', 'Find Bug'); title.id = 'bisect-title'; title.tabIndex = -1;
    heading.append(title, button('Hide', hide, 'hide')); dialog.append(heading);
    dialog.append(element('p', `Repository: ${state.repositoryPath}`, 'bisect-muted'));
    const good = (state.status === 'preparing' ? swapped : state.swapped) ? state.original : state.selected;
    const bad = good === state.original ? state.selected : state.original;
    dialog.append(element('p', `Bug absent: ${good.hash.slice(0, 7)} · ${good.subject}`, 'bisect-muted'),
      element('p', `Bug present: ${bad.hash.slice(0, 7)} · ${bad.subject}`, 'bisect-muted'));
    if (state.status === 'preparing') renderStart();
    else if (state.status === 'testing') renderTest();
    else renderResult();
    renderStatus(); renderHistory(historyOpen); renderFooter();
    const target = Array.from(dialog.querySelectorAll<HTMLElement>('[data-bisect-action]'))
      .find((node) => node.dataset.bisectAction === activeKey && !node.matches(':disabled')) ?? title;
    focus.open(backdrop, target);
  }
  function renderStart(): void {
    dialog.append(element('p', 'Confirm that one revision has the bug and the other does not. Starting temporarily checks out revisions for you to test.'));
    const actions = element('div', '', 'bisect-actions');
    actions.append(button('Swap roles', () => { swapped = !swapped; render(); }, 'swap'),
      button('Start search', () => request(swapped ? 'start-swapped' : 'start'), 'start', true), control('Cancel', 'stop'));
    dialog.append(actions);
  }
  function commitCard(commit: RevisionGraphProtocol.BisectCommit, title: string): void {
    const card = element('section', '', 'bisect-commit');
    card.append(element('h3', title), element('code', commit.hash), element('p', commit.subject));
    const actions = element('div', '', 'bisect-actions');
    actions.append(control('Show commit', 'inspect', false, commit.hash), control('Copy hash', 'copy', false, commit.hash));
    card.append(actions); dialog.append(card);
  }
  function renderTest(): void {
    if (!state) return;
    dialog.append(element('p', `Step ${state.history.length + 1}${state.stepsRemaining === undefined ? '' : ` · approximately ${state.stepsRemaining} test${state.stepsRemaining === 1 ? '' : 's'} remaining`}`, 'bisect-muted'));
    if (state.mergeBaseCheck) dialog.append(element('p', 'These histories diverge. Test their common base first to check whether the bug predates the chosen interval.'));
    if (state.current) commitCard(state.current, 'TEST THIS COMMIT');
    dialog.append(element('p', 'Run your usual reproduction or tests in the editor/terminal, then choose the result for this revision.'));
    const actions = element('div', '', 'bisect-actions bisect-decisions');
    for (const [label, answer] of [['Bug absent', 'good'], ['Bug present', 'bad'], ['Cannot test', 'skip']] as const) {
      const node = control(label, answer); node.disabled ||= !!state.error; actions.append(node);
    }
    dialog.append(actions, element('p', 'Cannot test skips a revision that cannot build or reproduce the test.', 'bisect-muted'));
  }
  function renderResult(): void {
    if (!state) return;
    const label = state.status === 'found' ? 'First bad commit found'
      : state.status === 'inconclusive' ? 'Skipped revisions prevent identifying one culprit. These commits remain possible:'
      : 'The bug is already present at the common base and predates the chosen interval.';
    dialog.append(element('p', label));
    for (const commit of state.candidates) commitCard(commit, state.status === 'found' ? 'FIRST BAD COMMIT' : 'POSSIBLE CULPRIT');
  }
  function renderStatus(): void {
    if (!state) return;
    const status = element('p', state.busy || pending ? 'Updating search…' : state.error ?? 'Ready.', state.error ? 'bisect-status bisect-error' : 'bisect-status bisect-muted');
    status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); dialog.append(status);
    if (state.error) {
      const actions = element('div', '', 'bisect-actions');
      const retry = state.status === 'preparing' ? (swapped ? 'start-swapped' : 'start') : 'retry';
      actions.append(control('Open Source Control', 'scm'), control('Check again', retry));
      dialog.append(actions);
    }
  }
  function renderHistory(open: boolean): void {
    if (!state || state.history.length === 0) return;
    const details = element('details'); details.open = open;
    details.append(element('summary', `Answers (${state.history.length})`));
    const list = element('ol', '', 'bisect-history');
    const labels = { good: 'Bug absent', bad: 'Bug present', skip: 'Cannot test' };
    for (const item of state.history) list.append(element('li', `${item.commit.hash.slice(0, 7)} · ${item.commit.subject} · ${labels[item.answer]}`));
    details.append(list); dialog.append(details);
  }
  function renderFooter(): void {
    if (!state) return;
    const footer = element('div', '', 'bisect-footer');
    const destination = state.branch?.replace(/^refs\/heads\//, '') ?? state.original.hash.slice(0, 7);
    footer.append(element('p', `Return destination: ${destination} · ${state.original.hash.slice(0, 7)}`, 'bisect-muted'));
    if (state.status !== 'preparing') {
      const actions = element('div', '', 'bisect-actions');
      const undo = control('Undo last answer', 'undo'); undo.disabled ||= state.history.length === 0;
      actions.append(undo, control(`${state.status === 'testing' ? 'Stop' : 'Finish'} and return to ${destination}…`, 'stop', state.status !== 'testing'));
      if (state.error && state.branch) actions.append(control('Return to original commit…', 'stop-detached'));
      if (state.error) actions.append(control('Detach controls (keep Git state)…', 'abandon'));
      footer.append(actions);
    }
    dialog.append(footer);
  }
  return {
    receive(message: RevisionGraphProtocol.BisectStateMessage): void {
      if (message.repositoryPath !== root) return;
      if (state && message.state?.id === state.id && message.state.version < state.version) return;
      const preparing = !state && message.state?.status === 'preparing';
      state = message.state; pending = false;
      announcement.textContent = bisectAnnouncement(state);
      if (!state) { hide(); return; }
      if (message.reveal || preparing) { swapped = state.swapped; show(); } else render();
    },
    setRepository(repositoryPath: string | undefined): void {
      if (root === repositoryPath) return;
      root = repositoryPath; state = null; pending = false; hide();
    }
  };
}

function bisectAnnouncement(state: RevisionGraphProtocol.BisectView | null): string {
  if (!state) return 'Bug search ended.';
  if (state.busy) return 'Updating bug search.';
  if (state.error) return state.error;
  if (state.status === 'testing' && state.current) return `Test commit ${state.current.hash.slice(0, 7)}: ${state.current.subject}`;
  return state.status === 'found' ? 'First bad commit found.' : 'Bug search ready.';
}
