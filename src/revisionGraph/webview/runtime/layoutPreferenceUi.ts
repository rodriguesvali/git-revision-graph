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
  layoutPreference: RevisionGraphWebviewProjectionOptions['layoutPreference']
): void {
  select.value = layoutPreference || 'auto';
}
