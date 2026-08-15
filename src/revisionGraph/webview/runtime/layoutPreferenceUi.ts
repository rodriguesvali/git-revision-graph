type RevisionGraphLayoutPreferencePost = (
  message: RevisionGraphWebviewMessage,
  label: string,
  control: HTMLElement
) => void;

function bindRevisionGraphLayoutPreferenceSelect(
  select: HTMLSelectElement,
  postWithLoading: RevisionGraphLayoutPreferencePost
): void {
  select.addEventListener('change', () => {
    const layoutPreference = select.value as NonNullable<RevisionGraphWebviewProjectionOptions['layoutPreference']>;
    postWithLoading(
      createRevisionGraphProjectionOptionsMessage({ layoutPreference }),
      'Rearranging graph...',
      select
    );
  });
}

function syncRevisionGraphLayoutPreferenceSelect(
  select: HTMLSelectElement,
  automaticOption: HTMLOptionElement,
  layoutPreference: RevisionGraphWebviewProjectionOptions['layoutPreference'],
  automaticLayoutProfile: RevisionGraphWebviewHostState['automaticLayoutProfile']
): void {
  const automaticProfileLabel = automaticLayoutProfile === 'fast-two-layer'
    ? 'Faster'
    : automaticLayoutProfile === 'dfs-wide'
      ? 'Wide Graph'
      : automaticLayoutProfile === 'balanced'
        ? 'Balanced'
        : '';
  automaticOption.textContent = automaticProfileLabel
    ? `Automatic (${automaticProfileLabel})`
    : 'Automatic';
  select.title = automaticProfileLabel
    ? `Automatic currently selects ${automaticProfileLabel}`
    : 'Choose how commit lanes are arranged';
  select.value = layoutPreference || 'auto';
}
