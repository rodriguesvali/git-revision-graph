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

type ViewContribution = {
  readonly id: string;
  readonly name?: string;
  readonly type?: string;
  readonly when?: string;
  readonly icon?: string;
};

type ViewContainerContribution = {
  readonly id: string;
  readonly title?: string;
  readonly icon?: string;
};

type ViewContributions = Record<string, ViewContribution[] | undefined>;

type PackageManifest = {
  readonly icon: string;
  readonly scripts?: Record<string, string>;
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
  readonly engines?: {
    readonly vscode?: string;
  };
  readonly activationEvents?: string[];
  readonly contributes: {
    readonly commands: Array<{
      readonly command: string;
      readonly title?: string;
      readonly icon?: CommandIconContribution;
    }>;
    readonly configuration?: {
      readonly properties?: Record<string, {
        readonly type?: string;
        readonly default?: unknown;
        readonly minimum?: unknown;
        readonly maximum?: unknown;
      }>;
    };
    readonly menus: {
      readonly ['scm/title']?: MenuContribution[];
      readonly ['view/title']: MenuContribution[];
    };
    readonly views?: ViewContributions;
    readonly viewsContainers?: {
      readonly activitybar?: ViewContainerContribution[];
    };
  };
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

const collectViews = (views: ViewContributions | undefined): ViewContribution[] =>
  Object.values(views ?? {}).flatMap((items) => items ?? []);

function loadPackageManifest(): PackageManifest {
  return JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')) as PackageManifest;
}

test('package manifest keeps secondary editor panels hidden from Command Palette contributions', () => {
  const manifest = loadPackageManifest();

  const commandIds = new Set(manifest.contributes.commands.map((command) => command.command));
  assert.equal(commandIds.has('gitRefs.hideCompareResults'), false);
  assert.equal(commandIds.has('gitRefs.hideShowLog'), false);
});

test('package manifest does not contribute compare results as an Activity Bar webview', () => {
  const manifest = loadPackageManifest();

  const compareResultsView = collectViews(manifest.contributes.views).find(
    (view) => view.id === 'gitRefs.compareResultsView'
  );
  assert.equal(compareResultsView, undefined);

  const titleMenus = manifest.contributes.menus['view/title'];
  assert.ok(
    titleMenus.some(
      (menu) =>
        menu.command === 'gitRefs.openRevisionGraphEditor'
        && menu.when === 'view == scm'
        && menu.group === 'navigation'
    )
  );
  assert.equal(titleMenus.some((menu) => menu.command === 'gitRefs.hideCompareResults'), false);
});

test('package manifest does not contribute duplicate graph side-bar views', () => {
  const manifest = loadPackageManifest();

  const graphView = collectViews(manifest.contributes.views).find((view) => view.id === 'gitRefs.revisionGraphView');
  const companionView = manifest.contributes.views?.scm?.find(
    (view) => view.id === 'gitRefs.sourceControlRevisionGraphView'
  );
  assert.equal(graphView, undefined);
  assert.equal(companionView, undefined);
});

test('package manifest does not contribute Activity Bar review containers', () => {
  const manifest = loadPackageManifest();

  assert.equal(manifest.contributes.viewsContainers?.activitybar?.some(
    (container) => container.id === 'gitRefsCompare' || container.id === 'gitRefsShowLogs'
  ) ?? false, false);
});

test('package manifest routes Source Control graph access to the editor panel', () => {
  const manifest = loadPackageManifest();

  const commandIds = new Set(manifest.contributes.commands.map((command) => command.command));
  assert.equal(commandIds.has('gitRefs.openRevisionGraphEditor'), true);
  assert.equal(commandIds.has('gitRefs.openSourceControlRevisionGraph'), false);
  assert.equal(commandIds.has('gitRefs.refreshSourceControlRevisionGraph'), false);
  assert.equal(commandIds.has('gitRefs.fetchSourceControlRevisionGraphRepository'), false);
  assert.equal(commandIds.has('gitRefs.chooseSourceControlRevisionGraphRepository'), false);

  const openEditorCommand = manifest.contributes.commands.find(
    (command) => command.command === 'gitRefs.openRevisionGraphEditor'
  );
  assert.equal(openEditorCommand?.title, 'View Git Revision Graph');
  assert.deepEqual(openEditorCommand?.icon, {
    light: 'media/icon-source-light.svg',
    dark: 'media/icon-source-dark.svg'
  });

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
        menu.command === 'gitRefs.openRevisionGraphEditor'
        && menu.when === 'view == scm'
        && menu.group === 'navigation'
    )
  );
});

test('package manifest relies on contributed commands for implicit activation', () => {
  const manifest = loadPackageManifest();

  assert.deepEqual(manifest.activationEvents ?? [], []);
  assert.equal(manifest.engines?.vscode, '^1.90.0');
  assert.deepEqual(
    manifest.contributes.commands.map((command) => command.command).sort(),
    [
      'gitRefs.checkout',
      'gitRefs.compareRefs',
      'gitRefs.compareWithWorktree',
      'gitRefs.merge',
      'gitRefs.openRevisionGraphEditor'
    ]
  );
});

test('package manifest does not contribute show log as an Activity Bar webview', () => {
  const manifest = loadPackageManifest();

  const showLogView = collectViews(manifest.contributes.views).find((view) => view.id === 'gitRefs.showLogView');
  assert.equal(showLogView, undefined);
  assert.equal(
    manifest.contributes.commands.some((command) => command.command === 'gitRefs.hideShowLog'),
    false
  );

  const titleMenus = manifest.contributes.menus['view/title'];
  assert.equal(titleMenus.some((menu) => menu.command === 'gitRefs.hideShowLog'), false);
});

test('package manifest icon paths point to files that exist', () => {
  const manifest = loadPackageManifest();

  const referencedIcons = [
    manifest.icon,
    ...(manifest.contributes.viewsContainers?.activitybar ?? []).flatMap((item) => item.icon ? [item.icon] : []),
    ...collectViews(manifest.contributes.views).flatMap((item) => (item.icon ? [item.icon] : [])),
    ...manifest.contributes.commands.flatMap((command) => collectFileIconPaths(command.icon))
  ];

  for (const iconPath of referencedIcons) {
    assert.equal(existsSync(path.join(process.cwd(), iconPath)), true, `missing icon asset: ${iconPath}`);
  }
});

test('package manifest contributes opt-in graph loading diagnostics', () => {
  const manifest = loadPackageManifest();

  const traceLoading = manifest.contributes.configuration?.properties?.['gitRevisionGraph.traceLoading'];

  assert.equal(traceLoading?.type, 'boolean');
  assert.equal(traceLoading?.default, false);
});

test('package manifest contributes graph git command timeout configuration', () => {
  const manifest = loadPackageManifest();

  const timeout = manifest.contributes.configuration?.properties?.['gitRevisionGraph.graphCommandTimeoutMs'];

  assert.equal(timeout?.type, 'number');
  assert.equal(timeout?.default, 60000);
  assert.equal(timeout?.minimum, 5000);
  assert.equal(timeout?.maximum, 300000);
});

test('package manifest contributes Flow Governance Phase 1 fallback settings', () => {
  const manifest = loadPackageManifest();
  const properties = manifest.contributes.configuration?.properties ?? {};

  assert.equal(properties['gitRevisionGraph.flowGovernance.enabled']?.type, 'boolean');
  assert.equal(properties['gitRevisionGraph.flowGovernance.enabled']?.default, false);
  assert.equal(properties['gitRevisionGraph.flowGovernance.configPath']?.type, 'string');
  assert.equal(properties['gitRevisionGraph.flowGovernance.configPath']?.default, '.git-revision-graph-flow.json');
  assert.equal(properties['gitRevisionGraph.flowGovernance.hideSyncBranchesByDefault']?.type, 'boolean');
  assert.equal(properties['gitRevisionGraph.flowGovernance.hideSyncBranchesByDefault']?.default, true);
  assert.equal(properties['gitRevisionGraph.flowGovernance.highlightProductionTrunk']?.type, 'boolean');
  assert.equal(properties['gitRevisionGraph.flowGovernance.highlightProductionTrunk']?.default, true);
  assert.equal(properties['gitRevisionGraph.flowGovernance.showUnknownBranches']?.type, 'boolean');
  assert.equal(properties['gitRevisionGraph.flowGovernance.showUnknownBranches']?.default, true);
});

test('package manifest keeps runtime dependencies limited to shipped code dependencies', () => {
  const manifest = loadPackageManifest();

  assert.deepEqual(manifest.dependencies, {
    'd3-dag': '^1.2.1'
  });
});

test('package manifest pins VS Code API types to the engine baseline', () => {
  const manifest = loadPackageManifest();

  assert.equal(manifest.engines?.vscode, '^1.90.0');
  assert.equal(manifest.devDependencies?.['@types/vscode'], '1.90.0');
});

test('test script uses the cross-platform compiled test runner', () => {
  const manifest = loadPackageManifest();
  const testScript = manifest.scripts?.test;

  assert.equal(
    testScript,
    'npm run clean:test && npm run build && tsc -p ./tsconfig.test.json && node scripts/run-compiled-tests.mjs'
  );
  assert.equal(testScript?.includes('*.test.js'), false);
  assert.equal(existsSync(path.join(process.cwd(), 'scripts', 'run-compiled-tests.mjs')), true);
});
