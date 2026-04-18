import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';

type MenuContribution = {
  readonly command: string;
  readonly when?: string;
  readonly group?: string;
};

test('package manifest keeps the hide compare results command contribution', () => {
  const manifest = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')) as {
    readonly contributes: {
      readonly commands: Array<{ readonly command: string }>;
    };
  };

  assert.ok(
    manifest.contributes.commands.some((command) => command.command === 'gitRefs.hideCompareResults')
  );
});

test('package manifest contributes compare results as an on-demand webview with a hide action', () => {
  const manifest = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')) as {
    readonly contributes: {
      readonly views: {
        readonly gitRefs: Array<{ readonly id: string; readonly type?: string; readonly when?: string }>;
      };
      readonly menus: {
        readonly ['view/title']: MenuContribution[];
      };
    };
  };

  const compareResultsView = manifest.contributes.views.gitRefs.find((view) => view.id === 'gitRefs.compareResultsView');
  assert.equal(compareResultsView?.type, 'webview');
  assert.equal(compareResultsView?.when, 'gitRefs.compareResultsVisible');

  const titleMenus = manifest.contributes.menus['view/title'];
  assert.ok(
    titleMenus.some(
      (menu) =>
        menu.command === 'gitRefs.hideCompareResults'
        && menu.when === 'view == gitRefs.compareResultsView'
        && menu.group === 'navigation'
    )
  );
});

test('package manifest contributes show log as an on-demand webview with a hide action', () => {
  const manifest = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')) as {
    readonly contributes: {
      readonly views: {
        readonly gitRefs: Array<{ readonly id: string; readonly type?: string; readonly when?: string }>;
      };
      readonly menus: {
        readonly ['view/title']: MenuContribution[];
      };
      readonly commands: Array<{ readonly command: string }>;
    };
  };

  const showLogView = manifest.contributes.views.gitRefs.find((view) => view.id === 'gitRefs.showLogView');
  assert.equal(showLogView?.type, 'webview');
  assert.equal(showLogView?.when, 'gitRefs.showLogVisible');
  assert.ok(
    manifest.contributes.commands.some((command) => command.command === 'gitRefs.hideShowLog')
  );

  const titleMenus = manifest.contributes.menus['view/title'];
  assert.ok(
    titleMenus.some(
      (menu) =>
        menu.command === 'gitRefs.hideShowLog'
        && menu.when === 'view == gitRefs.showLogView'
        && menu.group === 'navigation'
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
