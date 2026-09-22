export function renderRevisionGraphToolbarIconStyles(): string {
  return `
    #pushButton:not([data-push-action="publish"]) [data-icon="cloud-upload"],
    #pushButton[data-push-action="publish"] [data-icon="repo-push"] {
      display: none;
    }
    .view-controls .toolbar-icon {
      position: static;
      inset: auto;
      width: 16px;
      height: 16px;
      display: block;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.35;
      overflow: visible;
    }
  `;
}
