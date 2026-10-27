export function renderCompareResultsPatchScript(): string {
  return `
    const savePatchButton = document.getElementById('savePatchButton');
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
      savePatchButton.disabled = isSavingPatch;
      savePatchButton.textContent = isSavingPatch ? 'Saving Patch…' : 'Save Patch…';
      savePatchButton.title = 'Save all file changes in this comparison as a patch';
      savePatchButton.setAttribute('aria-busy', String(isSavingPatch));
    }
  `;
}
