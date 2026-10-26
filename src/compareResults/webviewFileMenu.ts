export function renderCompareResultsFileMenuScript(): string {
  return `    function getMenuActions(items) {
      if (items.length > 1) {
        return [
          {
            label: 'Copy to Clipboard',
            submenu: [
              { action: 'copyFileName', label: 'File Name' },
              { action: 'copyFullPath', label: 'Full Path' }
            ]
          }
        ];
      }

      const item = items[0];
      const actions = [{ action: 'base', label: 'Open Diff' }, ...(item.fileOpenActions || [])];

      if (item.canRevert) {
        actions.push({ action: 'revert', label: 'Revert' });
      }
      if (!item.worktreeRef && (item.leftRef || item.rightRef)) {
        actions.push({ action: 'worktree', label: 'Compare with Worktree' });
      }

      actions.push({
        label: 'Copy to Clipboard',
        submenu: [
          { action: 'copyFileName', label: 'File Name' },
          { action: 'copyFullPath', label: 'Full Path' }
        ]
      });

      return actions;
    }

`;
}
