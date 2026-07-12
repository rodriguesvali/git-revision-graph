function syncRevisionGraphWebviewMinimapPreferenceUi(
  minimapToggle: HTMLInputElement | null,
  graphMinimap: HTMLDivElement | null,
  enabled: boolean
): boolean {
  if (minimapToggle !== null) {
    minimapToggle.checked = enabled;
  }
  if (!enabled && graphMinimap !== null) {
    graphMinimap.hidden = true;
    return true;
  }
  return false;
}
