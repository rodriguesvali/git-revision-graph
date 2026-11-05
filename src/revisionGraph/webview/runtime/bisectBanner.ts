function isBisectAnswerAction(action: RevisionGraphProtocol.BisectControl): boolean {
  return action === 'good' || action === 'bad' || action === 'skip';
}

function canAnswerBisect(state: RevisionGraphProtocol.BisectView | null, pending: boolean): boolean {
  return !!state && state.status === 'testing' && !!state.current && !state.busy && !state.error && !pending;
}

function createBisectResultReveal() {
  let previous = '';
  return (state: RevisionGraphProtocol.BisectView | null): boolean => {
    if (!state || state.status === 'preparing' || state.status === 'testing') { previous = ''; return false; }
    if (state.busy) return false;
    const key = `${state.repositoryPath}:${state.id}:${state.status}`;
    const reveal = key !== previous;
    previous = key;
    return reveal;
  };
}

interface BisectCompactBannerInput {
  readonly banner: HTMLElement;
  readonly state: RevisionGraphProtocol.BisectView | null;
  readonly shown: boolean;
  readonly pending: boolean;
  readonly expand: () => HTMLButtonElement;
  readonly control: (label: string, action: RevisionGraphProtocol.BisectControl) => HTMLButtonElement;
}

function getBisectCompactLabel(state: RevisionGraphProtocol.BisectView, pending: boolean): string {
  if (pending || state.busy) return state.status === 'preparing' ? 'Starting search…' : 'Updating search…';
  if (state.error && state.status === 'preparing') return 'Bug search blocked';
  if (state.status === 'preparing') return 'Bug search ready to start';
  if (state.status !== 'testing') return 'Bug search result ready';
  return state.current
    ? `Step ${state.history.length + 1} · Test this commit: ${state.current.hash.slice(0, 7)} · ${compactBisectText(state.current.subject, 100)}`
    : 'Waiting for test revision';
}

function compactBisectText(value: string, limit: number): string {
  const line = value.split(/\r?\n/, 1)[0].trim();
  return line.length > limit ? `${line.slice(0, limit - 1)}…` : line;
}

function createBisectCompactContext(state: RevisionGraphProtocol.BisectView, pending: boolean): HTMLElement {
  const context = document.createElement('div'); context.className = 'bisect-banner-context';
  const label = document.createElement('span'); label.textContent = getBisectCompactLabel(state, pending);
  context.title = state.current ? `${state.current.hash} · ${state.current.subject}` : state.repositoryPath;
  if (state.status === 'testing' && state.current && !pending && !state.busy) {
    label.setAttribute('aria-label', `Step ${state.history.length + 1} · Test this commit: ${state.current.hash.slice(0, 7)} · ${state.current.subject}`);
  }
  context.append(label);
  const feedback = !pending && !state.busy && state.error
    ? `Search blocked: ${compactBisectText(state.error, 140)} · Expand for details.` : '';
  if (feedback) {
    const status = document.createElement('span'); status.className = 'bisect-banner-status'; status.textContent = feedback;
    if (state.error && !pending && !state.busy) { status.title = state.error; status.setAttribute('aria-label', state.error); }
    context.append(status);
  }
  return context;
}

function renderBisectCompactBanner({ banner, state, shown, pending, expand, control }: BisectCompactBannerInput): void {
  const hadFocus = banner.contains(document.activeElement);
  banner.replaceChildren(); banner.hidden = !state || shown;
  if (!state || shown) return;
  banner.setAttribute('role', 'region'); banner.setAttribute('aria-label', 'Bug search controls');
  banner.setAttribute('aria-busy', String(pending || state.busy));
  banner.setAttribute('data-error', String(!!state.error));
  banner.append(createBisectCompactContext(state, pending));
  if (state.status === 'testing' && state.current) {
    const decisions = document.createElement('div'); decisions.className = 'bisect-banner-actions';
    decisions.setAttribute('role', 'group'); decisions.setAttribute('aria-label', 'Classify test commit');
    for (const [label, answer] of [['Bug absent', 'good'], ['Bug present', 'bad']] as const) {
      const node = control(label, answer); node.disabled = !canAnswerBisect(state, pending);
      node.setAttribute('aria-label', `${label} for commit ${state.current.hash.slice(0, 7)}`); decisions.append(node);
    }
    banner.append(decisions);
  }
  const actions = document.createElement('div'); actions.className = 'bisect-banner-actions';
  const expandButton = expand();
  actions.append(expandButton, control(state.status === 'preparing' ? 'Cancel' : 'Stop…', 'stop'));
  banner.append(actions);
  if (hadFocus) expandButton.focus({ preventScroll: true });
}
