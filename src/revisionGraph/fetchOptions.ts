export type RevisionGraphFetchOption = 'prune' | 'tags';

export interface RevisionGraphFetchOptionItem {
  readonly id: RevisionGraphFetchOption;
  readonly label: string;
  readonly description: string;
  readonly picked: boolean;
}

const FETCH_OPTION_CONFIG: Record<
  RevisionGraphFetchOption,
  { readonly label: string; readonly description: string; readonly picked: boolean; readonly arg: string }
> = {
  prune: {
    label: 'Prune',
    description: 'Remove remote-tracking refs that no longer exist on the remote.',
    picked: true,
    arg: '--prune'
  },
  tags: {
    label: 'Tags',
    description: 'Fetch all tags from the remote.',
    picked: false,
    arg: '--tags'
  }
};

const FETCH_OPTION_ORDER: readonly RevisionGraphFetchOption[] = ['prune', 'tags'];

export function createRevisionGraphFetchOptionItems(): RevisionGraphFetchOptionItem[] {
  return FETCH_OPTION_ORDER.map((id) => ({
    id,
    label: FETCH_OPTION_CONFIG[id].label,
    description: FETCH_OPTION_CONFIG[id].description,
    picked: FETCH_OPTION_CONFIG[id].picked
  }));
}

export function buildRevisionGraphFetchArgs(
  selectedOptions: readonly RevisionGraphFetchOption[]
): string[] {
  const selected = new Set(selectedOptions);

  return [
    'fetch',
    ...FETCH_OPTION_ORDER
      .filter((option) => selected.has(option))
      .map((option) => FETCH_OPTION_CONFIG[option].arg)
  ];
}

export function formatRevisionGraphFetchSuccessMessage(
  repositoryLabel: string,
  selectedOptions: readonly RevisionGraphFetchOption[]
): string {
  const suffix = selectedOptions.length > 0
    ? ` (${selectedOptions.map((option) => FETCH_OPTION_CONFIG[option].label).join(', ')})`
    : '';

  return `Fetch completed for ${repositoryLabel}${suffix}.`;
}
