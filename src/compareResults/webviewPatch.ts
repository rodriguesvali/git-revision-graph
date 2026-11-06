export function renderCompareResultsPatchScript(): string {
  return `
    const savePatchButton = document.getElementById('savePatchButton');
    const patchScopeNote = document.getElementById('patchScopeNote');
    let isSavingPatch = false;
    savePatchButton.addEventListener('click', () => {
      if (currentState.kind !== 'results' || isSavingPatch) return;
      isSavingPatch = true;
      updateSavePatchButton();
      postMessage({ type: 'savePatch' });
    });
    window.addEventListener('message', event => {
      if (event.data?.type === 'patchProgress') {
        isSavingPatch = event.data.saving === true;
        updateSavePatchButton();
      }
    });
    function updateSavePatchButton() {
      savePatchButton.hidden = currentState.kind !== 'results';
      patchScopeNote.hidden = currentState.kind !== 'results';
      savePatchButton.disabled = isSavingPatch;
      savePatchButton.textContent = isSavingPatch ? 'Saving Patch…' : 'Save Patch…';
      savePatchButton.title = 'Save all changes in this comparison; filters and selection do not limit export';
      savePatchButton.setAttribute('aria-busy', String(isSavingPatch));
    }
  `;
}
