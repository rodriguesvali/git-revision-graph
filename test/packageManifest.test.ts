import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';

type MenuContribution = {
  readonly command: string;
  readonly when?: string;
  readonly group?: string;
};

test('package manifest contributes compare result context commands', () => {
  const manifest = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')) as {
    readonly contributes: {
      readonly commands: Array<{ readonly command: string }>;
      readonly menus: {
        readonly ['view/item/context']: MenuContribution[];
      };
    };
  };

  assert.ok(
    manifest.contributes.commands.some((command) => command.command === 'gitRefs.compareResultCompareWithBase')
  );
  assert.ok(
    manifest.contributes.commands.some((command) => command.command === 'gitRefs.compareResultCompareWithWorktree')
  );
  assert.ok(
    manifest.contributes.commands.some((command) => command.command === 'gitRefs.compareResultRevertToThis')
  );

  const itemMenus = manifest.contributes.menus['view/item/context'];
  assert.ok(
    itemMenus.some(
      (menu) =>
        menu.command === 'gitRefs.compareResultCompareWithBase'
        && menu.when === 'view == gitRefs.compareResultsView && viewItem == compare-result-between-file'
        && menu.group === 'compare@1'
    )
  );
  assert.equal(
    itemMenus.some(
      (menu) =>
        menu.command === 'gitRefs.compareResultCompareWithWorktree'
        && menu.when === 'view == gitRefs.compareResultsView && viewItem == compare-result-between-file'
    ),
    false
  );
  assert.ok(
    itemMenus.some(
      (menu) =>
        menu.command === 'gitRefs.compareResultCompareWithBase'
        && menu.when === 'view == gitRefs.compareResultsView && viewItem == compare-result-worktree-file'
        && menu.group === 'compare@1'
    )
  );
  assert.ok(
    itemMenus.some(
      (menu) =>
        menu.command === 'gitRefs.compareResultCompareWithWorktree'
        && menu.when === 'view == gitRefs.compareResultsView && viewItem == compare-result-worktree-file'
        && menu.group === 'compare@2'
    )
  );
  assert.ok(
    itemMenus.some(
      (menu) =>
        menu.command === 'gitRefs.compareResultRevertToThis'
        && menu.when === 'view == gitRefs.compareResultsView && viewItem == compare-result-worktree-file'
        && menu.group === 'compare@3'
    )
  );
});

test('package manifest icon paths point to files that exist', () => {
  const manifestPath = path.join(process.cwd(), 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    readonly icon: string;
    readonly contributes: {
      readonly viewsContainers: {
        readonly activitybar: Array<{ readonly icon: string }>;
      };
      readonly views: {
        readonly gitRefs: Array<{ readonly icon?: string }>;
      };
    };
  };

  const referencedIcons = [
    manifest.icon,
    ...manifest.contributes.viewsContainers.activitybar.map((item) => item.icon),
    ...manifest.contributes.views.gitRefs.flatMap((item) => (item.icon ? [item.icon] : []))
  ];

  for (const iconPath of referencedIcons) {
    assert.equal(existsSync(path.join(process.cwd(), iconPath)), true, `missing icon asset: ${iconPath}`);
  }
});
