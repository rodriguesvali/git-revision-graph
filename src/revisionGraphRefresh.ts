export type RevisionGraphRefreshIntent =
  | 'full-rebuild'
  | 'projection-rebuild'
  | 'metadata-patch'
  | 'overlay-patch';

export function getRefreshLoadingLabel(intent: RevisionGraphRefreshIntent): string {
  switch (intent) {
    case 'projection-rebuild':
      return 'Updating revision graph view...';
    case 'metadata-patch':
    case 'overlay-patch':
      return 'Updating revision graph...';
    case 'full-rebuild':
      return 'Loading revision graph...';
  }
}
