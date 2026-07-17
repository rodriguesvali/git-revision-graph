interface RevisionGraphWebviewReferenceKindPresentation {
  readonly label: string;
  readonly iconName: string;
  readonly svgBody: string;
}

// Reuses the neutral reference shapes already established by the Show Log surface.
const REVISION_GRAPH_WEBVIEW_REFERENCE_KIND_PRESENTATIONS: Readonly<Record<string, RevisionGraphWebviewReferenceKindPresentation>> = {
  head: {
    label: 'HEAD',
    iconName: 'target',
    svgBody: '<circle cx="8" cy="8" r="5.3"></circle><circle cx="8" cy="8" r="1.8"></circle>'
  },
  branch: {
    label: 'Branch',
    iconName: 'branch',
    svgBody: '<circle cx="4.5" cy="3" r="1.5"></circle><circle cx="4.5" cy="13" r="1.5"></circle><circle cx="11.5" cy="5.5" r="1.5"></circle><path d="M4.5 4.5v7M4.5 10h2.3a4.7 4.7 0 0 0 4.7-3"></path>'
  },
  remote: {
    label: 'Remote',
    iconName: 'cloud',
    svgBody: '<path d="M5.3 12.5h6.2a2.8 2.8 0 0 0 .5-5.6 4.1 4.1 0 0 0-7.7-1.4A3.2 3.2 0 0 0 5.3 12.5Z"></path>'
  },
  tag: {
    label: 'Tag',
    iconName: 'tag',
    svgBody: '<path d="M2.8 3.5v4.1l5.6 5.6 4.4-4.4-5.6-5.3H2.8Z"></path><circle cx="5.2" cy="5.8" r="0.8"></circle>'
  },
  stash: {
    label: 'Stash',
    iconName: 'archive',
    svgBody: '<path d="M3 5.2h10l-1.1 7H4.1L3 5.2Z"></path><path d="M5.1 5.2 6.2 3h3.6l1.1 2.2"></path>'
  }
};

function getRevisionGraphWebviewReferenceKindLabel(referenceKind: string): string | null {
  return REVISION_GRAPH_WEBVIEW_REFERENCE_KIND_PRESENTATIONS[referenceKind]?.label ?? null;
}

function renderRevisionGraphWebviewReferenceKindIcon(referenceKind: string): string {
  const presentation = REVISION_GRAPH_WEBVIEW_REFERENCE_KIND_PRESENTATIONS[referenceKind];
  if (!presentation) {
    return '';
  }

  return `<svg class="flow-badge-icon reference-kind-badge-icon" data-icon="${presentation.iconName}" viewBox="0 0 16 16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${presentation.svgBody}</svg>`;
}
