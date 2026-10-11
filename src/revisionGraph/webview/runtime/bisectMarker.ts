function createRevisionGraphBisectMarkerViewport() {
  let previous = '';
  return {
    update(repositoryPath: string | undefined, references: readonly RevisionGraphWebviewHostReference[], center: (hash: string) => void): void {
      const marker = references.find(reference => reference.kind === 'bisect');
      const key = marker ? `${repositoryPath}:${marker.hash}` : '';
      if (marker && key !== previous) center(marker.hash);
      previous = key;
    }
  };
}

function createRevisionGraphWebviewReferenceTarget(reference: RevisionGraphWebviewHostReference): RevisionGraphWebviewTarget & { readonly id: string } {
  const visual = reference.kind === 'bisect';
  return { id: reference.id, hash: reference.hash, name: visual ? reference.hash : reference.name,
    revision: visual ? reference.hash : reference.name, label: reference.name, kind: visual ? 'commit' : reference.kind };
}
