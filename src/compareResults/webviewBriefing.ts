export function renderCompareResultsBriefingAction(): string {
  return `
    <button
      id="briefingButton"
      class="toolbar-action briefing-action"
      type="button"
      title="Generate AI briefing"
      aria-label="Generate AI briefing"
      hidden
    >
      <svg class="briefing-action-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path d="M7.5 1 8.7 4.3 12 5.5 8.7 6.7 7.5 10 6.3 6.7 3 5.5 6.3 4.3 7.5 1Z" />
        <path d="M12.5 9.2 13.1 10.9 14.8 11.5 13.1 12.1 12.5 13.8 11.9 12.1 10.2 11.5 11.9 10.9 12.5 9.2Z" />
      </svg>
    </button>`;
}

export function renderCompareResultsBriefingPanel(): string {
  return `
    <section id="briefingPanel" class="briefing-panel" aria-live="polite" hidden>
      <div class="briefing-header">
        <div class="briefing-title">AI Compare Briefing</div>
        <div class="briefing-header-actions">
          <button
            id="briefingCopyButton"
            class="briefing-header-button"
            type="button"
            title="Copy to clipboard"
            aria-label="Copy to clipboard"
            hidden
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <rect x="5" y="4.5" width="7" height="8.5" rx="1" />
              <path d="M4 11.5H3.5A1.5 1.5 0 0 1 2 10V3.5A1.5 1.5 0 0 1 3.5 2H9a1 1 0 0 1 1 1v.5" />
            </svg>
          </button>
          <button
            id="briefingCloseButton"
            class="briefing-header-button"
            type="button"
            title="Close AI Compare Briefing"
            aria-label="Close AI Compare Briefing"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path d="M4 4 12 12M12 4 4 12" />
            </svg>
          </button>
        </div>
      </div>
      <pre id="briefingBody" class="briefing-body"></pre>
    </section>`;
}

export function renderCompareResultsActionScript(): string {
  return `
    const unifiedDiffButton = document.getElementById('unifiedDiffButton');
    const briefingButton = document.getElementById('briefingButton');
    const briefingPanel = document.getElementById('briefingPanel');
    const briefingCopyButton = document.getElementById('briefingCopyButton');
    const briefingCloseButton = document.getElementById('briefingCloseButton');
    const briefingBody = document.getElementById('briefingBody');
    let isOpeningUnifiedDiff = false;
    let isGeneratingBriefing = false;
    let isBriefingDismissed = false;

    unifiedDiffButton.addEventListener('click', () => {
      if (!currentState.canOpenUnifiedDiff || isOpeningUnifiedDiff) {
        return;
      }
      isOpeningUnifiedDiff = true;
      updateUnifiedDiffButton();
      closeContextMenu();
      resetDoubleClickTracking();
      vscode.postMessage({ type: 'unifiedDiff' });
    });

    briefingButton.addEventListener('click', () => {
      if (!currentState.canGenerateBriefing || isGeneratingBriefing) {
        return;
      }
      if (currentState.briefing?.kind === 'ready' && isBriefingDismissed) {
        isBriefingDismissed = false;
        updateCompareResultsActions();
        return;
      }
      isBriefingDismissed = false;
      isGeneratingBriefing = true;
      updateBriefingButton();
      closeContextMenu();
      resetDoubleClickTracking();
      vscode.postMessage({ type: 'generateBriefing' });
    });

    briefingCloseButton.addEventListener('click', dismissBriefingPanel);
    briefingCopyButton.addEventListener('click', () => {
      if (currentState.briefing?.kind === 'ready') {
        vscode.postMessage({ type: 'copyBriefing' });
      }
    });
    briefingPanel.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        dismissBriefingPanel();
      }
    });

    function syncCompareResultsActionsFromState() {
      isGeneratingBriefing = currentState.briefing?.kind === 'loading';
      if (currentState.briefing?.kind === 'idle') {
        isBriefingDismissed = false;
      }
    }

    function updateCompareResultsActions() {
      updateUnifiedDiffButton();
      updateBriefingButton();
      updateBriefingPanel();
    }

    function updateUnifiedDiffButton() {
      const canOpen = currentState.kind !== 'empty' && currentState.canOpenUnifiedDiff;
      unifiedDiffButton.hidden = !canOpen;
      unifiedDiffButton.disabled = canOpen && isOpeningUnifiedDiff;
      unifiedDiffButton.textContent = isOpeningUnifiedDiff ? 'Generating Diff...' : 'Unified Diff';
      unifiedDiffButton.title = isOpeningUnifiedDiff ? 'Generating unified diff...' : 'Open unified diff';
      unifiedDiffButton.setAttribute('aria-busy', isOpeningUnifiedDiff ? 'true' : 'false');
    }

    function updateBriefingButton() {
      const canGenerate = currentState.kind === 'results' && currentState.canGenerateBriefing;
      const hasBriefing = currentState.briefing?.kind === 'ready';
      const label = isGeneratingBriefing
        ? 'Generating AI briefing...'
        : hasBriefing && isBriefingDismissed
          ? 'Show AI briefing'
          : hasBriefing ? 'Regenerate AI briefing' : 'Generate AI briefing';
      briefingButton.hidden = !canGenerate;
      briefingButton.disabled = canGenerate && isGeneratingBriefing;
      briefingButton.title = label;
      briefingButton.setAttribute('aria-label', label);
      briefingButton.setAttribute('aria-busy', isGeneratingBriefing ? 'true' : 'false');
      briefingButton.dataset.loading = isGeneratingBriefing ? 'true' : 'false';
    }

    function updateBriefingPanel() {
      const briefing = currentState.briefing || { kind: 'idle' };
      briefingPanel.hidden = briefing.kind === 'idle' || isBriefingDismissed;
      briefingPanel.dataset.state = briefing.kind;
      briefingCopyButton.hidden = briefing.kind !== 'ready';
      briefingBody.textContent = briefing.kind === 'loading'
        ? 'Generating briefing...'
        : briefing.kind === 'ready' ? briefing.content : '';
    }

    function dismissBriefingPanel() {
      isBriefingDismissed = true;
      updateCompareResultsActions();
      if (!briefingButton.disabled) {
        briefingButton.focus();
      }
    }
  `;
}

export function renderCompareResultsBriefingStyles(): string {
  return `
    .briefing-panel {
      margin: 12px 12px 0;
      padding: 12px;
      border: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border));
      border-radius: 8px;
      background: var(--vscode-editorWidget-background, var(--vscode-sideBar-background));
    }
    .briefing-panel[data-state="loading"] {
      color: var(--vscode-descriptionForeground);
    }
    .briefing-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      min-width: 26px;
      padding: 3px;
    }
    .briefing-action-icon {
      width: 16px;
      height: 16px;
      fill: currentColor;
    }
    .briefing-action[data-loading="true"] .briefing-action-icon {
      animation: briefing-pulse 1s ease-in-out infinite alternate;
    }
    .briefing-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }
    .briefing-title {
      font-size: 12px;
      font-weight: 600;
    }
    .briefing-header-actions {
      display: flex;
      align-items: center;
      gap: 2px;
    }
    .briefing-header-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      padding: 0;
      border: 0;
      border-radius: 4px;
      color: var(--vscode-descriptionForeground);
      background: transparent;
      cursor: pointer;
    }
    .briefing-header-button:hover,
    .briefing-header-button:focus-visible {
      outline: none;
      color: var(--vscode-foreground);
      background: var(--vscode-toolbar-hoverBackground, var(--vscode-list-hoverBackground));
    }
    .briefing-header-button[hidden] {
      display: none;
    }
    .briefing-header-button svg {
      width: 14px;
      height: 14px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-width: 1.4;
    }
    .briefing-body {
      max-height: min(45vh, 420px);
      margin: 0;
      padding-right: 4px;
      overflow-y: auto;
      overflow-wrap: anywhere;
      color: inherit;
      font: inherit;
      line-height: 1.5;
      white-space: pre-wrap;
    }
    @keyframes briefing-pulse {
      from { opacity: 0.45; }
      to { opacity: 1; }
    }
  `;
}
