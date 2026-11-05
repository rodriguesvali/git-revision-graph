export function renderRevisionGraphComparisonGuidanceStyles(): string {
  return `
    .comparison-guidance { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
    .comparison-guidance[hidden], .comparison-guidance [hidden] { display: none; }
    .comparison-guidance-hint { color: var(--vscode-descriptionForeground); font-size: 12px; }
  `;
}
