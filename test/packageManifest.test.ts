import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';

type MenuContribution = {
  readonly command: string;
  readonly when?: string;
  readonly group?: string;
};

type CommandIconContribution = string | {
  readonly light: string;
  readonly dark: string;
};

const collectFileIconPaths = (icon?: CommandIconContribution): string[] => {
  if (!icon) {
    return [];
  }

  if (typeof icon === 'string') {
    return icon.startsWith('$(') ? [] : [icon];
  }

  return [icon.light, icon.dark];
};

test('package manifest keeps the hide compare results command contribution', () => {
  const manifest = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')) as {
    readonly contributes: {
      readonly commands: Array<{
        readonly command: string;
        readonly title?: string;
        readonly icon?: CommandIconContribution;
      }>;
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
        menu.command === 'gitRefs.openRevisionGraphEditor'
        && menu.when === 'view == scm'
        && menu.group === 'navigation'
    )
  );
  assert.ok(
    titleMenus.some(
      (menu) =>
        menu.command === 'gitRefs.hideCompareResults'
        && menu.when === 'view == gitRefs.compareResultsView'
        && menu.group === 'navigation'
    )
  );
});

test('package manifest contributes graph as a context-controlled webview', () => {
  const manifest = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')) as {
    readonly contributes: {
      readonly views: {
        readonly gitRefs: Array<{ readonly id: string; readonly type?: string; readonly when?: string }>;
      };
    };
  };

  const graphView = manifest.contributes.views.gitRefs.find((view) => view.id === 'gitRefs.revisionGraphView');
  assert.equal(graphView?.type, 'webview');
  assert.equal(graphView?.when, 'gitRefs.revisionGraphVisible');
});

test('package manifest contributes a collapsed revision graph companion view to Source Control', () => {
  const manifest = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')) as {
    readonly contributes: {
      readonly views: {
        readonly scm?: Array<{
          readonly id: string;
          readonly name?: string;
          readonly type?: string;
          readonly visibility?: string;
          readonly icon?: string;
        }>;
      };
      readonly menus: {
        readonly commandPalette?: MenuContribution[];
        readonly ['scm/title']?: MenuContribution[];
        readonly ['view/title']: MenuContribution[];
      };
      readonly commands: Array<{
        readonly command: string;
        readonly title?: string;
        readonly icon?: CommandIconContribution;
      }>;
    };
  };

  const companionView = manifest.contributes.views.scm?.find(
    (view) => view.id === 'gitRefs.sourceControlRevisionGraphView'
  );

  assert.equal(companionView?.name, 'Revision Graph');
  assert.equal(companionView?.type, 'webview');
  assert.equal(companionView?.visibility, 'collapsed');
  assert.equal(companionView?.icon, 'media/icon-source.svg');

  const commandIds = new Set(manifest.contributes.commands.map((command) => command.command));
  assert.equal(commandIds.has('gitRefs.openRevisionGraphEditor'), true);
  assert.equal(commandIds.has('gitRefs.openSourceControlRevisionGraph'), true);
  assert.equal(commandIds.has('gitRefs.refreshSourceControlRevisionGraph'), true);
  assert.equal(commandIds.has('gitRefs.fetchSourceControlRevisionGraphRepository'), true);
  assert.equal(commandIds.has('gitRefs.chooseSourceControlRevisionGraphRepository'), true);

  const openEditorCommand = manifest.contributes.commands.find(
    (command) => command.command === 'gitRefs.openRevisionGraphEditor'
  );
  assert.equal(openEditorCommand?.title, 'View Git Revision Graph');
  assert.deepEqual(openEditorCommand?.icon, {
    light: 'media/icon-source-light.svg',
    dark: 'media/icon-source-dark.svg'
  });

  const hiddenPaletteCommands = new Set(
    (manifest.contributes.menus.commandPalette ?? [])
      .filter((menu) => menu.when === 'false')
      .map((menu) => menu.command)
  );
  assert.equal(hiddenPaletteCommands.has('gitRefs.openSourceControlRevisionGraph'), true);
  assert.equal(hiddenPaletteCommands.has('gitRefs.refreshSourceControlRevisionGraph'), true);
  assert.equal(hiddenPaletteCommands.has('gitRefs.fetchSourceControlRevisionGraphRepository'), true);
  assert.equal(hiddenPaletteCommands.has('gitRefs.chooseSourceControlRevisionGraphRepository'), true);

  const scmTitleMenus = manifest.contributes.menus['scm/title'] ?? [];
  assert.ok(
    scmTitleMenus.some(
      (menu) =>
        menu.command === 'gitRefs.openRevisionGraphEditor'
        && menu.when === 'scmProvider == git'
        && menu.group === 'navigation'
    )
  );

  const titleMenus = manifest.contributes.menus['view/title'];
  assert.ok(
    titleMenus.some(
      (menu) =>
        menu.command === 'gitRefs.refreshSourceControlRevisionGraph'
        && menu.when === 'view == gitRefs.sourceControlRevisionGraphView'
        && menu.group === 'navigation'
    )
  );
  assert.ok(
    titleMenus.some(
      (menu) =>
        menu.command === 'gitRefs.fetchSourceControlRevisionGraphRepository'
        && menu.when === 'view == gitRefs.sourceControlRevisionGraphView'
        && menu.group === 'navigation@2'
    )
  );
  assert.ok(
    titleMenus.some(
      (menu) =>
        menu.command === 'gitRefs.chooseSourceControlRevisionGraphRepository'
        && menu.when === 'view == gitRefs.sourceControlRevisionGraphView'
        && menu.group === 'navigation@3'
    )
  );
});

test('package manifest activates on startup so graph visibility context is initialized', () => {
  const manifest = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')) as {
    readonly activationEvents?: string[];
  };

  assert.ok(manifest.activationEvents?.includes('onStartupFinished'));
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
        readonly scm?: Array<{ readonly icon?: string }>;
      };
      readonly commands: Array<{ readonly icon?: CommandIconContribution }>;
    };
  };

  const referencedIcons = [
    manifest.icon,
    ...manifest.contributes.viewsContainers.activitybar.map((item) => item.icon),
    ...manifest.contributes.views.gitRefs.flatMap((item) => (item.icon ? [item.icon] : [])),
    ...(manifest.contributes.views.scm ?? []).flatMap((item) => (item.icon ? [item.icon] : [])),
    ...manifest.contributes.commands.flatMap((command) => collectFileIconPaths(command.icon))
  ];

  for (const iconPath of referencedIcons) {
    assert.equal(existsSync(path.join(process.cwd(), iconPath)), true, `missing icon asset: ${iconPath}`);
  }
});

test('package manifest contributes opt-in graph loading diagnostics', () => {
  const manifest = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')) as {
    readonly contributes: {
      readonly configuration?: {
        readonly properties?: Record<string, { readonly type?: string; readonly default?: unknown }>;
      };
    };
  };

  const traceLoading = manifest.contributes.configuration?.properties?.['gitRevisionGraph.traceLoading'];

  assert.equal(traceLoading?.type, 'boolean');
  assert.equal(traceLoading?.default, false);
});

test('package manifest contributes graph git command timeout configuration', () => {
  const manifest = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')) as {
    readonly contributes: {
      readonly configuration?: {
        readonly properties?: Record<string, {
          readonly type?: string;
          readonly default?: unknown;
          readonly minimum?: unknown;
          readonly maximum?: unknown;
        }>;
      };
    };
  };

  const timeout = manifest.contributes.configuration?.properties?.['gitRevisionGraph.graphCommandTimeoutMs'];

  assert.equal(timeout?.type, 'number');
  assert.equal(timeout?.default, 60000);
  assert.equal(timeout?.minimum, 5000);
  assert.equal(timeout?.maximum, 300000);
});
